'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UploadFile } from '@/components/documents/upload-progress'

interface UploadHookResult {
  uploadFiles: (files: File[]) => void
  uploadingFiles: UploadFile[]
  isUploading: boolean
  clearCompleted: () => void
  removeFile: (fileId: string) => void
}

export function useUpload(): UploadHookResult {
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([])
  
  const isUploading = uploadingFiles.some(f => 
    f.status === 'uploading' || f.status === 'converting'
  )

  const generateFileId = () => Math.random().toString(36).substring(7)

  const updateFile = useCallback((fileId: string, updates: Partial<UploadFile>) => {
    setUploadingFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ))
  }, [])

  const uploadSingleFile = useCallback(async (file: File, fileId: string) => {
    try {
      // Set uploading status
      updateFile(fileId, { status: 'uploading', progress: 0 })

      const formData = new FormData()
      formData.append('file', file)
      
      // You can add metadata here if needed
      // formData.append('title', customTitle)
      // formData.append('description', customDescription)

      // Simulate upload progress (in real implementation, you'd track actual progress)
      const progressInterval = setInterval(() => {
        updateFile(fileId, { 
          progress: Math.min(90, Math.random() * 30 + 40) 
        })
      }, 500)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      // Set converting status
      updateFile(fileId, { 
        status: 'converting', 
        progress: 95 
      })

      const result = await response.json()

      // Set completed status
      updateFile(fileId, { 
        status: 'completed', 
        progress: 100,
        documentId: result.document.id
      })

      return result

    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error)
      updateFile(fileId, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }, [updateFile])

  const uploadFiles = useCallback(async (files: File[]) => {
    // Initialize upload files
    const newUploadFiles: UploadFile[] = files.map(file => ({
      file,
      id: generateFileId(),
      progress: 0,
      status: 'uploading' as const,
    }))

    setUploadingFiles(prev => [...prev, ...newUploadFiles])

    // Upload files concurrently (but limit concurrency to avoid overwhelming the server)
    const CONCURRENT_UPLOADS = 3
    const chunks = []
    
    for (let i = 0; i < newUploadFiles.length; i += CONCURRENT_UPLOADS) {
      chunks.push(newUploadFiles.slice(i, i + CONCURRENT_UPLOADS))
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(uploadFile => 
          uploadSingleFile(uploadFile.file, uploadFile.id)
        )
      )
    }
  }, [uploadSingleFile])

  const clearCompleted = useCallback(() => {
    setUploadingFiles(prev => 
      prev.filter(f => f.status !== 'completed')
    )
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  return {
    uploadFiles,
    uploadingFiles,
    isUploading,
    clearCompleted,
    removeFile,
  }
}