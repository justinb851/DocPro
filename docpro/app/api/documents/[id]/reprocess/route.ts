import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { convertPdfToMarkdownServer } from '@/lib/converters/pdf-to-markdown'
import { convertMarkdownToHtml } from '@/lib/converters'

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

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    // Get the document with its current version and org_id
    const { data: document, error: docError } = await adminClient
      .from('documents')
      .select(`
        *,
        current_version:document_versions!fk_current_version(*)
      `)
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Verify user has access to this document's organization
    const { data: userRecord, error: userError } = await adminClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .eq('org_id', document.org_id)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'Access denied to this document' },
        { status: 403 }
      )
    }

    // Get the original file from storage
    const storageClient = adminClient.storage
    
    // The path structure is: orgId/documentId/timestamp_filename
    // List all files in the document folder
    const documentPath = `${document.org_id}/${id}`
    
    const { data: files, error: listError } = await storageClient
      .from('documents')
      .list(documentPath, {
        limit: 100,
        offset: 0
      })

    if (listError) {
      console.error('Error listing files:', listError)
      return NextResponse.json(
        { error: 'Failed to list files in storage' },
        { status: 500 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files found for this document' },
        { status: 404 }
      )
    }

    // Find the PDF file (it should have a timestamp prefix)
    const pdfFile = files.find(f => f.name.toLowerCase().endsWith('.pdf'))
    
    if (!pdfFile) {
      // List all files for debugging
      console.log('Files found:', files.map(f => f.name))
      return NextResponse.json(
        { error: 'PDF file not found. Reprocessing is only available for PDF documents.' },
        { status: 404 }
      )
    }

    // Download the original file
    const filePath = `${documentPath}/${pdfFile.name}`
    console.log('Downloading file from path:', filePath)
    
    const { data: fileData, error: downloadError } = await storageClient
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download original file' },
        { status: 500 }
      )
    }

    // Convert the PDF to markdown with improved formatting
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const markdown = await convertPdfToMarkdownServer(buffer)
    const html = convertMarkdownToHtml(markdown)

    // Update the current version with new markdown
    const { error: updateError } = await adminClient
      .from('document_versions')
      .update({
        content_markdown: markdown,
        content_html: html,
        change_summary: 'Reprocessed with improved markdown formatting'
      })
      .eq('id', document.current_version_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update document version' },
        { status: 500 }
      )
    }

    // Update the markdown file in storage
    const markdownPath = `${document.org_id}/${id}/versions/${document.current_version_id}.md`
    const { error: uploadError } = await storageClient
      .from('documents')
      .update(markdownPath, new Blob([markdown], { type: 'text/markdown' }), {
        upsert: true,
        contentType: 'text/markdown'
      })

    if (uploadError) {
      console.error('Failed to update markdown in storage:', uploadError)
      // Non-critical error, continue
    }

    return NextResponse.json({
      success: true,
      message: 'Document reprocessed successfully with improved markdown formatting',
      documentId: id,
      markdownLength: markdown.length
    })

  } catch (error) {
    console.error('Error reprocessing document:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}