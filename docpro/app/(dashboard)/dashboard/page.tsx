import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, GitBranch, Users, TrendingUp, FolderOpen, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // In a real app, these would be fetched from the database
  const stats = {
    totalRepositories: 0,
    totalDocuments: 0,
    activeProposals: 0,
    teamMembers: 1,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Welcome back!</h2>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your document management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Repositories</p>
              <p className="text-2xl font-bold">{stats.totalRepositories}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold">{stats.totalDocuments}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Proposals</p>
              <p className="text-2xl font-bold">{stats.activeProposals}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{stats.teamMembers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recent Activity</p>
              <p className="text-2xl font-bold">{stats.recentActivity}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/repositories">
              <div className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Browse Repositories</p>
                    <p className="text-sm text-muted-foreground">
                      View and manage document repositories
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <div className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Create Repository</p>
                  <p className="text-sm text-muted-foreground">
                    Create a new repository for organizing documents
                  </p>
                </div>
              </div>
            </div>
            <div className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Review Proposals</p>
                  <p className="text-sm text-muted-foreground">
                    Review and approve document changes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Documents</h3>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No documents yet</p>
            <p className="text-sm mt-1">Upload your first document to get started</p>
          </div>
        </Card>
      </div>
    </div>
  )
}