'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { I18nText } from '@/components/ui/I18nText'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AnomalyReportDialog from '@/components/board/AnomalyReportDialog'

interface BoardHeaderProps {
    departmentId: string
    departmentName: string
    managerName?: string | null
    userRole: string
    userEmail: string | undefined
    isAdmin: boolean
    workspaceName: string
}

export default function BoardHeader({ departmentId, departmentName, managerName, userRole, userEmail, isAdmin, workspaceName }: BoardHeaderProps) {
    const router = useRouter()
    const [isAnomalyOpen, setIsAnomalyOpen] = useState(false)
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
                            部門主管 : {managerName}
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
                            <Link href="/admin/users">
                                <Button variant="outline" size="sm" className="h-6 text-xs text-indigo-900 px-2 bg-amber-200 hover:bg-amber-300 border-none">
                                    <I18nText ns="header" textKey="upgrade_manager" />
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
        </header>
    )
}
