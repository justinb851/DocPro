export { convertWordToMarkdown, convertWordFileToMarkdown } from './word-to-markdown'
export { 
  convertPdfToMarkdown, 
  convertPdfToMarkdownServer,
  convertPdfFileToMarkdown 
} from './pdf-to-markdown'
export { 
  convertMarkdownToHtml,
  convertMarkdownToPlainText,
  convertMarkdownToWordHtml,
  downloadAsWord,
  downloadAsPdf
} from './markdown-to-format'

export interface ConversionResult {
  markdown: string
  originalFormat: string
  warnings?: string[]
}

export async function convertFileToMarkdown(file: File): Promise<ConversionResult> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  try {
    let markdown: string
    let originalFormat: string

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      const { convertWordFileToMarkdown } = await import('./word-to-markdown')
      markdown = await convertWordFileToMarkdown(file)
      originalFormat = 'docx'
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const { convertPdfFileToMarkdown } = await import('./pdf-to-markdown')
      markdown = await convertPdfFileToMarkdown(file)
      originalFormat = 'pdf'
    } else if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
      markdown = await file.text()
      originalFormat = 'markdown'
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const text = await file.text()
      markdown = `# ${file.name}\n\n${text}`
      originalFormat = 'text'
    } else {
      throw new Error(`Unsupported file type: ${fileType}`)
    }

    return {
      markdown,
      originalFormat,
    }
  } catch (error) {
    console.error('Error converting file:', error)
    throw error
  }
}