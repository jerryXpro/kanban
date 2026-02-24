'use client'

import { useLocaleStore } from '@/store/useLocaleStore'
import { Locale } from '@/lib/i18n/dictionaries'

export default function LanguageSwitcher() {
    const { locale, setLocale } = useLocaleStore()

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocale(e.target.value as Locale)
    }

    return (
        <select
            value={locale}
            onChange={handleLanguageChange}
            className="bg-white/10 text-white text-sm px-2 py-1.5 rounded-md border border-white/20 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer block"
        >
            <option value="zh-TW" className="text-slate-800">繁體中文</option>
            <option value="en" className="text-slate-800">English</option>
            <option value="vi" className="text-slate-800">Tiếng Việt</option>
        </select>
    )
}
