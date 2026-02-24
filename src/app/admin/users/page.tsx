import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/admin/UserManagement'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'User Management - Kanban Admin',
}

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 2. Authorize user (Must be is_admin)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_admin) {
        // Redirect non-admins back to their respective landing spot
        redirect('/')
    }

    // 3. Fetch all users and their departments
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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shrink-0 z-10 sticky top-0">
                <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded hover:bg-slate-100">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg text-slate-800">User Management</h1>
                            <p className="text-xs text-slate-500">Configure roles and granular permissions</p>
                        </div>
                    </div>
                    <div>
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">Administrator</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
                <UserManagement initialUsers={allUsers || []} />
            </main>
        </div>
    )
}
