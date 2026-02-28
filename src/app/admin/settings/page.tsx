import { getSetting } from '@/lib/api/settings'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSettingsForm from './AdminSettingsForm'
import { DEFAULT_USER_GUIDE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
    // Verify the user is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        redirect('/')
    }

    // Fetch current settings on the server
    const currentWorkspaceName = await getSetting('workspace_name', '看板管理系統')
    const currentUserGuide = await getSetting('user_guide', DEFAULT_USER_GUIDE)

    // Fetch all users and their departments for the UserManagement tab
    const { data: allUsers, error } = await supabase
        .from('profiles')
        .select(`
            *,
            department:departments(name)
        `)
        .order('email', { ascending: true })

    if (error) {
        console.error('Error fetching users:', error)
    }

    // Fetch all departments to populate the dropdown when creating a new user
    const { data: allDepartments } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true })

    return <AdminSettingsForm
        initialWorkspaceName={currentWorkspaceName}
        initialUserGuide={currentUserGuide}
        initialUsers={allUsers || []}
        departments={allDepartments || []}
    />
}
