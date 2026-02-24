import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { getDepartments } from '@/lib/api/departments'
import Link from 'next/link'
import DepartmentManager from '@/components/departments/DepartmentManager'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  console.log('===> DB Profile Fetch:', { userId: user.id, profile, profileError })

  // Fetch departments from database
  const departments = await getDepartments()

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* Navbar segment */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">K</div>
          <h1 className="font-semibold text-slate-800">Production Workspaces</h1>
        </div>

        <div className="flex items-center gap-4">
          {profile?.is_admin && (
            <Link href="/admin/users">
              <Button variant="outline" size="sm" className="h-8 text-sm text-indigo-900 px-3 bg-amber-200 hover:bg-amber-300 border-none rounded-md font-medium shadow-sm cursor-pointer">
                Admin Panel
              </Button>
            </Link>
          )}
          <div className="text-sm text-slate-500 hidden sm:block">{user.email}</div>
          <form action={async () => {
            'use server'
            const sb = await createClient()
            await sb.auth.signOut()
            redirect('/login')
          }}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <DepartmentManager initialDepartments={departments} isAdmin={!!profile?.is_admin} />
    </main>
  )
}
