import { getBoardData } from '@/lib/api/boards'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from '@/components/board/KanbanBoard'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { I18nText } from '@/components/ui/I18nText'
import InitializeBoardButton from '@/components/board/InitializeBoardButton'

export const dynamic = 'force-dynamic'

export default async function DepartmentBoardPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Profile to get User Role & Permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const userRole = profile?.role || '作業員'

    // 2. Fetch the Department name 
    const { data: department } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()

    if (!department) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <h1 className="text-2xl font-bold text-slate-800">Department Not Found</h1>
                <p className="text-slate-500 mt-2">The workspace you are looking for does not exist.</p>
                <Link href="/">
                    <Button className="mt-6">Return to Home</Button>
                </Link>
            </div>
        )
    }

    // 3. Find the board associated with this department
    const { data: boardInfo } = await supabase
        .from('boards')
        .select('id')
        .eq('department_id', id)
        .single()

    let boardData = null
    let departments = []

    if (boardInfo) {
        // Fetch full board data including lists, cards, and injected global announcements
        boardData = await getBoardData(boardInfo.id)
    }

    if (profile?.can_manage_global_messages || profile?.is_admin || profile?.is_department_admin) {
        const { data: deptData } = await supabase.from('departments').select('*')
        if (deptData) departments = deptData
    }

    return (
        <div
            className="h-screen flex flex-col transition-colors duration-500"
            style={{
                backgroundColor: boardData?.background_color || '#4F46E5',
                backgroundImage: boardData?.background_color ? 'none' : 'linear-gradient(to bottom right, #4f46e5, #ec4899)' // Fallback gradient
            }}
        >
            {/* Board Header Navbar */}
            <header className="bg-black/20 backdrop-blur-md border-b border-white/10 h-14 flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <div className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white font-bold transition-colors cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                        </div>
                    </Link>
                    <h1 className="font-semibold text-white text-lg tracking-wide">{department.name} Team Board</h1>
                </div>

                <div className="flex items-center gap-4 text-white">
                    <LanguageSwitcher />

                    <div className="text-sm opacity-80 hidden sm:flex items-center gap-2">
                        <span className="bg-white/20 px-2 py-1 rounded-md">{userRole}</span>
                        {profile?.is_admin && (
                            <Link href="/admin/users">
                                <Button variant="outline" size="sm" className="h-6 text-xs text-indigo-900 px-2 bg-amber-200 hover:bg-amber-300 border-none">
                                    Admin Panel
                                </Button>
                            </Link>
                        )}
                        <span>{user.email}</span>
                    </div>
                    <form action={async () => {
                        'use server'
                        const sb = await createClient()
                        await sb.auth.signOut()
                        redirect('/login')
                    }}>
                        <Button variant="ghost" size="sm" type="submit" className="text-white hover:bg-white/20 hover:text-white transition-colors">
                            <I18nText ns="header" textKey="sign_out" />
                        </Button>
                    </form>
                </div>
            </header>

            {/* Board Layout Area */}
            <main className="flex-1 overflow-hidden pt-6 relative">
                {boardData ? (
                    <KanbanBoard initialLists={boardData.lists} userProfile={profile} boardId={boardInfo!.id} departments={departments} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-70"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M7 17h.01" /><path d="M17 17h.01" /></svg>
                        <h2 className="text-xl font-medium mb-2">No Active Board</h2>
                        <p className="opacity-80 max-w-md text-center mb-6">This department doesn't have a Kanban board set up yet.</p>
                        <InitializeBoardButton departmentId={department.id} departmentName={department.name} />
                    </div>
                )}
            </main>
        </div>
    )
}
