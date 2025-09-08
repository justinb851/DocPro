'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus, Minus, FileText, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ComparisonStats {
  linesAdded: number
  linesRemoved: number
  totalLineChanges: number
  wordsAdded: number
  wordsRemoved: number
  totalWordChanges: number
}

interface VersionComparisonReportProps {
  documentId: string
  documentTitle: string
  previousVersion: number
  newVersion: number
  changeSummary?: string
  comparison?: {
    stats: ComparisonStats
    changes?: any[]
  }
  onClose?: () => void
}

export function VersionComparisonReport({
  documentId,
  documentTitle,
  previousVersion,
  newVersion,
  changeSummary,
  comparison,
  onClose
}: VersionComparisonReportProps) {
  const router = useRouter()

  const handleViewDocument = () => {
    router.push(`/documents/${documentId}`)
  }

  const handleViewVersions = () => {
    router.push(`/documents/${documentId}/versions`)
  }

  const handleViewComparison = () => {
    router.push(`/documents/${documentId}/versions?compare=${previousVersion},${newVersion}`)
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Version {newVersion} Uploaded Successfully!</h2>
        <p className="text-muted-foreground">
          Your changes have been saved to "{documentTitle}"
        </p>
      </div>

      {/* Change Summary */}
      {changeSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{changeSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Comparison Report */}
      {comparison && comparison.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Changes from Version {previousVersion} → {newVersion}</CardTitle>
            <CardDescription>
              Analysis of modifications between versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* Lines Changed */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Lines Changed</div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">{comparison.stats.totalLineChanges}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {comparison.stats.linesAdded > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      <Plus className="h-3 w-3 mr-1" />
                      {comparison.stats.linesAdded} added
                    </Badge>
                  )}
                  {comparison.stats.linesRemoved > 0 && (
                    <Badge variant="default" className="bg-red-500">
                      <Minus className="h-3 w-3 mr-1" />
                      {comparison.stats.linesRemoved} removed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Words Changed */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Words Changed</div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">{comparison.stats.totalWordChanges}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {comparison.stats.wordsAdded > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      <Plus className="h-3 w-3 mr-1" />
                      {comparison.stats.wordsAdded}
                    </Badge>
                  )}
                  {comparison.stats.wordsRemoved > 0 && (
                    <Badge variant="default" className="bg-red-500">
                      <Minus className="h-3 w-3 mr-1" />
                      {comparison.stats.wordsRemoved}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Change Indicator */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Change Type</div>
                <div className="flex items-center gap-2">
                  {comparison.stats.totalWordChanges > 50 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold text-orange-500">Major Update</span>
                    </>
                  ) : comparison.stats.totalWordChanges > 10 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-500">Moderate Update</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-500">Minor Update</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Change Preview */}
            {comparison.changes && comparison.changes.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Change Preview</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comparison.changes.slice(0, 5).map((change: any, index: number) => (
                    <div key={index} className="text-xs">
                      {change.added && (
                        <div className="bg-green-50 text-green-700 p-2 rounded">
                          + {change.value.substring(0, 100)}
                          {change.value.length > 100 && '...'}
                        </div>
                      )}
                      {change.removed && (
                        <div className="bg-red-50 text-red-700 p-2 rounded">
                          - {change.value.substring(0, 100)}
                          {change.value.length > 100 && '...'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {comparison.changes.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    And {comparison.changes.length - 5} more changes...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Changes */}
      {comparison && comparison.stats && comparison.stats.totalWordChanges === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-700">
              No changes detected between version {previousVersion} and version {newVersion}.
              The uploaded file appears to be identical to the previous version.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button onClick={handleViewDocument}>
          <FileText className="h-4 w-4 mr-2" />
          View Document
        </Button>
        <Button variant="outline" onClick={handleViewComparison}>
          <Eye className="h-4 w-4 mr-2" />
          View Full Comparison
        </Button>
        <Button variant="outline" onClick={handleViewVersions}>
          View All Versions
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

export default VersionComparisonReport