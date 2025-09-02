export interface Organization {
  id: string
  name: string
  subscription_tier: 'trial' | 'starter' | 'professional' | 'enterprise'
  subscription_status: 'active' | 'inactive' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  org_id: string
  title: string
  description?: string
  category?: string
  tags?: string[]
  current_version_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  content_markdown: string
  content_html?: string
  change_summary?: string
  author_id: string
  created_at: string
}

export interface Proposal {
  id: string
  document_id: string
  title: string
  description?: string
  from_version_id?: string
  proposed_content: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'merged'
  created_by: string
  created_at: string
  updated_at: string
}

export interface Approval {
  id: string
  proposal_id: string
  reviewer_id: string
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  comments?: string
  reviewed_at?: string
  created_at: string
}

export interface Comment {
  id: string
  proposal_id?: string
  document_id?: string
  user_id: string
  content: string
  parent_id?: string
  created_at: string
  updated_at: string
  user?: User
}

export interface DocumentEmbedding {
  id: string
  document_id: string
  version_id: string
  chunk_index: number
  chunk_text: string
  embedding?: number[]
  metadata?: Record<string, any>
  created_at: string
}