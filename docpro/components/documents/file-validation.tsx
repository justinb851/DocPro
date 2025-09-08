'use client'

import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const SUPPORTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document (.docx)',
  'application/pdf': 'PDF Document (.pdf)',
  'text/markdown': 'Markdown (.md)',
  'text/plain': 'Text File (.txt)'
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 10

export function validateFiles(files: File[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check number of files
  if (files.length === 0) {
    errors.push('Please select at least one file to upload')
  }

  if (files.length > MAX_FILES) {
    errors.push(`You can upload a maximum of ${MAX_FILES} files at once`)
  }

  // Check each file
  files.forEach((file, index) => {
    // Check file type
    const isValidType = Object.keys(SUPPORTED_TYPES).includes(file.type) ||
                       file.name.toLowerCase().endsWith('.docx') ||
                       file.name.toLowerCase().endsWith('.pdf') ||
                       file.name.toLowerCase().endsWith('.md') ||
                       file.name.toLowerCase().endsWith('.txt')

    if (!isValidType) {
      errors.push(`File "${file.name}" is not a supported format. Supported formats: Word (.docx), PDF (.pdf), Markdown (.md), Text (.txt)`)
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Check for empty files
    if (file.size === 0) {
      errors.push(`File "${file.name}" is empty`)
    }

    // Warnings for large files
    if (file.size > 10 * 1024 * 1024) { // 10MB
      warnings.push(`File "${file.name}" is quite large (${Math.round(file.size / 1024 / 1024)}MB) and may take longer to process`)
    }
  })

  // Check for duplicate names
  const fileNames = files.map(f => f.name.toLowerCase())
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

interface FileValidationProps {
  validation: ValidationResult
  className?: string
}

export function FileValidation({ validation, className }: FileValidationProps) {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {validation.errors.length > 0 && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <h4 className="text-sm font-medium text-destructive">Upload Errors</h4>
          </div>
          <ul className="space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-xs text-destructive flex items-start gap-1">
                <span className="mt-1">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
          </div>
          <ul className="space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-xs text-yellow-700 flex items-start gap-1">
                <span className="mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface SupportedFormatsProps {
  className?: string
}

export function SupportedFormats({ className }: SupportedFormatsProps) {
  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      <p className="font-medium mb-2">Supported file formats:</p>
      <ul className="space-y-1">
        {Object.entries(SUPPORTED_TYPES).map(([type, description]) => (
          <li key={type} className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{description}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs">
        Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB • Maximum {MAX_FILES} files at once
      </p>
    </div>
  )
}