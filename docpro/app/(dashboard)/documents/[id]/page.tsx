'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useDocument } from '@/hooks/use-documents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Edit, History, FileText, Calendar, User, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DocumentPageProps {
  params: Promise<{ id: string }>
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: document, isLoading, error } = useDocument(id)

  const handleDownload = async (format: string = 'original') => {
    try {
      const response = await fetch(`/api/documents/${id}/download?format=${format}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Download failed')
      }
      
      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `document.${format === 'original' ? 'md' : format}`
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }
      
      // Create blob and download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Download failed:', error)
      // TODO: Show error toast/notification
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleEdit = () => {
    // TODO: Navigate to edit page or open edit modal
    console.log('Edit document:', id)
  }

  const handleViewVersions = () => {
    // TODO: Navigate to versions page
    console.log('View versions:', id)
  }

  const handleReprocess = async () => {
    try {
      const response = await fetch(`/api/documents/${id}/reprocess`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Reprocess failed')
      }
      
      // Refresh the page to show updated content
      window.location.reload()
      
    } catch (error) {
      console.error('Reprocess failed:', error)
      alert(`Failed to reprocess document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded w-1/3" />
          </div>
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-destructive text-2xl">!</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Document not found</h3>
          <p className="text-muted-foreground mb-4">
            The document you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => router.push('/documents')}>
            Back to Documents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
            {document.description && (
              <p className="text-lg text-muted-foreground mb-4">
                {document.description}
              </p>
            )}
            
            {/* Tags and Category */}
            <div className="flex flex-wrap gap-2 mb-4">
              {document.category && (
                <Badge variant="secondary">
                  {document.category}
                </Badge>
              )}
              {document.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Updated {formatDate(document.updated_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Version {document.current_version?.version_number || 1}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-6">
            <Button variant="outline" onClick={handleViewVersions}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" onClick={() => handleDownload('original')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
              {document.current_version?.change_summary && (
                <CardDescription>
                  {document.current_version.change_summary}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray dark:prose-invert max-w-none 
                prose-headings:scroll-mt-20 
                prose-h1:text-3xl prose-h1:font-bold
                prose-h2:text-2xl prose-h2:font-semibold
                prose-h3:text-xl prose-h3:font-medium
                prose-p:leading-7
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:font-semibold
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:marker:text-muted-foreground
                prose-blockquote:border-l-4 prose-blockquote:border-muted prose-blockquote:pl-4 prose-blockquote:italic
                prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:text-foreground
                prose-img:rounded-lg prose-img:shadow-md
                prose-table:overflow-hidden prose-th:bg-muted prose-th:font-semibold
                prose-hr:border-border">
                {document.current_version?.content_markdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {document.current_version.content_markdown}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">No content available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{formatDate(document.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{formatDate(document.updated_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Version</label>
                <p className="text-sm">Version {document.current_version?.version_number || 1}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => handleDownload('word')}>
                <Download className="h-4 w-4 mr-2" />
                Download as Word
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleDownload('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleDownload('markdown')}>
                <Download className="h-4 w-4 mr-2" />
                Download as Markdown
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleDownload('html')}>
                <Download className="h-4 w-4 mr-2" />
                Download as HTML
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleDownload('txt')}>
                <Download className="h-4 w-4 mr-2" />
                Download as Text
              </Button>
              {(document.title?.toLowerCase().includes('pdf') || document.description?.toLowerCase().includes('pdf')) && (
                <>
                  <div className="border-t pt-2 mt-2" />
                  <Button variant="outline" className="w-full justify-start" onClick={handleReprocess}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reprocess PDF Formatting
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}