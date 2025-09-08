import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getRepositoryById, 
  updateRepository, 
  archiveRepository,
  getRepositoryWithDocuments
} from '@/lib/db/repositories'

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

    const { searchParams } = new URL(request.url)
    const includeDocuments = searchParams.get('include_documents') === 'true'

    let repository
    if (includeDocuments) {
      repository = await getRepositoryWithDocuments((await params).id, userData.org_id)
    } else {
      repository = await getRepositoryById((await params).id, userData.org_id)
    }

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }
    
    return NextResponse.json({ repository })
  } catch (error) {
    console.error('Error fetching repository:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository' },
      { status: 500 }
    )
  }
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

    const updates = await request.json()
    const { name, description, category } = updates

    const repository = await updateRepository(params.id, userData.org_id, {
      name,
      description,
      category,
    })

    return NextResponse.json({ repository })
  } catch (error: any) {
    console.error('Error updating repository:', error)
    
    if (error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A repository with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    await archiveRepository(params.id, userData.org_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving repository:', error)
    return NextResponse.json(
      { error: 'Failed to archive repository' },
      { status: 500 }
    )
  }
}