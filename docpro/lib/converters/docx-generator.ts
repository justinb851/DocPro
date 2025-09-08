import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

export async function generateDocxFromMarkdown(title: string, markdown: string, description?: string): Promise<Buffer> {
  try {
    // Parse markdown and convert to docx elements
    const paragraphs = parseMarkdownToParagraphs(title, markdown, description)
    
    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)
    return buffer
  } catch (error) {
    console.error('Error generating DOCX:', error)
    throw new Error('Failed to generate DOCX document')
  }
}

function parseMarkdownToParagraphs(title: string, markdown: string, description?: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  // Add title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt font size
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Add description if provided
  if (description) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: description,
            italics: true,
            color: '666666',
          }),
        ],
        spacing: { after: 400 },
      })
    )
  }

  // Parse markdown content
  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    
    if (!line) {
      // Empty line - add spacing
      paragraphs.push(new Paragraph({ children: [] }))
      i++
      continue
    }
    
    // Handle headers
    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(2),
              bold: true,
              size: 28, // 14pt
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(3),
              bold: true,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      )
    } else if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(4),
              bold: true,
              size: 22, // 11pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Handle bullet points
      const bullets: string[] = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        bullets.push(lines[i].trim().substring(2))
        i++
      }
      i-- // Back up one since we'll increment at the end of the loop
      
      bullets.forEach(bullet => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${bullet}`,
              }),
            ],
            spacing: { after: 100 },
          })
        )
      })
    } else if (/^\d+\.\s/.test(line)) {
      // Handle numbered lists
      const numberedItems: string[] = []
      let num = 1
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        numberedItems.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      i-- // Back up one
      
      numberedItems.forEach((item, index) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${item}`,
              }),
            ],
            spacing: { after: 100 },
          })
        )
      })
    } else {
      // Regular paragraph - handle inline formatting
      const textRuns = parseInlineFormatting(line)
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 200 },
        })
      )
    }
    
    i++
  }

  return paragraphs
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = []
  let current = ''
  let i = 0
  
  while (i < text.length) {
    if (text.substring(i, i + 2) === '**') {
      // Bold text
      if (current) {
        runs.push(new TextRun({ text: current }))
        current = ''
      }
      i += 2
      const boldStart = i
      while (i < text.length - 1 && text.substring(i, i + 2) !== '**') {
        i++
      }
      if (i < text.length - 1) {
        runs.push(new TextRun({ text: text.substring(boldStart, i), bold: true }))
        i += 2
      } else {
        current += '**' + text.substring(boldStart, i)
      }
    } else if (text[i] === '*' && text[i + 1] !== '*') {
      // Italic text
      if (current) {
        runs.push(new TextRun({ text: current }))
        current = ''
      }
      i++
      const italicStart = i
      while (i < text.length && text[i] !== '*') {
        i++
      }
      if (i < text.length) {
        runs.push(new TextRun({ text: text.substring(italicStart, i), italics: true }))
        i++
      } else {
        current += '*' + text.substring(italicStart, i)
      }
    } else if (text[i] === '`') {
      // Code text
      if (current) {
        runs.push(new TextRun({ text: current }))
        current = ''
      }
      i++
      const codeStart = i
      while (i < text.length && text[i] !== '`') {
        i++
      }
      if (i < text.length) {
        runs.push(new TextRun({ 
          text: text.substring(codeStart, i),
          font: 'Consolas',
          color: '666666',
        }))
        i++
      } else {
        current += '`' + text.substring(codeStart, i)
      }
    } else {
      current += text[i]
      i++
    }
  }
  
  if (current) {
    runs.push(new TextRun({ text: current }))
  }
  
  return runs.length > 0 ? runs : [new TextRun({ text: text })]
}