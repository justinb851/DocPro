'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, ArrowLeft, Upload, Settings, FileText } from 'lucide-react'
import { useRepository } from '@/hooks/use-repository'
import { useRepositoryDocuments } from '@/hooks/use-repository-documents'
import { DocumentList } from '@/components/documents/document-list'
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog'
import { formatDistanceToNow } from 'date-fns'

interface RepositoryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function RepositoryDetailPage({ params }: RepositoryDetailPageProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const router = useRouter()
  
  const resolvedParams = use(params)
  const { repository, isLoading: repositoryLoading, error: repositoryError } = useRepository(resolvedParams.id)
  const { documents, isLoading: documentsLoading, error: documentsError, mutate } = useRepositoryDocuments(resolvedParams.id)

  if (repositoryError || documentsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load repository</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  if (repositoryLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-3 text-gray-600">Loading repository...</span>
        </div>
      </div>
    )
  }

  if (!repository) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Repository not found</p>
          <Button onClick={() => router.push('/repositories')}>Back to Repositories</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push('/repositories')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{repository.name}</h1>
            {repository.category && (
              <Badge variant="outline">{repository.category}</Badge>
            )}
            <Badge variant={repository.status === 'active' ? 'default' : 'secondary'}>
              {repository.status}
            </Badge>
          </div>
          {repository.description && (
            <p className="text-gray-600">{repository.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDistanceToNow(new Date(repository.created_at))} ago
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </CardTitle>
              <CardDescription>
                Documents in this repository
              </CardDescription>
            </div>
            {documents && documents.length > 0 && (
              <Badge variant="outline">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-3 text-gray-600">Loading documents...</span>
            </div>
          ) : documents && documents.length > 0 ? (
            <DocumentList documents={documents} />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-6">
                Upload your first document to this repository to get started.
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        repositoryId={resolvedParams.id}
        onSuccess={() => {
          mutate()
          setShowUploadDialog(false)
        }}
      />
    </div>
  )
}