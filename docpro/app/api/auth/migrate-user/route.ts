import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: existingUser
      })
    }

    // Extract organization name from user metadata if available
    const organizationName = user.user_metadata?.organization_name || 'Default Organization'
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User'

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        subscription_tier: 'trial',
        subscription_status: 'active'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization for migration:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Create user record
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        org_id: organization.id,
        email: user.email,
        full_name: fullName,
        role: 'admin', // Migrated users become admin
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user record for migration:', userError)
      
      // Cleanup: delete the organization if user creation failed
      await supabase.from('organizations').delete().eq('id', organization.id)
      
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: userRecord,
      organization: organization,
      message: 'User migrated successfully'
    })

  } catch (error) {
    console.error('Error in user migration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}