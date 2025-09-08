'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDocuments } from '@/hooks/use-documents'
import { DocumentList, type DocumentFilters } from '@/components/documents/document-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DocumentsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<DocumentFilters>({})
  
  const { documents, isLoading, error } = useDocuments(filters)

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search: search || undefined }))
  }

  const handleFilterChange = (newFilters: DocumentFilters) => {
    setFilters(newFilters)
  }

  const handleUpload = () => {
    router.push('/documents/upload')
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-destructive text-2xl">!</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Error loading documents</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-2">
              Manage your organization's policies, procedures, and documents
            </p>
          </div>
          <Button onClick={handleUpload} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
            {filters.category && <span>Category: {filters.category}</span>}
            {filters.tags && filters.tags.length > 0 && (
              <span>Tags: {filters.tags.join(', ')}</span>
            )}
          </div>
        )}
      </div>

      <DocumentList
        documents={documents}
        isLoading={isLoading}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onUpload={handleUpload}
      />
    </div>
  )
}