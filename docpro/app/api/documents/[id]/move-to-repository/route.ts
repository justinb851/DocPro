import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params {
  id: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization using admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const { data: userData } = await adminSupabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { repositoryId } = await request.json()

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    // Verify repository exists and belongs to user's org
    const { data: repository } = await adminSupabase
      .from('repositories')
      .select('id')
      .eq('id', repositoryId)
      .eq('org_id', userData.org_id)
      .single()

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Update document to move it to the repository
    const { data: document, error: updateError } = await adminSupabase
      .from('documents')
      .update({ repository_id: repositoryId })
      .eq('id', params.id)
      .eq('org_id', userData.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error moving document to repository:', updateError)
      return NextResponse.json(
        { error: 'Failed to move document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document, message: 'Document moved successfully' })

  } catch (error) {
    console.error('Error moving document:', error)
    return NextResponse.json(
      { error: 'Failed to move document' },
      { status: 500 }
    )
  }
}