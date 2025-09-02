import { marked } from 'marked'

export function convertMarkdownToHtml(markdown: string): string {
  try {
    const html = marked.parse(markdown)
    return html as string
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error)
    throw new Error('Failed to convert Markdown to HTML')
  }
}

export function convertMarkdownToPlainText(markdown: string): string {
  try {
    // Strip markdown formatting
    return markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italics
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
      .replace(/^-\s+/gm, '') // Remove bullet points
      .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/\n{2,}/g, '\n\n') // Normalize newlines
      .trim()
  } catch (error) {
    console.error('Error converting Markdown to plain text:', error)
    throw new Error('Failed to convert Markdown to plain text')
  }
}

// For Word export, we'll convert to HTML first then use a service
export async function convertMarkdownToWordHtml(markdown: string): Promise<string> {
  const html = convertMarkdownToHtml(markdown)
  
  // Add Word-compatible styles
  const wordHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Document</title>
      <style>
        body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.4; }
        h1 { font-size: 16pt; font-weight: bold; }
        h2 { font-size: 14pt; font-weight: bold; }
        h3 { font-size: 12pt; font-weight: bold; }
        p { margin: 0 0 10pt 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 4pt; }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `
  
  return wordHtml
}

// Helper function to generate Word document download
export function downloadAsWord(content: string, filename: string = 'document.docx') {
  if (typeof window === 'undefined') return

  const blob = new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Helper function to generate PDF download
export function downloadAsPdf(content: string, filename: string = 'document.pdf') {
  if (typeof window === 'undefined') return

  const blob = new Blob([content], { type: 'application/pdf' })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}