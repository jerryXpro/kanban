import { getSetting } from '@/lib/api/settings'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { DEFAULT_USER_GUIDE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function GuidePage() {
    // 1. Verify Authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 2. Fetch the workspace name and the user guide content
    const workspaceName = await getSetting('workspace_name', '看板管理系統')
    const userGuide = await getSetting('user_guide', DEFAULT_USER_GUIDE)

    // 3. Fallback content if admin hasn't set anything
    const hasGuide = userGuide && userGuide.trim() !== '' && userGuide !== '<p></p>'

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shrink-0 z-10 sticky top-0 shadow-sm">
                <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded hover:bg-slate-100 bg-slate-50 border border-slate-200/60" title="返回首頁">
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-100 p-1.5 rounded-md text-indigo-600">
                                <BookOpen size={18} />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-slate-800 leading-tight">系統操作說明</h1>
                                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">{workspaceName} user guide</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 mb-12 mt-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">

                    {/* Decorative Top Border */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                    <div className="p-8 sm:p-10 md:p-12">
                        {hasGuide ? (
                            <div
                                className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-xl prose-img:shadow-sm"
                                dangerouslySetInnerHTML={{ __html: userGuide }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-100">
                                    <BookOpen size={48} className="text-slate-300" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-700 mb-2">尚無操作說明</h2>
                                <p className="text-slate-500 max-w-md">
                                    系統管理員尚未建立相關的操作說明文件。<br />
                                    請聯絡您的系統管理員至「系統設定」後台補充填寫。
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
