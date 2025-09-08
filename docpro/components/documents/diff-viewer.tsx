'use client'

import React from 'react'
import { Change } from 'diff'
import { cn } from '@/lib/utils'

interface DiffViewerProps {
  changes: Change[]
  diffType: 'lines' | 'words'
  className?: string
}

interface DiffStats {
  additions: number
  deletions: number
  totalChanges: number
}

export function DiffViewer({ changes, diffType, className }: DiffViewerProps) {
  const stats: DiffStats = {
    additions: changes.filter(c => c.added).reduce((sum, c) => sum + (c.count || 0), 0),
    deletions: changes.filter(c => c.removed).reduce((sum, c) => sum + (c.count || 0), 0),
    totalChanges: changes.filter(c => c.added || c.removed).length
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Stats Header */}
      <div className="bg-muted px-4 py-3 border-b">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-green-700 dark:text-green-400">
              +{stats.additions} {diffType === 'lines' ? 'lines' : 'words'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-red-700 dark:text-red-400">
              -{stats.deletions} {diffType === 'lines' ? 'lines' : 'words'}
            </span>
          </div>
          <div className="text-muted-foreground">
            {stats.totalChanges} changes
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-96 overflow-y-auto">
        {diffType === 'lines' ? (
          <LinesDiffView changes={changes} />
        ) : (
          <WordsDiffView changes={changes} />
        )}
      </div>
    </div>
  )
}

function LinesDiffView({ changes }: { changes: Change[] }) {
  let lineNumber = 1

  return (
    <div className="font-mono text-sm">
      {changes.map((change, index) => {
        const lines = change.value.split('\n')
        
        return lines.map((line, lineIndex) => {
          // Skip empty last line from split
          if (lineIndex === lines.length - 1 && line === '') return null
          
          const currentLineNumber = lineNumber++
          const isAdded = change.added
          const isRemoved = change.removed
          const isUnchanged = !isAdded && !isRemoved

          return (
            <div
              key={`${index}-${lineIndex}`}
              className={cn(
                'flex',
                {
                  'bg-green-50 dark:bg-green-900/20': isAdded,
                  'bg-red-50 dark:bg-red-900/20': isRemoved,
                  'bg-background': isUnchanged
                }
              )}
            >
              <div
                className={cn(
                  'w-12 px-2 py-1 text-right text-muted-foreground border-r select-none',
                  {
                    'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400': isAdded,
                    'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400': isRemoved
                  }
                )}
              >
                {isRemoved ? '' : currentLineNumber}
              </div>
              <div
                className={cn(
                  'w-6 flex items-center justify-center border-r',
                  {
                    'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400': isAdded,
                    'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400': isRemoved
                  }
                )}
              >
                {isAdded ? '+' : isRemoved ? '-' : ''}
              </div>
              <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                {line || ' '}
              </div>
            </div>
          )
        })
      })}
    </div>
  )
}

function WordsDiffView({ changes }: { changes: Change[] }) {
  return (
    <div className="p-4">
      <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
        {changes.map((change, index) => {
          if (change.added) {
            return (
              <span
                key={index}
                className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1 rounded"
              >
                {change.value}
              </span>
            )
          } else if (change.removed) {
            return (
              <span
                key={index}
                className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-1 rounded line-through"
              >
                {change.value}
              </span>
            )
          } else {
            return <span key={index}>{change.value}</span>
          }
        })}
      </div>
    </div>
  )
}

export default DiffViewer