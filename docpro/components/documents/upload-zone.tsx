'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { validateFiles, FileValidation, SupportedFormats } from './file-validation'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  className?: string
  maxFiles?: number
}

export function UploadZone({ 
  onFilesSelected, 
  disabled = false, 
  className,
  maxFiles = 10 
}: UploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...selectedFiles, ...acceptedFiles].slice(0, maxFiles)
    setSelectedFiles(newFiles)
  }, [selectedFiles, maxFiles])

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
    noClick: true,
    noKeyboard: true,
    disabled,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  const clearAll = () => {
    setSelectedFiles([])
  }

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
      setSelectedFiles([]) // Clear files after upload starts
    }
  }

  const validation = validateFiles(selectedFiles)

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          {
            'border-primary bg-primary/5': isDragActive,
            'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragActive && !disabled,
            'opacity-50 cursor-not-allowed': disabled,
          }
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'rounded-full p-4',
            isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}>
            <Upload className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragActive ? 'Drop files here' : 'Upload Documents'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Drag and drop your documents here, or{' '}
              <button
                type="button"
                onClick={open}
                disabled={disabled}
                className="text-primary hover:underline font-medium"
              >
                browse files
              </button>
            </p>
          </div>
        </div>
      </Card>

      {/* Supported Formats */}
      <SupportedFormats />

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Selected Files ({selectedFiles.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Validation Messages */}
          <FileValidation validation={validation} />

          {/* Upload Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpload}
              disabled={!validation.isValid || disabled || selectedFiles.length === 0}
              size="lg"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Document' : 'Documents'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}