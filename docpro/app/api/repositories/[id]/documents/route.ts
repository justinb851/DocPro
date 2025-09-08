import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDocumentsByRepository } from '@/lib/db/documents'
import { getRepositoryById } from '@/lib/db/repositories'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization using admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    
    const { data: userData } = await adminSupabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify repository exists and belongs to user's org
    const resolvedParams = await params
    const repository = await getRepositoryById(resolvedParams.id, userData.org_id)
    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    const documents = await getDocumentsByRepository(resolvedParams.id, userData.org_id)
    
    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error fetching documents by repository:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}