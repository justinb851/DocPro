'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { User, LogOut, Settings } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserMenuProps {
  user: SupabaseUser
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        <span className="text-sm">{user.email}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover border">
          <div className="py-1">
            <button
              onClick={() => router.push('/settings')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}