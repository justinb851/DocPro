-- Fix RLS infinite recursion issue
-- Drop existing problematic policies first

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view users in same org" ON users;
DROP POLICY IF EXISTS "Users can view documents in same org" ON documents;
DROP POLICY IF EXISTS "Users can insert documents in same org" ON documents;
DROP POLICY IF EXISTS "Users can update documents in same org" ON documents;
DROP POLICY IF EXISTS "Users can view document versions in same org" ON document_versions;
DROP POLICY IF EXISTS "Users can insert document versions in same org" ON document_versions;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can insert own user record" ON users;
DROP POLICY IF EXISTS "Users can update own user record" ON users;

-- Create new non-recursive policies

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.org_id = organizations.id 
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users policies (simplified to avoid recursion)
CREATE POLICY "Users can view own record" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can view users in same org simplified" ON users
  FOR SELECT 
  USING (
    org_id = (
      SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can insert own record" ON users
  FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE 
  USING (id = auth.uid());

-- Documents policies (using direct org_id check)
CREATE POLICY "Users can view documents in their org" ON documents
  FOR SELECT 
  USING (
    org_id = (
      SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can insert documents in their org" ON documents
  FOR INSERT 
  WITH CHECK (
    org_id = (
      SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "Users can update documents in their org" ON documents
  FOR UPDATE 
  USING (
    org_id = (
      SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- Document versions policies
CREATE POLICY "Users can view document versions in their org" ON document_versions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_versions.document_id 
      AND documents.org_id = (
        SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can insert document versions in their org" ON document_versions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_versions.document_id 
      AND documents.org_id = (
        SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- Proposals, approvals, comments policies remain the same but simplified
DROP POLICY IF EXISTS "Users can view proposals in same org" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals in same org" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;

CREATE POLICY "Users can view proposals in their org" ON proposals
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = proposals.document_id 
      AND documents.org_id = (
        SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can create proposals in their org" ON proposals
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = proposals.document_id 
      AND documents.org_id = (
        SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can update their proposals" ON proposals
  FOR UPDATE 
  USING (created_by = auth.uid());