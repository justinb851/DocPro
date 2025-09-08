'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, GitBranch, MessageSquare, Bot, Settings, FolderOpen } from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: FileText,
  },
  {
    title: 'Repositories',
    href: '/repositories',
    icon: FolderOpen,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Proposals',
    href: '/proposals',
    icon: GitBranch,
  },
  {
    title: 'AI Chat',
    href: '/ai-chat',
    icon: Bot,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              pathname === item.href
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}