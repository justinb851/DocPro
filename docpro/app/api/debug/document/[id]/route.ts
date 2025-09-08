import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    // Get the document with its version
    const { data: document, error } = await adminClient
      .from('documents')
      .select(`
        *,
        current_version:document_versions!fk_current_version(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Return raw markdown content
    return NextResponse.json({
      documentId: document.id,
      title: document.title,
      markdownContent: document.current_version?.content_markdown,
      markdownLength: document.current_version?.content_markdown?.length,
      firstChars: document.current_version?.content_markdown?.substring(0, 500),
      hasMarkdownFormatting: {
        hasHeaders: document.current_version?.content_markdown?.includes('#'),
        hasBold: document.current_version?.content_markdown?.includes('**'),
        hasLists: document.current_version?.content_markdown?.includes('- ') || 
                  document.current_version?.content_markdown?.includes('* ') ||
                  document.current_version?.content_markdown?.includes('1. '),
        hasCodeBlocks: document.current_version?.content_markdown?.includes('```'),
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}