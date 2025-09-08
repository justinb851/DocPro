import useSWR from 'swr'
import type { Repository } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch repository')
  const data = await res.json()
  return data.repository
}

export function useRepository(repositoryId: string) {
  const { data, error, mutate } = useSWR<Repository>(
    repositoryId ? `/api/repositories/${repositoryId}` : null,
    fetcher
  )

  return {
    repository: data,
    isLoading: !error && !data && repositoryId,
    error,
    mutate
  }
}