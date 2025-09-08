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
    
    // Get the document to find the org
    const { data: document, error: docError } = await adminClient
      .from('documents')
      .select('org_id')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const storageClient = adminClient.storage
    
    // Try different path patterns to find where files are stored
    const pathsToTry = [
      `${document.org_id}/${id}`,
      `${document.org_id}/documents/${id}`,
      `documents/${document.org_id}/${id}`,
      `${id}`,
    ]
    
    const results: any = {}
    
    for (const path of pathsToTry) {
      try {
        const { data: files, error } = await storageClient
          .from('documents')
          .list(path, {
            limit: 100,
            offset: 0
          })
        
        if (!error && files && files.length > 0) {
          results[path] = files.map(f => ({
            name: f.name,
            size: f.metadata?.size,
            mimetype: f.metadata?.mimetype,
            created_at: f.created_at
          }))
        }
      } catch (e) {
        // Ignore errors for paths that don't exist
      }
    }
    
    // Also check root level org folder
    try {
      const { data: orgFiles, error } = await storageClient
        .from('documents')
        .list(document.org_id, {
          limit: 1000,
          offset: 0
        })
      
      if (!error && orgFiles) {
        results[`${document.org_id}/ (root)`] = orgFiles.map(f => ({
          name: f.name,
          id: f.id,
          metadata: f.metadata
        }))
      }
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({
      documentId: id,
      orgId: document.org_id,
      pathsChecked: pathsToTry,
      filesFound: results,
      totalFilesFound: Object.values(results).reduce((sum: number, files: any) => sum + files.length, 0)
    })

  } catch (error) {
    console.error('Debug storage endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}