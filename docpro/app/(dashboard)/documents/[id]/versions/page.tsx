'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useDocument } from '@/hooks/use-documents'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { VersionHistory } from '@/components/documents/version-history'

interface DocumentVersionsPageProps {
  params: Promise<{ id: string }>
}

export default function DocumentVersionsPage({ params }: DocumentVersionsPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: document, isLoading, error } = useDocument(id)

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
          onClick={() => router.push(`/documents/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Document
        </Button>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <p className="text-lg text-muted-foreground">Version History</p>
        </div>
      </div>

      {/* Version History Component */}
      <VersionHistory 
        documentId={id} 
        currentVersionId={document.current_version?.id}
      />
    </div>
  )
}