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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const repositorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  category: z.string().optional(),
})

type RepositoryForm = z.infer<typeof repositorySchema>

interface CreateRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const REPOSITORY_CATEGORIES = [
  { value: 'by-laws', label: 'By-Laws' },
  { value: 'policies', label: 'Policies' },
  { value: 'procedures', label: 'Procedures' },
  { value: 'sops', label: 'Standard Operating Procedures' },
  { value: 'training', label: 'Training Materials' },
  { value: 'forms', label: 'Forms & Templates' },
  { value: 'reports', label: 'Reports' },
  { value: 'other', label: 'Other' },
]

export function CreateRepositoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRepositoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RepositoryForm>({
    resolver: zodResolver(repositorySchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
    },
  })

  const onSubmit = async (data: RepositoryForm) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create repository')
      }

      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error creating repository:', error)
      // You might want to show a toast or error message here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Repository</DialogTitle>
          <DialogDescription>
            Create a new repository to organize your documents
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., By-Laws, Policies, Procedures" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A clear name for your document repository
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPOSITORY_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Choose a category to help organize your repositories
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description of this repository..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide more context about what documents will be stored here
                  </FormDescription>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Repository'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}