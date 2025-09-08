import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { diffLines, diffWords, Change } from 'diff'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const fromVersionId = searchParams.get('from')
    const toVersionId = searchParams.get('to')
    const diffType = searchParams.get('type') || 'lines' // 'lines' or 'words'

    if (!fromVersionId || !toVersionId) {
      return NextResponse.json(
        { error: 'Both "from" and "to" version IDs are required' },
        { status: 400 }
      )
    }
    
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    // Get user's organization
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

    // Verify both versions belong to the same document and organization
    const { data: versions, error: versionsError } = await adminClient
      .from('document_versions')
      .select(`
        id,
        version_number,
        content_markdown,
        change_summary,
        author_id,
        created_at,
        documents!inner(id, org_id, title)
      `)
      .in('id', [fromVersionId, toVersionId])
      .eq('document_id', id)

    if (versionsError || !versions || versions.length !== 2) {
      return NextResponse.json(
        { error: 'One or both versions not found' },
        { status: 404 }
      )
    }

    // Verify document belongs to user's organization
    const document = versions[0].documents
    if (document.org_id !== userRecord.org_id) {
      return NextResponse.json(
        { error: 'Access denied to this document' },
        { status: 403 }
      )
    }

    // Sort versions by creation date to determine which is older
    const sortedVersions = versions.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const fromVersion = sortedVersions.find(v => v.id === fromVersionId)
    const toVersion = sortedVersions.find(v => v.id === toVersionId)

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Generate diff based on type
    let changes: Change[]
    if (diffType === 'words') {
      changes = diffWords(fromVersion.content_markdown, toVersion.content_markdown)
    } else {
      changes = diffLines(fromVersion.content_markdown, toVersion.content_markdown)
    }

    // Calculate statistics
    const stats = {
      additions: changes.filter(c => c.added).reduce((sum, c) => sum + (c.count || 0), 0),
      deletions: changes.filter(c => c.removed).reduce((sum, c) => sum + (c.count || 0), 0),
      totalChanges: changes.filter(c => c.added || c.removed).length
    }

    return NextResponse.json({
      fromVersion: {
        id: fromVersion.id,
        version_number: fromVersion.version_number,
        change_summary: fromVersion.change_summary,
        created_at: fromVersion.created_at
      },
      toVersion: {
        id: toVersion.id,
        version_number: toVersion.version_number,
        change_summary: toVersion.change_summary,
        created_at: toVersion.created_at
      },
      document: {
        id: document.id,
        title: document.title
      },
      changes,
      stats,
      diffType
    })

  } catch (error) {
    console.error('Error comparing document versions:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}