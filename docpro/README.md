# DocPro - Document Management for Public Safety

DocPro transforms how public safety organizations manage critical documents through AI-enabled collaboration and structured change management workflows.

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your Supabase and API keys in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `ANTHROPIC_API_KEY`: Your Claude API key

3. **Run database migrations**
   ```bash
   # Use Supabase CLI or run the migration in your Supabase dashboard
   # File: supabase/migrations/001_initial_schema.sql
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features

- **Multi-Format Support**: Upload Word, PDF, Google Docs, Markdown
- **Document Conversion**: Automatic conversion to markdown for version control
- **AI-Powered Search**: Natural language queries powered by Claude
- **Collaborative Editing**: Real-time collaboration across different formats
- **Approval Workflows**: Structured review and approval processes
- **Version Control**: Complete audit trails and change history
- **User Management**: Role-based access control

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Anthropic Claude API
- **Document Processing**: mammoth.js, pdf-parse, marked, turndown
- **Deployment**: Vercel

## Project Structure

```
docpro/
├── app/                  # Next.js app directory
├── components/          # React components
├── lib/                 # Core libraries
│   ├── converters/      # Document conversion
│   ├── supabase/        # Database config
│   └── utils/           # Utilities
├── types/               # TypeScript types
└── supabase/            # Database migrations
```

## Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

### Database Schema
The complete database schema is in `supabase/migrations/001_initial_schema.sql` including:
- Organizations and users
- Documents and versions
- Proposals and approvals
- Comments and embeddings
- Row-level security policies

## Contributing

1. Follow the implementation plan in `IMPLEMENTATION_PLAN.md`
2. Use the PRD in `PRD.md` for feature requirements
3. Submit pull requests with clear descriptions

## License

Built for public safety organizations. All rights reserved.
