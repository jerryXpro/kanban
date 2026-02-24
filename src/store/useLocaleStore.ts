import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Locale } from '@/lib/i18n/dictionaries'

interface LocaleState {
    locale: Locale
    setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>()(
    persist(
        (set) => ({
            locale: 'zh-TW', // Default to traditional chinese
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: 'kanban-locale-storage',
        }
    )
)
