'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDocuments } from '@/hooks/use-documents'
import { useRepositories } from '@/hooks/use-repositories'
import { DocumentList, type DocumentFilters } from '@/components/documents/document-list'
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FolderOpen } from 'lucide-react'

export default function DocumentsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<DocumentFilters>({})
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedRepositoryForUpload, setSelectedRepositoryForUpload] = useState('')
  
  const { documents, isLoading, error } = useDocuments(filters)
  const { repositories } = useRepositories()

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search: search || undefined }))
  }

  const handleFilterChange = (newFilters: DocumentFilters) => {
    setFilters(newFilters)
  }

  const handleUpload = () => {
    if (repositories && repositories.length > 0) {
      // If there are repositories, show the upload dialog with repository selection
      setShowUploadDialog(true)
    } else {
      // No repositories exist, redirect to create one first
      router.push('/repositories')
    }
  }

  const handleUploadDialogOpen = () => {
    if (repositories && repositories.length > 0) {
      setSelectedRepositoryForUpload(repositories[0].id)
      setShowUploadDialog(true)
    }
  }

  const handleUploadSuccess = () => {
    setShowUploadDialog(false)
    // Refresh the documents list
    window.location.reload()
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
          <div className="flex gap-2">
            <Button onClick={() => router.push('/repositories')} variant="outline" size="lg">
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse Repositories
            </Button>
            <Button onClick={handleUpload} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
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

      {/* Upload Dialog */}
      {showUploadDialog && selectedRepositoryForUpload && (
        <UploadDocumentDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          repositoryId={selectedRepositoryForUpload}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Repository Selection Dialog */}
      {showUploadDialog && !selectedRepositoryForUpload && repositories && repositories.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select Repository</h3>
            <p className="text-muted-foreground mb-4">
              Choose which repository to upload the document to:
            </p>
            <Select value={selectedRepositoryForUpload} onValueChange={setSelectedRepositoryForUpload}>
              <SelectTrigger className="mb-4">
                <SelectValue placeholder="Choose a repository..." />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{repo.name}</span>
                      {repo.category && (
                        <span className="text-xs text-muted-foreground">{repo.category}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedRepositoryForUpload) {
                    // Dialog will now show the upload form
                  }
                }}
                disabled={!selectedRepositoryForUpload}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}