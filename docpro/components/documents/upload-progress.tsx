'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'uploading' | 'converting' | 'completed' | 'error'
  error?: string
  documentId?: string
}

interface UploadProgressProps {
  files: UploadFile[]
  onRemove?: (fileId: string) => void
  className?: string
}

export function UploadProgress({ files, onRemove, className }: UploadProgressProps) {
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'converting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'converting':
        return 'Converting to markdown...'
      case 'completed':
        return 'Upload completed'
      case 'error':
        return 'Upload failed'
      default:
        return 'Pending'
    }
  }

  if (files.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Upload Progress</h3>
      <div className="space-y-3">
        {files.map((uploadFile) => (
          <div key={uploadFile.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getStatusIcon(uploadFile.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadFile.file.size)} • {getStatusText(uploadFile.status)}
                  </p>
                </div>
              </div>
              {onRemove && uploadFile.status === 'error' && (
                <button
                  onClick={() => onRemove(uploadFile.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
            
            {uploadFile.status !== 'completed' && uploadFile.status !== 'error' && (
              <Progress value={uploadFile.progress} className="h-2" />
            )}
            
            {uploadFile.error && (
              <p className="text-xs text-destructive">{uploadFile.error}</p>
            )}
            
            {uploadFile.status === 'completed' && (
              <p className="text-xs text-green-600">
                Successfully uploaded and converted to markdown
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}