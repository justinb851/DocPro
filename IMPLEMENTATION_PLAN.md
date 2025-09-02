# DocPro Implementation Plan

## Overview
This document provides a detailed technical implementation plan for building the DocPro MVP in 4 weeks. It includes architecture decisions, setup instructions, daily development tasks, and code organization guidelines.

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x
- **UI Components:** Radix UI primitives
- **State Management:** TanStack Query (React Query)
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage
- **Real-time:** Supabase Realtime subscriptions
- **API:** Next.js API routes + Server Actions

### Document Processing
- **Word → Markdown:** mammoth.js
- **PDF → Text:** pdf-parse
- **Google Docs:** Google Docs API
- **Markdown → HTML:** marked.js
- **HTML → Markdown:** turndown.js
- **Markdown Processing:** remark, rehype

### AI Integration
- **LLM:** Anthropic Claude API
- **Embeddings:** Claude embeddings API
- **Vector Search:** Supabase pgvector extension
- **Rate Limiting:** upstash/ratelimit

### Infrastructure
- **Hosting:** Vercel
- **CDN:** Vercel Edge Network
- **Monitoring:** Vercel Analytics
- **Error Tracking:** Sentry (future)

## Project Structure

```
docpro/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Auth routes group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected routes group
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── proposals/
│   │   ├── settings/
│   │   └── ai-chat/
│   ├── api/                      # API routes
│   │   ├── documents/
│   │   ├── ai/
│   │   ├── webhooks/
│   │   └── auth/
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page
│   └── globals.css
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── documents/                # Document-related components
│   ├── proposals/                # Proposal workflow components
│   ├── ai/                       # AI chat components
│   └── layout/                   # Layout components
├── lib/                          # Core libraries
│   ├── converters/               # Document converters
│   │   ├── word-to-markdown.ts
│   │   ├── pdf-to-markdown.ts
│   │   ├── gdocs-to-markdown.ts
│   │   └── markdown-to-format.ts
│   ├── ai/                       # AI integration
│   │   ├── claude.ts
│   │   ├── embeddings.ts
│   │   └── search.ts
│   ├── db/                       # Database utilities
│   │   ├── supabase.ts
│   │   ├── queries/
│   │   └── mutations/
│   ├── auth/                     # Auth utilities
│   ├── utils/                    # General utilities
│   └── constants/                # App constants
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript types
├── public/                       # Static assets
├── supabase/                     # Supabase config
│   ├── migrations/               # Database migrations
│   ├── functions/                # Edge functions
│   └── seed.sql                  # Seed data
└── tests/                        # Test files
```

## Database Schema

```sql
-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(50) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
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

-- Document Versions
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  change_summary TEXT,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals (for changes)
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

-- Approvals
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
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

-- AI Embeddings
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

-- Create vector similarity search function
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

-- Indexes
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_proposals_document_id ON proposals(document_id);
CREATE INDEX idx_approvals_proposal_id ON approvals(proposal_id);
CREATE INDEX idx_document_embeddings_embedding ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
```

## Week 1: Foundation & Document Processing

### Day 1-2: Project Setup & Authentication
**Goal:** Initialize project with authentication and basic routing

**Tasks:**
1. Initialize Next.js project with TypeScript
2. Configure Tailwind CSS and UI components
3. Set up Supabase project and database
4. Implement authentication flow (login/register)
5. Create protected route middleware
6. Design basic layout components

**Deliverables:**
- Working authentication system
- Protected dashboard route
- Basic navigation structure

### Day 3-4: Document Upload & Storage
**Goal:** Enable multi-format document upload and storage

**Tasks:**
1. Create document upload interface
2. Implement file validation and size limits
3. Set up Supabase Storage buckets
4. Create document metadata database entries
5. Build document listing page
6. Add document preview capability

**Deliverables:**
- Document upload for Word, PDF, Google Docs
- Document listing with metadata
- Basic document viewer

### Day 5-7: Format Conversion Pipeline
**Goal:** Build robust document conversion system

**Tasks:**
1. Implement Word → Markdown converter (mammoth.js)
2. Build PDF → Markdown converter (pdf-parse)
3. Create Google Docs API integration
4. Develop Markdown → Multi-format exporters
5. Add conversion queue system
6. Test with various document formats

**Deliverables:**
- Full conversion pipeline
- Format preservation testing
- Export functionality

## Week 2: Version Control & Collaboration

### Day 8-9: Version Control System
**Goal:** Implement git-like version control for documents

**Tasks:**
1. Create version tracking system
2. Build diff visualization component
3. Implement version comparison view
4. Add rollback functionality
5. Create version history timeline
6. Build change summary generator

**Deliverables:**
- Complete version history
- Visual diff viewer
- Rollback capability

### Day 10-11: Proposal System
**Goal:** Enable collaborative document changes

**Tasks:**
1. Create proposal creation flow
2. Build proposal listing and management
3. Implement change tracking
4. Add proposal comparison view
5. Create merge functionality
6. Build conflict resolution interface

**Deliverables:**
- Proposal creation and management
- Change visualization
- Merge capability

### Day 12-14: Comments & Collaboration
**Goal:** Add real-time collaboration features

**Tasks:**
1. Implement comment system
2. Add inline commenting on proposals
3. Create activity feed
4. Build notification system
5. Add @mentions functionality
6. Implement real-time updates

**Deliverables:**
- Full commenting system
- Real-time collaboration
- Notification system

## Week 3: AI Integration & Workflows

### Day 15-16: AI Document Processing
**Goal:** Integrate Claude for document intelligence

