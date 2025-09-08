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

// Simple RTF to Markdown converter
function convertRtfToMarkdown(rtfContent: string): string {
  try {
    // Remove RTF control codes and format basic text
    let text = rtfContent
    
    // Remove RTF header and metadata
    text = text.replace(/^\{\\rtf\d+[^{}]*\{[^}]*\}/, '')
    
    // Convert bold text: {\b text} -> **text**
    text = text.replace(/\{\\b\s+([^}]+)\}/g, '**$1**')
    
    // Convert italic text: {\i text} -> *text*
    text = text.replace(/\{\\i\s+([^}]+)\}/g, '*$1*')
    
    // Convert font size codes
    text = text.replace(/\\fs\d+\s*/g, '')
    
    // Convert paragraph breaks: \par -> \n\n
    text = text.replace(/\\par\s*/g, '\n\n')
    
    // Remove remaining control codes
    text = text.replace(/\\[a-zA-Z]+\d*\s*/g, '')
    
    // Remove braces
    text = text.replace(/[{}]/g, '')
    
    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, '\n\n')
    
    // Trim whitespace
    text = text.trim()
    
    return text || 'No readable content found in RTF file'
  } catch (error) {
    console.error('Error converting RTF to Markdown:', error)
    return `Error processing RTF file: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

export async function convertFileToMarkdown(file: File): Promise<ConversionResult> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  console.log(`Converting file: ${file.name}, MIME type: ${fileType}, size: ${file.size}`)

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
    } else if (fileType === 'application/rtf' || fileType === 'text/rtf' || fileName.endsWith('.rtf')) {
      const rtfText = await file.text()
      markdown = convertRtfToMarkdown(rtfText)
      originalFormat = 'rtf'
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