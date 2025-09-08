export async function convertPdfToMarkdown(buffer: ArrayBuffer): Promise<string> {
  // Only import pdfjs-dist on the client side
  if (typeof window === 'undefined') {
    throw new Error('convertPdfToMarkdown can only be used in the browser')
  }
  
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
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
    console.log('Starting server-side PDF conversion, buffer size:', buffer.length)
    
    // Create a more robust workaround for pdf-parse
    const fs = require('fs')
    const path = require('path')
    
    // Try multiple possible locations for the test file
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules/pdf-parse/test/data/05-versions-space.pdf'),
      path.join(process.cwd(), 'test/data/05-versions-space.pdf'),
      path.join(__dirname, '../../../test/data/05-versions-space.pdf')
    ]
    
    // Create test files in all possible locations
    for (const testPath of possiblePaths) {
      const testDir = path.dirname(testPath)
      if (!fs.existsSync(testDir)) {
        try {
          fs.mkdirSync(testDir, { recursive: true })
        } catch (e) {
          // Ignore mkdir errors
        }
      }
      if (!fs.existsSync(testPath)) {
        try {
          fs.writeFileSync(testPath, buffer.slice(0, 1000)) // Use actual PDF header
        } catch (e) {
          // Ignore write errors
        }
      }
    }
    
    // Try loading pdf-parse with error handling
    let pdfParse: any
    try {
      pdfParse = require('pdf-parse')
    } catch (importError) {
      console.error('Could not import pdf-parse:', importError)
      throw new Error('PDF parsing library not available')
    }
    
    console.log('pdf-parse module loaded, parsing PDF...')
    
    // Parse with timeout and error handling
    const data = await Promise.race([
      pdfParse(buffer, {
        // Add options to make parsing more robust
        max: 0, // No page limit
        version: 'v1.10.100' // Specify version to avoid compatibility issues
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timeout')), 30000)
      )
    ]) as any
    
    if (!data || !data.text) {
      console.log('No text content extracted from PDF')
      return `# Document Content\n\n*This PDF appears to contain no extractable text. It may be:*\n\n- An image-based/scanned document\n- A PDF with non-standard encoding\n- A password-protected document\n- A corrupted file\n\n*The original file has been saved and can be downloaded using the download button.*`
    }
    
    const textLength = data.text.length
    console.log('PDF parsed successfully, text length:', textLength)
    
    // Clean up the text and format as markdown
    let cleanText = data.text
      .replace(/\f/g, '\n\n---\n\n') // Replace form feeds with page breaks
      .trim()

    // If text is very short, it might be a scanned PDF or have extraction issues
    if (cleanText.length < 50) {
      return `# Document Content\n\n${cleanText}\n\n*Note: Limited text was extracted from this PDF. It may contain mostly images or have a non-standard format.*`
    }

    // Enhanced markdown formatting
    const lines = cleanText.split('\n')
    const formattedLines: string[] = []
    let inList = false
    let lastWasEmpty = true
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : ''
      
      if (!line) {
        if (!lastWasEmpty) {
          formattedLines.push('')
          lastWasEmpty = true
        }
        inList = false
        continue
      }
      
      lastWasEmpty = false
      
      // Detect main headers (ALL CAPS, typically document titles)
      if (line.length > 10 && line === line.toUpperCase() && /^[A-Z\s\-:]+$/.test(line)) {
        formattedLines.push('')
        formattedLines.push(`# ${line}`)
        formattedLines.push('')
        continue
      }
      
      // Detect section headers (starts with ARTICLE, SECTION, Chapter, etc.)
      if (/^(ARTICLE|Article|SECTION|Section|CHAPTER|Chapter)\s+[IVX\d]+/i.test(line)) {
        formattedLines.push('')
        formattedLines.push(`## ${line}`)
        formattedLines.push('')
        continue
      }
      
      // Detect subsection headers (format: "Section X: Title" or numbered sections)
      if (/^Section\s+\d+:/i.test(line) || /^\d+\.\d+[\s:]/i.test(line)) {
        formattedLines.push('')
        formattedLines.push(`### ${line}`)
        formattedLines.push('')
        continue
      }
      
      // Detect numbered lists (but not section numbers)
      if (/^\d+\.\s+(?![A-Z]{2,})/.test(line) || /^\(\d+\)/.test(line)) {
        if (!inList) {
          formattedLines.push('')
        }
        formattedLines.push(line)
        inList = true
        continue
      }
      
      // Detect lettered lists
      if (/^\([a-z]\)/.test(line) || /^[a-z]\.\s/.test(line)) {
        if (!inList) {
          formattedLines.push('')
        }
        formattedLines.push(`   ${line}`)
        inList = true
        continue
      }
      
      // Detect bullet points
      if (/^[\•\-\*]\s/.test(line)) {
        if (!inList) {
          formattedLines.push('')
        }
        formattedLines.push(`- ${line.substring(2)}`)
        inList = true
        continue
      }
      
      // Table of Contents entries (preserve formatting)
      if (line.includes('....') || line.includes('----')) {
        formattedLines.push(line)
        continue
      }
      
      // Page numbers alone
      if (/^\d{1,3}$/.test(line)) {
        formattedLines.push('')
        formattedLines.push(`---`)
        formattedLines.push(`*Page ${line}*`)
        formattedLines.push('')
        continue
      }
      
      // Bold important terms
      let formattedLine = line
        .replace(/\b(MUST|SHALL|SHOULD|REQUIRED|PROHIBITED)\b/g, '**$1**')
        .replace(/\b(Note:|Notice:|Warning:|Important:)/gi, '**$1**')
      
      // Regular paragraph
      if (inList && !(/^\d+\.\s/.test(line) || /^\([a-z]\)/.test(line) || /^[\•\-\*]\s/.test(line))) {
        formattedLines.push('')
        inList = false
      }
      
      formattedLines.push(formattedLine)
    }
    
    // Join lines and clean up excessive spacing
    let markdown = formattedLines.join('\n')
      .replace(/\n{4,}/g, '\n\n\n') // Limit to max 3 newlines
      .replace(/\n\n---\n\n---/g, '\n\n---') // Clean up duplicate separators
      .trim()
    
    return `# Document Content\n\n${markdown}`
    
  } catch (error) {
    console.error('Error converting PDF to Markdown (server):', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return a user-friendly fallback message
    return `# Document Upload Successful\n\n*Your PDF has been uploaded and stored successfully, but automatic text extraction encountered an issue.*\n\n**What this means:**\n- Your original PDF file is safely stored\n- You can download it anytime using the download button\n- The document is searchable by filename and metadata\n\n**Possible reasons for extraction failure:**\n- The PDF contains primarily images or scanned content\n- The PDF uses non-standard encoding\n- The PDF is password-protected\n- Technical issue with text extraction\n\n**Next steps:**\n- Use the download button to access your original file\n- Consider uploading a Word document (.docx) or plain text version for better text extraction\n- Contact support if you continue experiencing issues\n\n*Error details: ${error instanceof Error ? error.message : 'Unknown error'}*`
  }
}

export async function convertPdfFileToMarkdown(file: File): Promise<string> {
  try {
    // Use server-side conversion for API routes
    if (typeof window === 'undefined') {
      const buffer = Buffer.from(await file.arrayBuffer())
      return convertPdfToMarkdownServer(buffer)
    }
    
    // Use browser-side conversion for client-side
    const buffer = await file.arrayBuffer()
    return convertPdfToMarkdown(buffer)
  } catch (error) {
    console.error('Error in convertPdfFileToMarkdown:', error)
    throw new Error('Failed to convert PDF file to Markdown')
  }
}