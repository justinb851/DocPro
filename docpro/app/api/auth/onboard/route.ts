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
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already onboarded' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { organizationName, fullName } = body

    if (!organizationName || !fullName) {
      return NextResponse.json(
        { error: 'Organization name and full name are required' },
        { status: 400 }
      )
    }

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
      console.error('Error creating organization:', orgError)
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
        role: 'admin', // First user in org is admin
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user record:', userError)
      
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
      organization: organization
    })

  } catch (error) {
    console.error('Error in user onboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}