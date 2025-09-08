import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params
    
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client for database operations
    const adminClient = createAdminClient()

    // Call the promote function
    const { data: result, error: promoteError } = await adminClient
      .rpc('promote_version_to_production', {
        p_document_id: id,
        p_version_id: versionId,
        p_user_id: user.id
      })

    if (promoteError) {
      console.error('Error promoting version:', promoteError)
      return NextResponse.json(
        { error: 'Failed to promote version to production' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Version promoted to production successfully',
      data: result
    })

  } catch (error) {
    console.error('Error in promote version:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}