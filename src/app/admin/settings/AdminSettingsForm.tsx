'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateSetting } from '@/lib/api/settings'
import RichTextEditor from '@/components/ui/RichTextEditor'
import UserManagement from '@/components/admin/UserManagement'

interface AdminSettingsFormProps {
    initialWorkspaceName: string
    initialUserGuide: string
    initialUsers: any[]
}

export default function AdminSettingsForm({ initialWorkspaceName, initialUserGuide, initialUsers }: AdminSettingsFormProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general')
    const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName)
    const [userGuide, setUserGuide] = useState(initialUserGuide)
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
            // Update all settings concurrently
            const results = await Promise.all([
                updateSetting('workspace_name', workspaceName.trim()),
                updateSetting('user_guide', userGuide)
            ])

            // Check if any failed
            const errorResult = results.find(r => !r.success)

            if (errorResult) {
                setMessage({ type: 'error', text: errorResult.error || '更新設定失敗' })
            } else {
                setMessage({ type: 'success', text: '所有設定已成功更新' })
                router.refresh()
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || '發生未知錯誤' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans mb-20">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shrink-0 z-10 sticky top-0">
                <div className="flex items-center w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded hover:bg-slate-100">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg text-slate-800">系統設定</h1>
                            <p className="text-xs text-slate-500">管理全域應用程式與使用者權限</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6">

                {/* Tabs Navigation */}
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'general'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                    >
                        <Settings size={16} />
                        基本顯示與說明
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                    >
                        <Users size={16} />
                        使用者權限管理
                    </button>
                </div>

                {/* Tab Content: General Settings */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* 1. 基本設定 */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-semibold text-slate-800">基本顯示設定</h2>
                                <p className="text-sm text-slate-500 mt-1">變更應用程式的基礎資訊。</p>
                            </div>

                            <div className="p-6">
                                <div className="max-w-xl">
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
                                    <p className="mt-2 text-xs text-slate-500">
                                        這將會顯示在系統標題列、導覽列以及登入頁面等地方。
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 2. 系統操作說明 */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800">系統操作說明編輯區</h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        撰寫與更新給全體使用者觀看的操作手冊或說明。您可以插入圖片、連結與排版格式。
                                    </p>
                                </div>
                                <a href="/guide" target="_blank" className="text-indigo-600 text-sm hover:underline font-medium">預覽線上說明</a>
                            </div>

                            <div className="p-6">
                                <div className="border border-slate-200 rounded-md min-h-[400px] overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                                    <RichTextEditor
                                        value={userGuide}
                                        onChange={setUserGuide}
                                        placeholder="請在此輸入操作說明內容..."
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Status Message and Save Button */}
                        <div className="sticky bottom-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between mt-8">
                            <div className="flex-1 mr-4">
                                {message && (
                                    <div className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {message.type === 'success' ? '✨' : '⚠️'} {message.text}
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-sm"
                                size="lg"
                            >
                                <Save size={18} />
                                {isSaving ? '儲存中...' : '儲存所有設定'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tab Content: User Management */}
                {activeTab === 'users' && (
                    <div className="animate-in fade-in duration-300">
                        <section className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">使用者與權限管理</h2>
                            <p className="text-sm text-slate-500 mt-1">管理各帳號的系統角色與權限層級。儲存按鈕將分別套用於每位使用者。</p>
                        </section>
                        <UserManagement initialUsers={initialUsers} />
                    </div>
                )}

            </main>
        </div>
    )
}
