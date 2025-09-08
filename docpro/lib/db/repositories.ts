import { createAdminClient } from '@/lib/supabase/admin'
import type { Repository } from '@/types'

export async function createRepository(data: {
  name: string
  description?: string
  category?: string
  orgId: string
  createdBy: string
}): Promise<Repository> {
  const supabase = createAdminClient()
  
  const { data: repository, error } = await supabase
    .from('repositories')
    .insert({
      name: data.name,
      description: data.description,
      category: data.category,
      org_id: data.orgId,
      created_by: data.createdBy,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating repository:', error)
    throw new Error(`Failed to create repository: ${error.message}`)
  }

  return repository
}

export async function getRepositoriesByOrganization(orgId: string): Promise<Repository[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching repositories:', error)
    throw new Error(`Failed to fetch repositories: ${error.message}`)
  }

  return data || []
}

export async function getRepositoryById(
  repositoryId: string,
  orgId: string
): Promise<Repository | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .eq('org_id', orgId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching repository:', error)
    throw new Error(`Failed to fetch repository: ${error.message}`)
  }

  return data
}

export async function updateRepository(
  repositoryId: string,
  orgId: string,
  updates: {
    name?: string
    description?: string
    category?: string
  }
): Promise<Repository> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('repositories')
    .update(updates)
    .eq('id', repositoryId)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Error updating repository:', error)
    throw new Error(`Failed to update repository: ${error.message}`)
  }

  return data
}

export async function archiveRepository(
  repositoryId: string,
  orgId: string
): Promise<void> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('repositories')
    .update({ status: 'archived' })
    .eq('id', repositoryId)
    .eq('org_id', orgId)

  if (error) {
    console.error('Error archiving repository:', error)
    throw new Error(`Failed to archive repository: ${error.message}`)
  }
}

export async function getRepositoryWithDocuments(
  repositoryId: string,
  orgId: string
): Promise<(Repository & { documents?: any[] }) | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('repositories')
    .select(`
      *,
      documents:documents(*)
    `)
    .eq('id', repositoryId)
    .eq('org_id', orgId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching repository with documents:', error)
    throw new Error(`Failed to fetch repository with documents: ${error.message}`)
  }

  return data
}