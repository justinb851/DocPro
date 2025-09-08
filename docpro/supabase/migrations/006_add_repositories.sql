-- Add repositories table to create repository-document hierarchy
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., "By-Laws", "Policies", "Procedures", "SOPs"
  status VARCHAR(50) DEFAULT 'active', -- active, archived
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name) -- Repository names must be unique within an organization
);

-- Add repository_id to documents table
ALTER TABLE documents ADD COLUMN repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE;

-- Create index for repository queries
CREATE INDEX idx_repositories_org_id ON repositories(org_id);
CREATE INDEX idx_documents_repository_id ON documents(repository_id);

-- Add updated_at trigger for repositories
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for repositories
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- RLS policies for repositories
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

CREATE POLICY "Users can delete repositories in same org" ON repositories
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

-- Update existing document policies to consider repository relationship
DROP POLICY "Users can view documents in same org" ON documents;
DROP POLICY "Users can insert documents in same org" ON documents;
DROP POLICY "Users can update documents in same org" ON documents;

CREATE POLICY "Users can view documents in same org" ON documents
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid()) OR
    repository_id IN (SELECT id FROM repositories WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert documents in same org" ON documents
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid()) OR
    repository_id IN (SELECT id FROM repositories WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update documents in same org" ON documents
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid()) OR
    repository_id IN (SELECT id FROM repositories WHERE org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  );

-- Add document status for production tracking
ALTER TABLE documents ADD COLUMN status VARCHAR(50) DEFAULT 'draft'; -- draft, in_review, approved, production
ALTER TABLE documents ADD COLUMN production_version_id UUID REFERENCES document_versions(id);

-- Create index for document status queries
CREATE INDEX idx_documents_status ON documents(status);