'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single()

    if (error || !data) {
        return defaultValue
    }

    return data.value
}

export async function updateSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    // Check if the current user is an admin
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return { success: false, error: 'Permission denied: Admin access required' }
    }

    // Perform update or insert
    const { error } = await supabase
        .from('app_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

    if (error) {
        console.error('Failed to update setting:', error)
        return { success: false, error: error.message }
    }

    // Revalidate the entire site to reflect the new setting
    revalidatePath('/', 'layout')

    return { success: true }
}
