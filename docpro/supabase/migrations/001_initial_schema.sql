-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(50) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  current_version_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  change_summary TEXT,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- Proposals table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  from_version_id UUID REFERENCES document_versions(id),
  proposed_content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals table
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document embeddings table for AI search
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  chunk_text TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for current_version_id
ALTER TABLE documents 
  ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) 
  REFERENCES document_versions(id);

-- Create indexes for performance
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_proposals_document_id ON proposals(document_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_approvals_proposal_id ON approvals(proposal_id);
CREATE INDEX idx_comments_proposal_id ON comments(proposal_id);
CREATE INDEX idx_comments_document_id ON comments(document_id);
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX idx_document_embeddings_embedding ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vector search function
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 10,
  org_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  document_id UUID,
  version_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.document_id,
    de.version_id,
    de.chunk_text,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE (org_id_filter IS NULL OR d.org_id = org_id_filter)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see data from their organization)
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view users in same org" ON users
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view documents in same org" ON documents
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert documents in same org" ON documents
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update documents in same org" ON documents
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view document versions in same org" ON document_versions
  FOR SELECT USING (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert document versions in same org" ON document_versions
  FOR INSERT WITH CHECK (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can view proposals in same org" ON proposals
  FOR SELECT USING (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create proposals in same org" ON proposals
  FOR INSERT WITH CHECK (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update own proposals" ON proposals
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can view approvals in same org" ON approvals
  FOR SELECT USING (proposal_id IN (
    SELECT id FROM proposals WHERE document_id IN (
      SELECT id FROM documents WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Reviewers can manage approvals" ON approvals
  FOR ALL USING (reviewer_id = auth.uid());

CREATE POLICY "Users can view comments in same org" ON comments
  FOR SELECT USING (
    (document_id IN (
      SELECT id FROM documents WHERE org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      )
    )) OR 
    (proposal_id IN (
      SELECT id FROM proposals WHERE document_id IN (
        SELECT id FROM documents WHERE org_id IN (
          SELECT org_id FROM users WHERE id = auth.uid()
        )
      )
    ))
  );

CREATE POLICY "Users can create comments in same org" ON comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view embeddings in same org" ON document_embeddings
  FOR SELECT USING (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  ));