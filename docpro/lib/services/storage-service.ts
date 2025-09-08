import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface UploadResult {
  path: string
  publicUrl: string
}

export async function uploadFile(
  file: File,
  path: string
): Promise<UploadResult> {
  // Use admin client to bypass RLS for storage operations
  const supabase = createAdminClient()

  // Convert File to ArrayBuffer
  const buffer = await file.arrayBuffer()
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading file:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl
  }
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase.storage
    .from('documents')
    .remove([path])

  if (error) {
    console.error('Error deleting file:', error)
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

export async function getFileUrl(path: string): Promise<string> {
  const supabase = await createClient()
  
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function downloadFile(path: string): Promise<Blob> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from('documents')
    .download(path)

  if (error) {
    console.error('Error downloading file:', error)
    throw new Error(`Failed to download file: ${error.message}`)
  }

  return data
}

export function generateDocumentPath(
  orgId: string,
  documentId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const extension = fileName.split('.').pop()
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  
  return `${orgId}/${documentId}/${timestamp}_${cleanName}`
}

export function generateMarkdownPath(
  orgId: string,
  documentId: string,
  versionId: string
): string {
  return `${orgId}/${documentId}/versions/${versionId}.md`
}

export async function uploadMarkdown(
  content: string,
  path: string
): Promise<UploadResult> {
  // Use admin client to bypass RLS for storage operations
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, content, {
      contentType: 'text/markdown',
      cacheControl: '3600',
      upsert: true // Allow overwriting for versions
    })

  if (error) {
    console.error('Error uploading markdown:', error)
    throw new Error(`Failed to upload markdown: ${error.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl
  }
}