import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDocumentById } from '@/lib/db/documents'
import { downloadFile } from '@/lib/services/storage-service'
import { 
  convertMarkdownToHtml,
  convertMarkdownToPlainText,
  convertMarkdownToWordHtml,
  downloadAsWord,
  downloadAsPdf
} from '@/lib/converters'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'original' // original, markdown, pdf, word
    
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: userRecord, error: userError } = await adminClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'User not found or not associated with an organization' },
        { status: 400 }
      )
    }

    // Fetch the document
    const document = await getDocumentById(id, userRecord.org_id)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const filename = document.title.replace(/[^a-zA-Z0-9\s.-]/g, '_')

    switch (format) {
      case 'original': {
        // Download the original uploaded file
        // We need to get the original file path from storage
        // For now, we'll return the markdown version as a fallback
        const markdown = document.current_version?.content_markdown || ''
        
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename}.md"`,
          },
        })
      }

      case 'markdown': {
        const markdown = document.current_version?.content_markdown || ''
        
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename}.md"`,
          },
        })
      }

      case 'html': {
        const markdown = document.current_version?.content_markdown || ''
        const html = convertMarkdownToHtml(markdown)
        
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 2rem; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3, h4, h5, h6 { color: #333; margin-top: 2rem; margin-bottom: 1rem; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
        code { background-color: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
        pre { background-color: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>${document.title}</h1>
    ${document.description ? `<p><em>${document.description}</em></p>` : ''}
    ${html}
</body>
</html>`
        
        return new NextResponse(fullHtml, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="${filename}.html"`,
          },
        })
      }

      case 'txt': {
        const markdown = document.current_version?.content_markdown || ''
        const plainText = convertMarkdownToPlainText(markdown)
        
        return new NextResponse(plainText, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${filename}.txt"`,
          },
        })
      }

      case 'word': {
        const markdown = document.current_version?.content_markdown || ''
        
        try {
          const wordBuffer = await downloadAsWord(document.title, markdown, document.description)
          
          return new NextResponse(wordBuffer, {
            headers: {
              'Content-Type': 'application/rtf',
              'Content-Disposition': `attachment; filename="${filename}.rtf"`,
            },
          })
        } catch (error) {
          console.error('Error generating Word document:', error)
          return NextResponse.json(
            { error: 'Failed to generate Word document' },
            { status: 500 }
          )
        }
      }

      case 'pdf': {
        const markdown = document.current_version?.content_markdown || ''
        
        try {
          const pdfBuffer = await downloadAsPdf(document.title, markdown, document.description)
          
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'text/html',
              'Content-Disposition': `attachment; filename="${filename}.html"`,
            },
          })
        } catch (error) {
          console.error('Error generating PDF document:', error)
          return NextResponse.json(
            { error: 'Failed to generate PDF document' },
            { status: 500 }
          )
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid format. Supported formats: original, markdown, html, txt, word, pdf' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error downloading document:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}