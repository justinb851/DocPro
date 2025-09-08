import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Document, DocumentVersion } from '@/types'

export async function createDocument(data: {
  title: string
  description?: string
  category?: string
  tags?: string[]
  repositoryId: string
  orgId: string
  createdBy: string
}): Promise<Document> {
  // Use admin client to bypass RLS for document creation
  const supabase = createAdminClient()
  
  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      repository_id: data.repositoryId,
      org_id: data.orgId,
      created_by: data.createdBy,
      status: 'draft'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document:', error)
    throw new Error(`Failed to create document: ${error.message}`)
  }

  return document
}

export async function createDocumentVersion(data: {
  documentId: string
  versionNumber: number
  contentMarkdown: string
  contentHtml?: string
  changeSummary?: string
  authorId: string
}): Promise<DocumentVersion> {
  // Use admin client to bypass RLS for document version creation
  const supabase = createAdminClient()
  
  const { data: version, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: data.documentId,
      version_number: data.versionNumber,
      content_markdown: data.contentMarkdown,
      content_html: data.contentHtml,
      change_summary: data.changeSummary,
      author_id: data.authorId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document version:', error)
    throw new Error(`Failed to create document version: ${error.message}`)
  }

  return version
}

export async function updateDocumentCurrentVersion(
  documentId: string,
  versionId: string
): Promise<void> {
  // Use admin client to bypass RLS for updating document
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('documents')
    .update({ current_version_id: versionId })
    .eq('id', documentId)

  if (error) {
    console.error('Error updating document current version:', error)
    throw new Error(`Failed to update document current version: ${error.message}`)
  }
}

export async function getDocumentsByOrganization(orgId: string): Promise<(Document & {
  current_version?: DocumentVersion
  versions_count?: number
})[]> {
  // Use admin client to bypass RLS for reading documents
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      current_version:document_versions!fk_current_version(*)
    `)
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    throw new Error(`Failed to fetch documents: ${error.message}`)
  }

  return data || []
}

export async function getDocumentsByRepository(
  repositoryId: string,
  orgId: string
): Promise<(Document & {
  current_version?: DocumentVersion
  versions_count?: number
})[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      current_version:document_versions!fk_current_version(*)
    `)
    .eq('repository_id', repositoryId)
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents by repository:', error)
    throw new Error(`Failed to fetch documents by repository: ${error.message}`)
  }

  return data || []
}

export async function getDocumentById(
  documentId: string,
  orgId: string
): Promise<(Document & { current_version?: DocumentVersion }) | null> {
  // Use admin client to bypass RLS for reading document
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      current_version:document_versions!fk_current_version(*)
    `)
    .eq('id', documentId)
    .eq('org_id', orgId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching document:', error)
    throw new Error(`Failed to fetch document: ${error.message}`)
  }

  return data
}

export async function getDocumentVersions(
  documentId: string,
  orgId: string
): Promise<DocumentVersion[]> {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  // First verify the document belongs to the organization
  const { data: document } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .eq('org_id', orgId)
    .single()

  if (!document) {
    throw new Error('Document not found or access denied')
  }

  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('Error fetching document versions:', error)
    throw new Error(`Failed to fetch document versions: ${error.message}`)
  }

  return data || []
}

export async function deleteDocument(
  documentId: string,
  orgId: string
): Promise<void> {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('org_id', orgId)

  if (error) {
    console.error('Error deleting document:', error)
    throw new Error(`Failed to delete document: ${error.message}`)
  }
}

export async function updateDocument(
  documentId: string,
  orgId: string,
  updates: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
  }
): Promise<Document> {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document:', error)
    throw new Error(`Failed to update document: ${error.message}`)
  }

  return data
}