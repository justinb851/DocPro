import useSWR from 'swr'
import type { Document, DocumentVersion } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch repository documents')
  const data = await res.json()
  return data.documents
}

export function useRepositoryDocuments(repositoryId: string) {
  const { data, error, mutate } = useSWR<(Document & { current_version?: DocumentVersion })[]>(
    repositoryId ? `/api/repositories/${repositoryId}/documents` : null,
    fetcher
  )

  return {
    documents: data,
    isLoading: !error && !data && repositoryId,
    error,
    mutate
  }
}