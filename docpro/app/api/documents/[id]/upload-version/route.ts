import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDocumentById } from '@/lib/db/documents'
import { convertFileToMarkdown, convertMarkdownToHtml } from '@/lib/converters'
import { createDocumentVersion, updateDocumentCurrentVersion } from '@/lib/db/documents'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: userRecord, error: userError } = await adminClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'User not found or not associated with an organization' },
        { status: 400 }
      )
    }

    // Verify the document exists and user has access
    const document = await getDocumentById(id, userRecord.org_id)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const changeSummary = formData.get('changeSummary') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
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
      'application/rtf', // .rtf
      'text/rtf', // .rtf (alternative MIME type)
    ]

    const allowedExtensions = ['.docx', '.pdf', '.md', '.txt', '.rtf']
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported formats: Word (.docx), PDF (.pdf), Markdown (.md), Text (.txt), RTF (.rtf)' },
        { status: 400 }
      )
    }

    console.log(`Processing version upload: ${file.name} (${file.size} bytes) for document ${id}`)
    
    // Convert file to markdown
    const conversionResult = await convertFileToMarkdown(file)
    
    // Get the next version number
    const { data: latestVersion, error: latestVersionError } = await adminClient
      .from('document_versions')
      .select('version_number')
      .eq('document_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (latestVersionError) {
      return NextResponse.json(
        { error: 'Failed to get latest version number' },
        { status: 500 }
      )
    }

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1
    
    // Convert markdown to HTML for storage
    const contentHtml = convertMarkdownToHtml(conversionResult.markdown)

    // Create new document version
    const version = await createDocumentVersion({
      documentId: id,
      versionNumber: nextVersionNumber,
      contentMarkdown: conversionResult.markdown,
      contentHtml,
      changeSummary: changeSummary || `Version ${nextVersionNumber} uploaded from ${conversionResult.originalFormat} file`,
      authorId: user.id,
    })

    // Update the document's current version
    await updateDocumentCurrentVersion(id, version.id)

    // Update document's updated_at timestamp
    await adminClient
      .from('documents')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    console.log(`Version upload completed successfully: v${nextVersionNumber}`)

    // Generate comparison with previous version if it exists
    let comparison = null
    if (latestVersion) {
      try {
        // Get the previous version's content
        const { data: previousVersion, error: prevError } = await adminClient
          .from('document_versions')
          .select('content_markdown')
          .eq('document_id', id)
          .eq('version_number', latestVersion.version_number)
          .single()

        if (!prevError && previousVersion) {
          // Generate diff between versions
          const Diff = require('diff')
          const oldContent = previousVersion.content_markdown || ''
          const newContent = conversionResult.markdown
          
          // Calculate differences
          const lineChanges = Diff.diffLines(oldContent, newContent)
          const wordChanges = Diff.diffWords(oldContent, newContent)
          
          // Count changes
          let linesAdded = 0
          let linesRemoved = 0
          let wordsAdded = 0
          let wordsRemoved = 0
          
          lineChanges.forEach((part: any) => {
            if (part.added) {
              linesAdded += part.value.split('\n').length - 1
            } else if (part.removed) {
              linesRemoved += part.value.split('\n').length - 1
            }
          })
          
          wordChanges.forEach((part: any) => {
            if (part.added) {
              wordsAdded += part.value.split(/\s+/).filter((w: string) => w).length
            } else if (part.removed) {
              wordsRemoved += part.value.split(/\s+/).filter((w: string) => w).length
            }
          })
          
          comparison = {
            previousVersion: latestVersion.version_number,
            newVersion: nextVersionNumber,
            stats: {
              linesAdded,
              linesRemoved,
              totalLineChanges: linesAdded + linesRemoved,
              wordsAdded,
              wordsRemoved,
              totalWordChanges: wordsAdded + wordsRemoved,
            },
            changes: lineChanges.slice(0, 10) // Include first 10 changes for preview
          }
        }
      } catch (error) {
        console.error('Error generating comparison:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded version ${nextVersionNumber}`,
      document: {
        id: document.id,
        title: document.title,
      },
      version: {
        id: version.id,
        version_number: nextVersionNumber,
        change_summary: version.change_summary,
        created_at: version.created_at
      },
      previousVersion: latestVersion?.version_number || 0,
      comparison
    })

  } catch (error) {
    console.error('Error in version upload:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}