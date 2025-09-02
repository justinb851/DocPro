import mammoth from 'mammoth'
import TurndownService from 'turndown'

export async function convertWordToMarkdown(buffer: ArrayBuffer): Promise<string> {
  try {
    // Convert Word document to HTML using mammoth
    const result = await mammoth.convertToHtml({
      arrayBuffer: buffer,
    })

    if (result.messages.length > 0) {
      console.warn('Conversion warnings:', result.messages)
    }

    // Convert HTML to Markdown using Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    })

    // Add custom rules for better formatting
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'] as any,
      replacement: (content) => `~~${content}~~`,
    })

    const markdown = turndownService.turndown(result.value)
    
    // Clean up extra whitespace
    return markdown
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim()
  } catch (error) {
    console.error('Error converting Word to Markdown:', error)
    throw new Error('Failed to convert Word document to Markdown')
  }
}

export async function convertWordFileToMarkdown(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return convertWordToMarkdown(buffer)
}