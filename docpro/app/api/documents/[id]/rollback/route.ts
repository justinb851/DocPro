import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDocumentVersion, updateDocumentCurrentVersion } from '@/lib/db/documents'
import { convertMarkdownToHtml } from '@/lib/converters'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { versionId } = await request.json()

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
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

    // Get the document and verify access
    const { data: document, error: docError } = await adminClient
      .from('documents')
      .select('id, org_id, title, current_version_id')
      .eq('id', id)
      .eq('org_id', userRecord.org_id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Get the target version to rollback to
    const { data: targetVersion, error: targetVersionError } = await adminClient
      .from('document_versions')
      .select('id, version_number, content_markdown, change_summary')
      .eq('id', versionId)
      .eq('document_id', id)
      .single()

    if (targetVersionError || !targetVersion) {
      return NextResponse.json(
        { error: 'Target version not found' },
        { status: 404 }
      )
    }

    // Get the current highest version number
    const { data: latestVersion, error: latestVersionError } = await adminClient
      .from('document_versions')
      .select('version_number')
      .eq('document_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (latestVersionError || !latestVersion) {
      return NextResponse.json(
        { error: 'Failed to get latest version' },
        { status: 500 }
      )
    }

    // Create new version with the old content
    const newVersionNumber = latestVersion.version_number + 1
    const htmlContent = convertMarkdownToHtml(targetVersion.content_markdown)
    
    const rollbackVersion = await createDocumentVersion({
      documentId: id,
      versionNumber: newVersionNumber,
      contentMarkdown: targetVersion.content_markdown,
      contentHtml: htmlContent,
      changeSummary: `Rollback to v${targetVersion.version_number}: ${targetVersion.change_summary}`,
      authorId: user.id,
    })

    // Update the document's current version
    await updateDocumentCurrentVersion(id, rollbackVersion.id)

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back to v${targetVersion.version_number}`,
      newVersion: {
        id: rollbackVersion.id,
        version_number: newVersionNumber,
        change_summary: rollbackVersion.change_summary
      },
      rolledBackFrom: {
        version_number: targetVersion.version_number,
        change_summary: targetVersion.change_summary
      }
    })

  } catch (error) {
    console.error('Error rolling back document version:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}