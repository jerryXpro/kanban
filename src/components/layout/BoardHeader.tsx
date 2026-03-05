'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { I18nText } from '@/components/ui/I18nText'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarClock, ListPlus } from 'lucide-react'
import { createDefaultLists } from '@/app/actions/department'
import AnomalyReportDialog from '@/components/board/AnomalyReportDialog'
import ThemeSelector from '@/components/board/ThemeSelector'
import EventManager from '@/components/board/EventManager'
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'

interface BoardHeaderProps {
    departmentId: string
    departmentName: string
    managerName?: string | null
    userRole: string
    userEmail: string | undefined
    isAdmin: boolean
    workspaceName: string
    boardId?: string
    currentThemeColor?: string
    isManager?: boolean
}

export default function BoardHeader({ departmentId, departmentName, managerName, userRole, userEmail, isAdmin, workspaceName, boardId, currentThemeColor, isManager }: BoardHeaderProps) {
    const router = useRouter()
    const [isAnomalyOpen, setIsAnomalyOpen] = useState(false)
    const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false)
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10 h-14 flex items-center justify-between px-4 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <div className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white font-bold transition-colors cursor-pointer" title="Return Home">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                    </div>
                </Link>
                <h1 className="font-semibold text-white text-lg tracking-wide flex items-center gap-2">
                    {departmentName}
                    {managerName && (
                        <span className="text-[13px] bg-black/30 px-2 py-0.5 rounded border border-white/20 whitespace-nowrap ml-1 font-medium text-white/90">
                            管理團隊 : {managerName}
                        </span>
                    )}
                    <span className="opacity-70 font-normal ml-2">|</span>
                    <span className="ml-2">{workspaceName}</span>
                </h1>
            </div>

            <div className="flex items-center gap-4 text-white">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsAnomalyOpen(true)}
                    className="bg-red-500/90 hover:bg-red-600 text-white border-none h-7 px-3 text-xs font-medium shadow-sm transition-colors flex items-center gap-1.5"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <I18nText ns="board" textKey="report_anomaly" />
                </Button>

                {isManager && boardId && (
                    <ThemeSelector
                        boardId={boardId}
                        departmentId={departmentId}
                        currentThemeColor={currentThemeColor}
                    />
                )}

                {isManager && (
                    <button
                        onClick={() => setIsEventDrawerOpen(true)}
                        className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/15 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                        title={dict.event_scheduler_title || "排程提醒事件"}
                    >
                        <CalendarClock size={15} className="text-amber-300" />
                        <span className="hidden sm:inline">{dict.event_scheduler_btn || "排程提醒"}</span>
                    </button>
                )}

                {isManager && boardId && (
                    <button
                        onClick={async () => {
                            if (!confirm(dict.default_lists_confirm || '確定要建立預設列表（待辦事項、進行事項、完成事項）？')) return
                            const res = await createDefaultLists(boardId, departmentId)
                            if (res.error) {
                                alert(res.error)
                            } else {
                                window.location.reload()
                            }
                        }}
                        className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/15 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                        title={dict.default_lists_create_btn || "一鍵建立預設列表"}
                    >
                        <ListPlus size={15} className="text-emerald-300" />
                        <span className="hidden sm:inline">{dict.default_lists_btn || "預設列表"}</span>
                    </button>
                )}

                <LanguageSwitcher />

                <div className="text-sm opacity-80 hidden sm:flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-1 rounded-md">{userRole}</span>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Link href="/admin/settings">
                                <Button variant="outline" size="sm" className="h-6 text-xs text-indigo-900 px-2 bg-amber-200 hover:bg-amber-300 border-none">
                                    ⚙️ 系統設定
                                </Button>
                            </Link>
                        </div>
                    )}
                    <span>{userEmail}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-white hover:bg-white/20 hover:text-white transition-colors"
                >
                    <I18nText ns="header" textKey="sign_out" />
                </Button>
            </div>

            <AnomalyReportDialog
                currentDepartmentId={departmentId}
                currentDepartmentName={departmentName}
                isOpen={isAnomalyOpen}
                onOpenChange={setIsAnomalyOpen}
            />

            <EventManager
                departmentId={departmentId}
                isOpen={isEventDrawerOpen}
                onOpenChange={setIsEventDrawerOpen}
            />
        </header>
    )
}
