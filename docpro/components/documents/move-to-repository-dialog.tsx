'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useRepositories } from '@/hooks/use-repositories'

const moveSchema = z.object({
  repositoryId: z.string().min(1, 'Please select a repository'),
})

type MoveForm = z.infer<typeof moveSchema>

interface MoveToRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  onSuccess: () => void
}

export function MoveToRepositoryDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  onSuccess,
}: MoveToRepositoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { repositories, isLoading } = useRepositories()

  const form = useForm<MoveForm>({
    resolver: zodResolver(moveSchema),
    defaultValues: {
      repositoryId: '',
    },
  })

  const onSubmit = async (data: MoveForm) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/documents/${documentId}/move-to-repository`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: data.repositoryId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move document')
      }

      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error moving document:', error)
      // You might want to show a toast or error message here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Document to Repository</DialogTitle>
          <DialogDescription>
            Move "{documentTitle}" to a repository to organize it better.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="repositoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Repository</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a repository..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="ml-2 text-sm">Loading repositories...</span>
                          </div>
                        ) : repositories.length > 0 ? (
                          repositories.map((repository) => (
                            <SelectItem key={repository.id} value={repository.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{repository.name}</span>
                                {repository.category && (
                                  <span className="text-xs text-gray-500">{repository.category}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No repositories found. Create a repository first.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || repositories.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  'Move to Repository'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}