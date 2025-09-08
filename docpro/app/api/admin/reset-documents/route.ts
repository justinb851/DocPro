import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: NextRequest) {
  try {
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

    // First, get the user's organization ID
    const { data: profile } = await adminClient
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    // Delete all document versions for this organization's documents
    const { error: versionsError } = await adminClient
      .from('document_versions')
      .delete()
      .in('document_id', 
        adminClient
          .from('documents')
          .select('id')
          .eq('org_id', profile.org_id)
      )

    if (versionsError) {
      console.error('Error deleting document versions:', versionsError)
      return NextResponse.json(
        { error: 'Failed to delete document versions' },
        { status: 500 }
      )
    }

    // Then delete all documents for this organization
    const { error: documentsError } = await adminClient
      .from('documents')
      .delete()
      .eq('org_id', profile.org_id)

    if (documentsError) {
      console.error('Error deleting documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to delete documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All documents and versions deleted successfully'
    })

  } catch (error) {
    console.error('Error in reset documents:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}