import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDocumentVersions } from '@/lib/db/documents'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: userRecord, error: userError } = await adminClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: 'User not found or not associated with an organization' },
        { status: 400 }
      )
    }

    // Fetch all versions of the document
    const versions = await getDocumentVersions(id, userRecord.org_id)

    return NextResponse.json(versions)

  } catch (error) {
    console.error('Error fetching document versions:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}