import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDocumentsByOrganization } from '@/lib/db/documents'

export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch documents for the organization
    let documents = await getDocumentsByOrganization(userRecord.org_id)

    // Apply filters
    if (category) {
      documents = documents.filter(doc => 
        doc.category?.toLowerCase() === category.toLowerCase()
      )
    }

    if (search) {
      const searchLower = search.toLowerCase()
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      )
    }

    if (tags) {
      const tagsList = tags.split(',').map(t => t.trim().toLowerCase())
      documents = documents.filter(doc =>
        doc.tags?.some(tag => 
          tagsList.includes(tag.toLowerCase())
        )
      )
    }

    // Apply pagination
    const total = documents.length
    const paginatedDocuments = documents.slice(offset, offset + limit)

    return NextResponse.json({
      documents: paginatedDocuments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}