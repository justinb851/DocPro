import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  createRepository, 
  getRepositoriesByOrganization 
} from '@/lib/db/repositories'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/repositories called')
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check:', { user: user?.id, error: authError?.message })
    
    if (authError || !user) {
      console.log('Returning 401 - unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization using admin client to bypass RLS
    console.log('Fetching user org...')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    console.log('User data result:', { userData, error: userError })

    if (!userData?.org_id) {
      console.log('Returning 404 - user not found')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Fetching repositories for org:', userData.org_id)
    
    // Test if repositories table exists using admin client to avoid RLS issues
    const { data: testData, error: testError } = await adminSupabase
      .from('repositories')
      .select('id')
      .limit(1)
    
    console.log('Direct repositories table test:', { testData, testError })
    
    if (testError) {
      console.log('Repositories table error:', testError)
      
      // If the table doesn't exist, return empty array for now
      if (testError.code === 'PGRST205' || testError.code === '42P01' || testError.message?.includes('does not exist') || testError.message?.includes('schema cache')) {
        console.log('Repositories table does not exist, returning migration info')
        return NextResponse.json({ 
          repositories: [],
          needsMigration: true,
          message: 'Repositories table does not exist. Please run the database migration.',
          migrationSQL: `
-- Run this SQL in your Supabase SQL Editor:

CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_repositories_org_id ON repositories(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_repository_id ON documents(repository_id);

-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view repositories in same org" ON repositories
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert repositories in same org" ON repositories
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update repositories in same org" ON repositories
  FOR UPDATE USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
          `
        })
      }
      
      return NextResponse.json({ 
        error: 'Database error', 
        details: testError.message 
      }, { status: 500 })
    }

    const repositories = await getRepositoriesByOrganization(userData.org_id)
    console.log('Repositories fetched:', repositories)
    
    return NextResponse.json({ repositories })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repositories: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { name, description, category } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const repository = await createRepository({
      name,
      description,
      category,
      orgId: userData.org_id,
      createdBy: user.id,
    })

    return NextResponse.json({ repository }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating repository:', error)
    
    if (error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A repository with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 }
    )
  }
}