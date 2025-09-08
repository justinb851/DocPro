import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDocumentFromFile, extractDocumentMetadata } from '@/lib/services/document-service'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      // Try to migrate the user automatically by creating org and user records
      console.log('User not found in users table, attempting migration for user:', user.id)
      
      try {
        // Extract organization name from user metadata if available
        const organizationName = user.user_metadata?.organization_name || 'Default Organization'
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User'

        // Use admin client to bypass RLS for creating org and user
        const adminClient = createAdminClient()

        // Create organization
        const { data: organization, error: orgError } = await adminClient
          .from('organizations')
          .insert({
            name: organizationName,
            subscription_tier: 'trial',
            subscription_status: 'active'
          })
          .select()
          .single()

        if (orgError) {
          console.error('Error creating organization for migration:', orgError)
          console.error('Organization creation error details:', JSON.stringify(orgError, null, 2))
          console.error('Attempted org name:', organizationName)
          console.error('User ID:', user.id)
          console.error('User email:', user.email)
          
          // Check if it's a RLS policy error
          const errorMessage = orgError.message || ''
          if (errorMessage.includes('policy') || errorMessage.includes('RLS')) {
            return NextResponse.json(
              { error: 'Database policy error. Please ensure RLS policies are updated.' },
              { status: 500 }
            )
          }
          
          return NextResponse.json(
            { error: `Failed to create organization: ${orgError.message}` },
            { status: 500 }
          )
        }

        // Create user record
        const { data: newUserRecord, error: createUserError } = await adminClient
          .from('users')
          .insert({
            id: user.id,
            org_id: organization.id,
            email: user.email,
            full_name: fullName,
            role: 'admin', // First user in org is admin
          })
          .select('org_id')
          .single()

        if (createUserError) {
          console.error('Error creating user record for migration:', createUserError)
          console.error('User creation error details:', JSON.stringify(createUserError, null, 2))
          
          // Check if user already exists (unique constraint violation)
          if (createUserError.code === '23505' || createUserError.message?.includes('duplicate')) {
            // User already exists, try to get the existing user
            const { data: existingUser, error: fetchError } = await adminClient
              .from('users')
              .select('org_id')
              .eq('id', user.id)
              .single()
            
            if (!fetchError && existingUser) {
              console.log('User already exists, using existing record')
              userRecord = existingUser
            } else {
              // Cleanup: delete the organization if user creation failed
              await adminClient.from('organizations').delete().eq('id', organization.id)
              
              return NextResponse.json(
                { error: 'Failed to create or retrieve user record' },
                { status: 500 }
              )
            }
          } else {
            // Cleanup: delete the organization if user creation failed
            await adminClient.from('organizations').delete().eq('id', organization.id)
            
            return NextResponse.json(
              { error: 'Failed to create user record' },
              { status: 500 }
            )
          }
        } else {
          userRecord = newUserRecord
        }

        console.log('User migration successful - created org:', organization.id, 'for user:', user.id)
        
      } catch (migrationError) {
        console.error('Error during user migration:', migrationError)
        return NextResponse.json(
          { error: 'User migration failed. Please contact support.' },
          { status: 500 }
        )
      }
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const tags = formData.get('tags') as string
    const repositoryId = formData.get('repositoryId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'text/markdown', // .md
      'text/plain', // .txt
    ]

    const allowedExtensions = ['.docx', '.pdf', '.md', '.txt']
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported formats: Word (.docx), PDF (.pdf), Markdown (.md), Text (.txt)' },
        { status: 400 }
      )
    }

    // Extract or use provided metadata
    const autoMetadata = extractDocumentMetadata(file)
    const metadata = {
      title: title || autoMetadata.title,
      description: description || autoMetadata.description,
      category: category || autoMetadata.category,
      tags: tags ? tags.split(',').map(t => t.trim()) : autoMetadata.tags,
    }

    // Create document from file
    console.log(`Processing upload: ${file.name} (${file.size} bytes) for user ${user.id}`)
    const result = await createDocumentFromFile(
      file,
      metadata,
      userRecord.org_id,
      repositoryId,
      user.id
    )

    return NextResponse.json({
      success: true,
      document: result.document,
      version: result.version,
      originalFileUrl: result.originalFileUrl,
      markdownUrl: result.markdownUrl,
    })

  } catch (error) {
    console.error('Error in document upload:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload documents.' },
    { status: 405 }
  )
}