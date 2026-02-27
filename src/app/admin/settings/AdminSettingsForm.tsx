'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateSetting } from '@/lib/api/settings'

interface AdminSettingsFormProps {
    initialWorkspaceName: string
}

export default function AdminSettingsForm({ initialWorkspaceName }: AdminSettingsFormProps) {
    const router = useRouter()
    const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSave = async () => {
        if (!workspaceName.trim()) {
            setMessage({ type: 'error', text: '系統名稱不能為空' })
            return
        }

        setIsSaving(true)
        setMessage(null)

        try {
            const result = await updateSetting('workspace_name', workspaceName.trim())
            if (result.success) {
                setMessage({ type: 'success', text: '設定已更新' })
                router.refresh()
            } else {
                setMessage({ type: 'error', text: result.error || '更新失敗' })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '發生錯誤' })
        } finally {
            setIsSaving(false)
        }
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
                            <h1 className="font-bold text-lg text-slate-800">系統設定</h1>
                            <p className="text-xs text-slate-500">管理全域應用程式設定</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto p-6 md:p-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-800">基本設定</h2>
                        <p className="text-sm text-slate-500 mt-1">變更應用程式的顯示資訊。</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="workspaceName" className="block text-sm font-medium text-slate-700 mb-1">
                                    系統名稱 (Workspace Name)
                                </label>
                                <input
                                    id="workspaceName"
                                    type="text"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                                    placeholder="例如：看板管理系統"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    這將會顯示在系統標題列以及登入頁面等地方。
                                </p>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Save size={16} />
                                    {isSaving ? '儲存中...' : '儲存設定'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
