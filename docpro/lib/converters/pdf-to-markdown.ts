import * as pdfjsLib from 'pdfjs-dist'

// Set worker path for PDF.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

export async function convertPdfToMarkdown(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const numPages = pdf.numPages
    const textChunks: string[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Extract text items and build markdown
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim()

      if (pageText) {
        textChunks.push(`## Page ${pageNum}\n\n${pageText}\n`)
      }
    }

    return textChunks.join('\n').trim()
  } catch (error) {
    console.error('Error converting PDF to Markdown:', error)
    throw new Error('Failed to convert PDF to Markdown')
  }
}

// Fallback function using pdf-parse for server-side processing
export async function convertPdfToMarkdownServer(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues with bundling
    const pdfParse = (await import('pdf-parse')).default
    
    const data = await pdfParse(buffer)
    
    // Clean up the text and format as markdown
    const cleanText = data.text
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces
      .trim()

    return `# Document Content\n\n${cleanText}`
  } catch (error) {
    console.error('Error converting PDF to Markdown (server):', error)
    throw new Error('Failed to convert PDF to Markdown on server')
  }
}

export async function convertPdfFileToMarkdown(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return convertPdfToMarkdown(buffer)
}