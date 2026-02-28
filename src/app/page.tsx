import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import { getDepartments } from '@/lib/api/departments'
import DepartmentManager from '@/components/departments/DepartmentManager'
import MainHeader from '@/components/layout/MainHeader'
import { isDescendant } from '@/lib/api/admin'
import { getSetting } from '@/lib/api/settings'

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
    .select('is_admin, is_department_admin, department_id')
    .eq('id', user.id)
    .single()

  console.log('===> DB Profile Fetch:', { userId: user.id, profile, profileError })

  // Fetch departments from database
  const allDepartments = await getDepartments()
  let visibleDepartments = []

  let manageableDepartmentIds: string[] = []
  if (profile?.is_admin) {
    visibleDepartments = allDepartments
    manageableDepartmentIds = allDepartments.map(d => d.id)
  } else if (profile?.department_id) {
    // Find all descendant departments for the user's department to establish visibility
    for (const dept of allDepartments) {
      if (await isDescendant(profile.department_id, dept.id)) {
        visibleDepartments.push(dept)
        if (profile.is_department_admin) {
          manageableDepartmentIds.push(dept.id)
        }
      }
    }
  }

  const workspaceName = await getSetting('workspace_name', '看板管理系統')

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      <MainHeader userEmail={user.email} isAdmin={!!profile?.is_admin} workspaceName={workspaceName} />

      {/* Main Content Area */}
      <DepartmentManager
        initialDepartments={visibleDepartments}
        isAdmin={!!profile?.is_admin}
        manageableDepartmentIds={manageableDepartmentIds}
      />
    </main>
  )
}
