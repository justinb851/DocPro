'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Document, DocumentVersion } from '@/types'

interface DocumentWithVersion extends Document {
  current_version?: DocumentVersion
  versions_count?: number
}

interface DocumentsResponse {
  documents: DocumentWithVersion[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

interface DocumentFilters {
  category?: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export function useDocuments(filters: DocumentFilters = {}) {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ['documents', filters],
    queryFn: async (): Promise<DocumentsResponse> => {
      const params = new URLSearchParams()
      
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`/api/documents?${params}`)
      
      if (!response.ok) {
        // Handle authentication redirects or HTML responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          // If we get HTML instead of JSON, user is probably not authenticated
          throw new Error('Authentication required')
        }
        
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch documents')
        } catch (jsonError) {
          // If JSON parsing fails, throw a generic error
          throw new Error('Failed to fetch documents')
        }
      }
      
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  const invalidateDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }

  return {
    ...query,
    documents: query.data?.documents || [],
    pagination: query.data?.pagination,
    invalidateDocuments,
  }
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async (): Promise<DocumentWithVersion> => {
      const response = await fetch(`/api/documents/${documentId}`)
      
      if (!response.ok) {
        // Handle authentication redirects or HTML responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Authentication required')
        }
        
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch document')
        } catch (jsonError) {
          throw new Error('Failed to fetch document')
        }
      }
      
      return response.json()
    },
    enabled: !!documentId,
  })
}

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async (): Promise<DocumentVersion[]> => {
      const response = await fetch(`/api/documents/${documentId}/versions`)
      
      if (!response.ok) {
        // Handle authentication redirects or HTML responses
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Authentication required')
        }
        
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch document versions')
        } catch (jsonError) {
          throw new Error('Failed to fetch document versions')
        }
      }
      
      return response.json()
    },
    enabled: !!documentId,
  })
}

export function useDocumentMutations() {
  const queryClient = useQueryClient()

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Authentication required')
        }
        
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete document')
        } catch (jsonError) {
          throw new Error('Failed to delete document')
        }
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const updateDocument = useMutation({
    mutationFn: async ({ 
      documentId, 
      updates 
    }: { 
      documentId: string
      updates: {
        title?: string
        description?: string
        category?: string
        tags?: string[]
      }
    }) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Authentication required')
        }
        
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update document')
        } catch (jsonError) {
          throw new Error('Failed to update document')
        }
      }
      
      return response.json()
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    },
  })

  return {
    deleteDocument,
    updateDocument,
  }
}