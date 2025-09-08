'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/documents/upload-zone'
import { UploadProgress } from '@/components/documents/upload-progress'
import { useUpload } from '@/hooks/use-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const { uploadFiles, uploadingFiles, isUploading, clearCompleted, removeFile } = useUpload()
  const [showSuccess, setShowSuccess] = useState(false)

  const handleFilesSelected = (files: File[]) => {
    uploadFiles(files)
    setShowSuccess(true)
  }

  const completedUploads = uploadingFiles.filter(f => f.status === 'completed')
  const hasCompleted = completedUploads.length > 0

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground mt-2">
            Upload your policies, procedures, and other documents. They'll be automatically 
            converted to markdown for version control and AI analysis.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Select Documents</CardTitle>
            <CardDescription>
              Upload Word documents, PDFs, or markdown files to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadZone 
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <UploadProgress 
                files={uploadingFiles}
                onRemove={removeFile}
              />
              
              {hasCompleted && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      {completedUploads.length} document{completedUploads.length !== 1 ? 's' : ''} uploaded successfully
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={clearCompleted}
                    >
                      Clear Completed
                    </Button>
                    <Button 
                      onClick={() => router.push('/documents')}
                    >
                      View Documents
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens after upload?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  1
                </div>
                <h4 className="font-semibold mb-1">Conversion</h4>
                <p className="text-sm text-muted-foreground">
                  Documents are converted to markdown for version control
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  2
                </div>
                <h4 className="font-semibold mb-1">AI Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Content is analyzed and indexed for intelligent search
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  3
                </div>
                <h4 className="font-semibold mb-1">Ready to Use</h4>
                <p className="text-sm text-muted-foreground">
                  Documents become searchable and available for collaboration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}