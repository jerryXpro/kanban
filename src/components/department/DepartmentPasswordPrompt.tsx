'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyDepartmentPassword } from '@/app/actions/departmentPassword'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default function DepartmentPasswordPrompt({ departmentId, departmentName }: { departmentId: string, departmentName: string }) {
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) {
            toast.error('請輸入密碼')
            return
        }

        setIsLoading(true)
        try {
            const result = await verifyDepartmentPassword(departmentId, password)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('密碼正確')
                // Refresh the page to load the board
                router.refresh()
            }
        } catch (error) {
            toast.error('驗證失敗')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                        <Lock size={32} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">需要密碼</h1>
                <p className="text-center text-slate-500 mb-8">
                    進入 <span className="font-semibold text-slate-700">{departmentName}</span> 看板需要密碼
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            type="password"
                            placeholder="請輸入部門密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            className="text-center text-lg"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={isLoading}
                    >
                        {isLoading ? '驗證中...' : '解鎖'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/">
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-700">
                            返回首頁
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
