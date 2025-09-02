import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { UserMenu } from '@/components/layout/user-menu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">DocPro</h1>
          </div>
          <DashboardNav />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}