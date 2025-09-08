import { convertFileToMarkdown, convertMarkdownToHtml } from '@/lib/converters'
import { 
  createDocument, 
  createDocumentVersion, 
  updateDocumentCurrentVersion 
} from '@/lib/db/documents'
import { 
  uploadFile, 
  uploadMarkdown,
  generateDocumentPath,
  generateMarkdownPath 
} from './storage-service'
import type { Document, DocumentVersion } from '@/types'

export interface DocumentCreationData {
  title: string
  description?: string
  category?: string
  tags?: string[]
}

export interface DocumentUploadResult {
  document: Document
  version: DocumentVersion
  originalFileUrl: string
  markdownUrl: string
}

export async function createDocumentFromFile(
  file: File,
  metadata: DocumentCreationData,
  orgId: string,
  repositoryId: string,
  userId: string
): Promise<DocumentUploadResult> {
  try {
    // Step 1: Convert file to markdown
    console.log('Converting file to markdown...', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })
    const conversionResult = await convertFileToMarkdown(file)
    
    // Step 2: Create document record
    console.log('Creating document record...')
    const document = await createDocument({
      title: metadata.title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: metadata.description,
      category: metadata.category,
      tags: metadata.tags,
      repositoryId,
      orgId,
      createdBy: userId,
    })

    // Step 3: Upload original file
    console.log('Uploading original file...')
    const originalPath = generateDocumentPath(orgId, document.id, file.name)
    const { publicUrl: originalFileUrl } = await uploadFile(file, originalPath)

    // Step 4: Convert markdown to HTML for storage
    const contentHtml = convertMarkdownToHtml(conversionResult.markdown)

    // Step 5: Create document version
    console.log('Creating document version...')
    const version = await createDocumentVersion({
      documentId: document.id,
      versionNumber: 1,
      contentMarkdown: conversionResult.markdown,
      contentHtml,
      changeSummary: `Initial upload from ${conversionResult.originalFormat} file`,
      authorId: userId,
    })

    // Step 6: Upload markdown file
    console.log('Uploading markdown file...')
    const markdownPath = generateMarkdownPath(orgId, document.id, version.id)
    const { publicUrl: markdownUrl } = await uploadMarkdown(
      conversionResult.markdown,
      markdownPath
    )

    // Step 7: Update document to point to current version
    console.log('Updating document current version...')
    await updateDocumentCurrentVersion(document.id, version.id)

    console.log('Document upload completed successfully')
    return {
      document,
      version,
      originalFileUrl,
      markdownUrl,
    }
  } catch (error) {
    console.error('Error in createDocumentFromFile:', error)
    throw error
  }
}

export async function createNewDocumentVersion(
  documentId: string,
  content: string,
  changeSummary: string,
  orgId: string,
  userId: string
): Promise<{ version: DocumentVersion; markdownUrl: string }> {
  try {
    // Get the next version number
    // This would require a query to get the highest version number for this document
    // For now, we'll use a simple approach
    const versionNumber = Date.now() // Temporary - should be proper version numbering
    
    const contentHtml = convertMarkdownToHtml(content)
    
    const version = await createDocumentVersion({
      documentId,
      versionNumber,
      contentMarkdown: content,
      contentHtml,
      changeSummary,
      authorId: userId,
    })

    // Upload the markdown content
    const markdownPath = generateMarkdownPath(orgId, documentId, version.id)
    const { publicUrl: markdownUrl } = await uploadMarkdown(content, markdownPath)

    // Update the document's current version
    await updateDocumentCurrentVersion(documentId, version.id)

    return {
      version,
      markdownUrl,
    }
  } catch (error) {
    console.error('Error creating document version:', error)
    throw error
  }
}

export function extractDocumentMetadata(file: File): DocumentCreationData {
  const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
  
  // Basic metadata extraction - could be enhanced
  return {
    title: nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    description: `Document uploaded from ${file.type || 'unknown'} file (${Math.round(file.size / 1024)} KB)`,
    category: getCategoryFromFileName(file.name),
    tags: getTagsFromFileName(file.name),
  }
}

function getCategoryFromFileName(fileName: string): string {
  const name = fileName.toLowerCase()
  
  if (name.includes('policy') || name.includes('policies')) return 'Policy'
  if (name.includes('procedure') || name.includes('sop')) return 'Procedure'
  if (name.includes('training') || name.includes('manual')) return 'Training'
  if (name.includes('protocol') || name.includes('emergency')) return 'Protocol'
  if (name.includes('report') || name.includes('incident')) return 'Report'
  if (name.includes('form') || name.includes('template')) return 'Form'
  
  return 'General'
}

function getTagsFromFileName(fileName: string): string[] {
  const tags: string[] = []
  const name = fileName.toLowerCase()
  
  if (name.includes('draft')) tags.push('draft')
  if (name.includes('final')) tags.push('final')
  if (name.includes('urgent') || name.includes('emergency')) tags.push('urgent')
  if (name.includes('training')) tags.push('training')
  if (name.includes('new') || name.includes('updated')) tags.push('updated')
  
  return tags
}