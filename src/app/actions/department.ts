'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDepartment(name: string) {
    const supabase = await createClient()

    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) return { error: 'Unauthorized. Only admins can create departments.' }

    // 2. Insert department
    const { data, error } = await supabase
        .from('departments')
        .insert({ name })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/')
    return { data }
}

export async function updateDepartment(id: string, newName: string) {
    const supabase = await createClient()

    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) return { error: 'Unauthorized' }

    // 2. Update department
    const { error } = await supabase
        .from('departments')
        .update({ name: newName })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}

export async function deleteDepartment(id: string) {
    const supabase = await createClient()

    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) return { error: 'Unauthorized' }

    // 2. Delete department (Supabase cascade deletes boards, lists, cards)
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}
