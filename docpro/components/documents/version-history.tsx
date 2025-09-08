'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, GitBranch, Clock, User, FileText, RotateCcw, Star, CheckCircle2, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DiffViewer from './diff-viewer'
import type { DocumentVersion } from '@/types'

interface VersionHistoryProps {
  documentId: string
  currentVersionId?: string
}

interface ComparisonData {
  fromVersion: {
    id: string
    version_number: number
    change_summary: string
    created_at: string
  }
  toVersion: {
    id: string
    version_number: number
    change_summary: string
    created_at: string
  }
  document: {
    id: string
    title: string
  }
  changes: any[]
  stats: {
    additions: number
    deletions: number
    totalChanges: number
  }
  diffType: string
}

export function VersionHistory({ documentId, currentVersionId }: VersionHistoryProps) {
  const [compareFrom, setCompareFrom] = useState<string | null>(null)
  const [compareTo, setCompareTo] = useState<string | null>(null)
  const [diffType, setDiffType] = useState<'lines' | 'words'>('lines')

  // Fetch version history
  const { data: versions, isLoading: versionsLoading, error: versionsError } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async (): Promise<DocumentVersion[]> => {
      const response = await fetch(`/api/documents/${documentId}/versions`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch versions')
      }
      
      return response.json()
    },
    enabled: !!documentId,
  })

  // Fetch comparison data
  const { data: comparison, isLoading: comparisonLoading, error: comparisonError } = useQuery({
    queryKey: ['version-comparison', documentId, compareFrom, compareTo, diffType],
    queryFn: async (): Promise<ComparisonData> => {
      const response = await fetch(
        `/api/documents/${documentId}/versions/compare?from=${compareFrom}&to=${compareTo}&type=${diffType}`
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to compare versions')
      }
      
      return response.json()
    },
    enabled: !!(compareFrom && compareTo && compareFrom !== compareTo),
  })

  const handleVersionSelect = (versionId: string, position: 'from' | 'to') => {
    if (position === 'from') {
      setCompareFrom(versionId)
    } else {
      setCompareTo(versionId)
    }
  }

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version? This will create a new version with the old content.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/documents/${documentId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to rollback')
      }
      
      // Refresh the page to show the new version
      window.location.reload()
      
    } catch (error) {
      console.error('Rollback failed:', error)
      alert(`Failed to rollback: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handlePromoteToProduction = async (versionId: string) => {
    if (!confirm('Are you sure you want to promote this version to production? This will make it the official published version.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/promote`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to promote version')
      }
      
      // Refresh the page to show updated status
      window.location.reload()
      
    } catch (error) {
      console.error('Promote failed:', error)
      alert(`Failed to promote version: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const compareWithProduction = (versionId: string) => {
    const productionVersion = versions?.find(v => v.status === 'production')
    if (productionVersion && productionVersion.id !== versionId) {
      setCompareFrom(productionVersion.id)
      setCompareTo(versionId)
    }
  }

  if (versionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (versionsError || !versions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load version history</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Version Comparison Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Compare Versions
          </CardTitle>
          <CardDescription>
            Select two versions to see the differences between them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Version</label>
              <Select value={compareFrom || ''} onValueChange={(value) => handleVersionSelect(value, 'from')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.version_number} - {formatDate(version.created_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">To Version</label>
              <Select value={compareTo || ''} onValueChange={(value) => handleVersionSelect(value, 'to')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.version_number} - {formatDate(version.created_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Diff Type</label>
              <Select value={diffType} onValueChange={(value: 'lines' | 'words') => setDiffType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lines">Lines</SelectItem>
                  <SelectItem value="words">Words</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff Viewer */}
      {comparison && !comparisonLoading && (
        <Card>
          <CardHeader>
            <CardTitle>
              Comparing v{comparison.fromVersion.version_number} → v{comparison.toVersion.version_number}
            </CardTitle>
            <CardDescription>
              {comparison.stats.additions + comparison.stats.deletions} changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DiffViewer 
              changes={comparison.changes} 
              diffType={diffType}
            />
          </CardContent>
        </Card>
      )}

      {comparisonLoading && compareFrom && compareTo && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-2">Generating diff...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={version.id === currentVersionId ? 'default' : 'secondary'}>
                      v{version.version_number}
                    </Badge>
                    {version.id === currentVersionId && (
                      <Badge variant="outline">Current</Badge>
                    )}
                    {version.status === 'production' && (
                      <Badge className="bg-green-500">
                        <Star className="h-3 w-3 mr-1" />
                        Production
                      </Badge>
                    )}
                    {version.status === 'archived' && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(version.created_at)}
                    </div>
                    {/* TODO: Add author name when user info is available */}
                  </div>
                  
                  {version.change_summary && (
                    <p className="text-sm mt-2">{version.change_summary}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVersionSelect(version.id, compareFrom ? 'to' : 'from')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                  
                  {version.status === 'draft' && versions?.some(v => v.status === 'production') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => compareWithProduction(version.id)}
                      className="bg-blue-50 border-blue-200 hover:bg-blue-100"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      vs Production
                    </Button>
                  )}
                  
                  {version.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePromoteToProduction(version.id)}
                      className="bg-green-50 border-green-200 hover:bg-green-100"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Promote
                    </Button>
                  )}
                  
                  {version.id !== currentVersionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(version.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Rollback
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VersionHistory