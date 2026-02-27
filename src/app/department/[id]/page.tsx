import { getBoardData } from '@/lib/api/boards'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from '@/components/board/KanbanBoard'
import { Button } from '@/components/ui/button'
import { I18nText } from '@/components/ui/I18nText'
import BoardHeader from '@/components/layout/BoardHeader'
import InitializeBoardButton from '@/components/board/InitializeBoardButton'
import { getSetting } from '@/lib/api/settings'

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
                <h1 className="text-2xl font-bold text-slate-800"><I18nText ns="departments" textKey="dept_not_found" /></h1>
                <p className="text-slate-500 mt-2"><I18nText ns="departments" textKey="dept_not_found_desc" /></p>
                <Link href="/">
                    <Button className="mt-6"><I18nText ns="departments" textKey="return_home" /></Button>
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

    const workspaceName = await getSetting('workspace_name', '看板管理系統')

    return (
        <div
            className="h-screen flex flex-col transition-colors duration-500"
            style={{
                backgroundColor: boardData?.background_color || '#4F46E5',
                backgroundImage: boardData?.background_color ? 'none' : 'linear-gradient(to bottom right, #4f46e5, #ec4899)' // Fallback gradient
            }}
        >
            <BoardHeader
                departmentId={department.id}
                departmentName={department.name}
                userRole={userRole}
                userEmail={user.email}
                isAdmin={!!profile?.is_admin}
                workspaceName={workspaceName}
            />

            {/* Board Layout Area */}
            <main className="flex-1 overflow-hidden pt-6 relative">
                {boardData ? (
                    <KanbanBoard initialLists={boardData.lists} userProfile={profile} boardId={boardInfo!.id} departments={departments} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-70"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M7 17h.01" /><path d="M17 17h.01" /></svg>
                        <h2 className="text-xl font-medium mb-2"><I18nText ns="departments" textKey="no_board" /></h2>
                        <p className="opacity-80 max-w-md text-center mb-6"><I18nText ns="departments" textKey="no_board_desc" /></p>
                        <InitializeBoardButton departmentId={department.id} departmentName={department.name} />
                    </div>
                )}
            </main>
        </div>
    )
}
