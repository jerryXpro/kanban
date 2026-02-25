'use client'

import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { useEffect, useState } from 'react'
import type { Dictionary } from '@/lib/i18n/dictionaries'

export function I18nText({ ns, textKey }: { ns: keyof Dictionary, textKey: string }) {
    const { locale } = useLocaleStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        // Render fallback or nothing during SSR to avoid hydration mismatch
        return <span className="opacity-0">...</span>
    }

    // @ts-ignore
    return <>{dictionaries[locale][ns][textKey]}</>
}
