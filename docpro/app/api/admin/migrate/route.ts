import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()
    
    console.log('Starting migration...')
    
    // First, let's just try to create a simple repositories table without foreign keys
    console.log('Creating repositories table...')
    const { data: createResult, error: createError } = await supabase
      .from('repositories')
      .select('id')
      .limit(1)
    
    if (createError && createError.code === '42P01') {
      // Table doesn't exist, that's expected
      console.log('Repositories table does not exist, need to create it manually via Supabase dashboard')
      return NextResponse.json({ 
        error: 'Please create the repositories table manually via Supabase SQL Editor',
        sql: `
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

-- Add columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS production_version_id UUID REFERENCES document_versions(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_repositories_org_id ON repositories(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_repository_id ON documents(repository_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view repositories in same org" ON repositories
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert repositories in same org" ON repositories
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update repositories in same org" ON repositories
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));
        `
      }, { status: 400 })
    }
    
    console.log('Repositories table exists!')
    return NextResponse.json({ success: true, message: 'Migration not needed - tables exist' })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed: ' + error.message }, { status: 500 })
  }
}