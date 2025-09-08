'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, FolderOpen, Settings, Archive } from 'lucide-react'
import { useRepositories } from '@/hooks/use-repositories'
import { CreateRepositoryDialog } from '@/components/repositories/create-repository-dialog'
import { formatDistanceToNow } from 'date-fns'

export default function RepositoriesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { repositories, isLoading, error, needsMigration, migrationMessage, migrationSQL, mutate } = useRepositories()
  const router = useRouter()

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load repositories</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-2">
            Organize your documents into repositories for better management
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Repository
        </Button>
      </div>

      {needsMigration && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600">⚠️</div>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Database Migration Required</h3>
                <p className="text-yellow-700 mb-3">{migrationMessage}</p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-yellow-600 font-medium">Show SQL Migration</summary>
                  <pre className="mt-2 p-3 bg-yellow-100 rounded text-xs overflow-x-auto">
                    {migrationSQL}
                  </pre>
                </details>
                <p className="text-xs text-yellow-600 mt-2">
                  Copy the SQL above and run it in your Supabase SQL Editor, then refresh this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-3 text-gray-600">Loading repositories...</span>
        </div>
      ) : repositories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No repositories yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-6">
              Create your first repository to start organizing your documents. 
              Repositories help you group related documents like policies, procedures, or by-laws.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Repository
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repository) => (
            <Card 
              key={repository.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/repositories/${repository.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{repository.name}</CardTitle>
                    {repository.category && (
                      <Badge variant="outline" className="mt-2">
                        {repository.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement settings
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {repository.description && (
                  <CardDescription className="mt-2">
                    {repository.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Created {formatDistanceToNow(new Date(repository.created_at))} ago
                  </span>
                  <span className="text-green-600">
                    {repository.status === 'active' ? 'Active' : 'Archived'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRepositoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          mutate()
          setShowCreateDialog(false)
        }}
      />
    </div>
  )
}