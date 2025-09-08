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

// Server-side Word document generation
export async function downloadAsWord(title: string, markdown: string, description?: string): Promise<Buffer> {
  try {
    // For now, create a simple RTF document that can be opened by Word
    // This is a basic RTF format that Word can read
    const rtfContent = convertMarkdownToRtf(title, markdown, description)
    
    return Buffer.from(rtfContent, 'utf8')
  } catch (error) {
    console.error('Error generating Word document:', error)
    throw new Error('Failed to generate Word document')
  }
}

// Server-side PDF generation (simplified version)
export async function downloadAsPdf(title: string, markdown: string, description?: string): Promise<Buffer> {
  try {
    // For now, we'll return an HTML version that can be converted to PDF by the browser
    // In a production app, you'd use something like puppeteer or jsPDF
    const html = convertMarkdownToHtml(markdown)
    
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            margin: 2rem; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
        }
        h1, h2, h3, h4, h5, h6 { color: #333; margin-top: 2rem; margin-bottom: 1rem; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
        code { 
            background-color: #f5f5f5; 
            padding: 0.2rem 0.4rem; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; 
        }
        pre { 
            background-color: #f5f5f5; 
            padding: 1rem; 
            border-radius: 5px; 
            overflow-x: auto; 
        }
        blockquote { 
            border-left: 4px solid #ddd; 
            margin: 0; 
            padding-left: 1rem; 
            color: #666; 
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 1rem 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 0.5rem; 
            text-align: left; 
        }
        th { 
            background-color: #f5f5f5; 
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${description ? `<p><em>${description}</em></p>` : ''}
    ${html}
</body>
</html>`
    
    return Buffer.from(fullHtml, 'utf8')
  } catch (error) {
    console.error('Error generating PDF document:', error)
    throw new Error('Failed to generate PDF document')
  }
}

// Helper function to convert markdown to RTF format
function convertMarkdownToRtf(title: string, markdown: string, description?: string): string {
  // Convert markdown to plain text and format as RTF
  const plainText = convertMarkdownToPlainText(markdown)
  
  // Basic RTF document structure
  const rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 
{\\b\\fs32 ${title}\\par}
${description ? `\\par {\\i ${description}}\\par\\par` : '\\par'}
${plainText.replace(/\n/g, '\\par ')}
}`

  return rtf
}

// Client-side helper functions (keep existing ones for browser use)
export function downloadAsWordClient(content: string, filename: string = 'document.docx') {
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

export function downloadAsPdfClient(content: string, filename: string = 'document.pdf') {
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