'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, MoreVertical, Calendar, User } from 'lucide-react'
import type { Document, DocumentVersion } from '@/types'

interface DocumentWithVersion extends Document {
  current_version?: DocumentVersion
  versions_count?: number
}

interface DocumentCardProps {
  document: DocumentWithVersion
}

export function DocumentCard({ document }: DocumentCardProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    // TODO: Implement download functionality
    console.log('Download document:', document.id)
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">
                <Link 
                  href={`/documents/${document.id}`}
                  className="hover:underline"
                >
                  {document.title}
                </Link>
              </CardTitle>
              {document.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {document.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Tags and Category */}
          <div className="flex flex-wrap gap-2">
            {document.category && (
              <Badge variant="secondary" className="text-xs">
                {document.category}
              </Badge>
            )}
            {document.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(document.tags?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(document.tags?.length || 0) - 3} more
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(document.updated_at)}</span>
              </div>
              {document.versions_count && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{document.versions_count} version{document.versions_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/documents/${document.id}`}>
                View
              </Link>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}