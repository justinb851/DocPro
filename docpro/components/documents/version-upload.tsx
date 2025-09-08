'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import VersionComparisonReport from './version-comparison-report'

interface VersionUploadProps {
  documentId: string
  documentTitle: string
  currentVersion?: number
  onSuccess?: () => void
  onCancel?: () => void
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message?: string
  progress?: number
}

export function VersionUpload({ 
  documentId, 
  documentTitle, 
  currentVersion = 1,
  onSuccess,
  onCancel 
}: VersionUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [changeSummary, setChangeSummary] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const [comparisonData, setComparisonData] = useState<any>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const allowedExtensions = ['.docx', '.pdf', '.md', '.txt', '.rtf']
    const fileName = selectedFile.name.toLowerCase()
    const isValidType = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!isValidType) {
      setUploadState({
        status: 'error',
        message: 'Unsupported file type. Please upload .docx, .pdf, .md, .txt, or .rtf files.'
      })
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setUploadState({
        status: 'error',
        message: 'File size exceeds 50MB limit. Please choose a smaller file.'
      })
      return
    }

    setFile(selectedFile)
    setUploadState({ status: 'idle' })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploadState({ status: 'uploading', progress: 0 })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('changeSummary', changeSummary)

      const response = await fetch(`/api/documents/${documentId}/upload-version`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      // Store comparison data to show in the report
      setComparisonData({
        documentId,
        documentTitle,
        previousVersion: result.previousVersion,
        newVersion: result.version.version_number,
        changeSummary: result.version.change_summary,
        comparison: result.comparison
      })
      
      setUploadState({
        status: 'success',
        message: `Successfully uploaded version ${result.version.version_number}!`
      })

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  const resetForm = () => {
    setFile(null)
    setChangeSummary('')
    setUploadState({ status: 'idle' })
  }

  if (uploadState.status === 'success' && comparisonData) {
    return (
      <VersionComparisonReport
        {...comparisonData}
        onClose={() => {
          onSuccess?.()
        }}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Version</CardTitle>
        <CardDescription>
          Upload a new version of "{documentTitle}" (currently v{currentVersion})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-4">
          <Label>Select File</Label>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              file ? 'bg-muted/50' : 'hover:bg-muted/50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetForm}
                  disabled={uploadState.status === 'uploading'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">Drop your file here, or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports: .docx, .pdf, .md, .txt, .rtf (max 50MB)
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".docx,.pdf,.md,.txt,.rtf"
                  onChange={handleFileSelect}
                  className="max-w-xs"
                  disabled={uploadState.status === 'uploading'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Change Summary */}
        <div className="space-y-2">
          <Label htmlFor="changeSummary">Change Summary (Optional)</Label>
          <Textarea
            id="changeSummary"
            placeholder="Describe what changed in this version..."
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            disabled={uploadState.status === 'uploading'}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            This will help others understand what was updated in this version.
          </p>
        </div>

        {/* Error Display */}
        {uploadState.status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{uploadState.message}</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploadState.status === 'uploading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadState.progress || 0}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadState.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleUpload}
            disabled={!file || uploadState.status === 'uploading'}
            className="flex-1"
          >
            {uploadState.status === 'uploading' ? 'Uploading...' : `Upload Version ${currentVersion + 1}`}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={uploadState.status === 'uploading'}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default VersionUpload