import useSWR from 'swr'
import type { Repository } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  
  // Handle both success and migration-needed cases
  const data = await res.json()
  
  if (!res.ok) {
    console.error('Failed to fetch repositories:', res.status, res.statusText)
    
    // Check if it's a migration error with useful data
    if (data.needsMigration || data.migrationSQL) {
      console.warn('Repositories table migration needed:', data.message)
      console.log('Migration SQL:', data.migrationSQL)
      return {
        repositories: [],
        needsMigration: true,
        migrationMessage: data.message || 'Database migration required',
        migrationSQL: data.migrationSQL
      }
    }
    
    // For other errors, throw
    throw new Error(data.error || 'Failed to fetch repositories')
  }
  
  // Check if migration is needed in success response
  if (data.needsMigration) {
    console.warn('Repositories table migration needed:', data.message)
    console.log('Migration SQL:', data.migrationSQL)
    return {
      repositories: data.repositories || [],
      needsMigration: true,
      migrationMessage: data.message,
      migrationSQL: data.migrationSQL
    }
  }
  
  return { repositories: data.repositories || [], needsMigration: false }
}

export function useRepositories() {
  const { data, error, mutate } = useSWR('/api/repositories', fetcher)

  return {
    repositories: data?.repositories || [],
    needsMigration: data?.needsMigration || false,
    migrationMessage: data?.migrationMessage,
    migrationSQL: data?.migrationSQL,
    isLoading: !error && !data,
    error,
    mutate
  }
}