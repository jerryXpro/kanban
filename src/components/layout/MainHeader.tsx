'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { I18nText } from '@/components/ui/I18nText'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface MainHeaderProps {
    userEmail: string | undefined
    isAdmin: boolean
}

export default function MainHeader({ userEmail, isAdmin }: MainHeaderProps) {
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">K</div>
                <h1 className="font-semibold text-slate-800">
                    <I18nText ns="header" textKey="workspace" />
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <LanguageSwitcher />
                {isAdmin && (
                    <Link href="/admin/users">
                        <Button variant="outline" size="sm" className="h-8 text-sm text-indigo-900 px-3 bg-amber-200 hover:bg-amber-300 border-none rounded-md font-medium shadow-sm cursor-pointer">
                            <I18nText ns="header" textKey="upgrade_manager" />
                        </Button>
                    </Link>
                )}
                <div className="text-sm text-slate-500 hidden sm:block">{userEmail}</div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100"
                >
                    <I18nText ns="header" textKey="sign_out" />
                </Button>
            </div>
        </header>
    )
}