**Tasks:**
1. Set up Claude API integration
2. Implement document chunking strategy
3. Create embedding generation pipeline
4. Set up pgvector for similarity search
5. Build indexing system
6. Test search accuracy

**Deliverables:**
- Document embedding system
- Vector search capability
- Indexed document corpus

### Day 17-18: Conversational AI Interface
**Goal:** Build natural language query interface

**Tasks:**
1. Create AI chat interface component
2. Implement query processing
3. Add context management
4. Build response formatting
5. Add source citations
6. Implement conversation history

**Deliverables:**
- Working AI chat interface
- Natural language queries
- Source attribution

### Day 19-21: Approval Workflows
**Goal:** Implement structured approval processes

**Tasks:**
1. Create approval workflow builder
2. Implement reviewer assignment
3. Build approval interface
4. Add approval notifications
5. Create approval audit trail
6. Implement auto-merge on approval

**Deliverables:**
- Complete approval workflow
- Reviewer management
- Audit trail

## Week 4: Polish & Production

### Day 22-23: UI/UX Polish
**Goal:** Refine user interface for production

**Tasks:**
1. Implement responsive design
2. Add loading states and skeletons
3. Create error boundaries
4. Build onboarding flow
5. Add keyboard shortcuts
6. Optimize for mobile

**Deliverables:**
- Polished UI
- Mobile responsiveness
- Smooth UX

### Day 24-25: Performance & Security
**Goal:** Optimize performance and security

**Tasks:**
1. Implement caching strategies
2. Add rate limiting
3. Optimize database queries
4. Set up security headers
5. Add input sanitization
6. Implement audit logging

**Deliverables:**
- Performance optimization
- Security hardening
- Audit system

### Day 26-27: Testing & Documentation
**Goal:** Ensure quality and maintainability

**Tasks:**
1. Write unit tests for converters
2. Add integration tests for workflows
3. Create API documentation
4. Write user documentation
5. Add error tracking
6. Set up monitoring

**Deliverables:**
- Test coverage
- Documentation
- Monitoring setup

### Day 28: Deployment & Launch
**Goal:** Deploy to production

**Tasks:**
1. Set up Vercel deployment
2. Configure production database
3. Set up domain and SSL
4. Configure email service
5. Final testing
6. Launch preparation

**Deliverables:**
- Production deployment
- Live application
- Launch readiness

## Development Guidelines

### Code Standards
```typescript
// Use TypeScript strict mode
// Follow ESLint and Prettier configs
// Write self-documenting code
// Add JSDoc comments for complex functions
// Use meaningful variable names
// Keep functions small and focused
```

### Git Workflow
```bash
# Branch naming
feature/document-upload
fix/conversion-error
refactor/ai-pipeline

# Commit messages
feat: add document upload functionality
fix: resolve PDF conversion error
refactor: optimize embedding generation
docs: update API documentation
```

### Testing Strategy
- Unit tests for all converters
- Integration tests for workflows
- E2E tests for critical paths
- Performance testing for AI queries
- Security testing for auth flows

### Performance Targets
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Document upload: <10s for 10MB
- AI query response: <3s
- Search results: <1s

## Environment Variables

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Anthropic Claude
ANTHROPIC_API_KEY=your-claude-api-key

# Google APIs
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Stripe (future)
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Email (future)
RESEND_API_KEY=your-resend-key
```

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Development
npm run dev

# Build
npm run build

# Test
npm run test
npm run test:e2e

# Deploy
npm run deploy
```

## Risk Mitigation

### Technical Risks
1. **Format conversion issues**
   - Solution: Extensive testing with real documents
   - Fallback: Manual review queue

2. **AI accuracy concerns**
   - Solution: Confidence thresholds
   - Fallback: Traditional search

3. **Performance at scale**
   - Solution: Caching and optimization
   - Fallback: Queue processing

### Timeline Risks
1. **Feature creep**
   - Solution: Strict MVP scope
   - Fallback: Phase 2 features

2. **Integration delays**
   - Solution: Parallel development
   - Fallback: Mock services

3. **Testing time**
   - Solution: Automated testing
   - Fallback: Beta period extension

## Success Criteria

### Week 1 Success
- [ ] Users can upload and view documents
- [ ] Multiple formats supported
- [ ] Basic authentication working

### Week 2 Success
- [ ] Version control functional
- [ ] Proposals can be created and reviewed
- [ ] Comments and collaboration working

### Week 3 Success
- [ ] AI chat answering queries
- [ ] Search returning relevant results
- [ ] Approval workflows functional

### Week 4 Success
- [ ] Application deployed to production
- [ ] Performance targets met
- [ ] Security measures in place

## Post-Launch Plan

### Week 5-6: Beta Testing
- Onboard 5-10 beta departments
- Gather feedback and iterate
- Fix critical bugs
- Optimize based on usage

### Week 7-8: Marketing Launch
- Public launch announcement
- Content marketing campaign
- Direct sales outreach
- Conference presentations

### Month 2-3: Feature Expansion
- Mobile apps
- Advanced workflows
- Integration APIs
- Analytics dashboard

## Support & Resources

### Documentation
- API Documentation: `/docs/api`
- User Guide: `/docs/user-guide`
- Admin Guide: `/docs/admin`
- Developer Guide: `/docs/developer`

### Community
- GitHub Issues for bug reports
- Discord for community support
- Email support for customers
- Office hours for onboarding

---

*Document Version: 1.0*
*Last Updated: 2025-09-02*
*Status: Ready for Implementation*