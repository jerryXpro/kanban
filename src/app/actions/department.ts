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
    const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .insert({ name })
        .select()
        .single()

    if (deptError) {
        return { error: deptError.message }
    }

    // 3. Create a board for the new department automatically
    const { error: boardError } = await supabase
        .from('boards')
        .insert({
            department_id: deptData.id,
            title: `${name} 板塊`,
            background_color: '#4F46E5',
            is_active: true
        })

    if (boardError) {
        console.error('Failed to create default board:', boardError)
    }

    revalidatePath('/')
    return { data: deptData }
}

export async function initializeBoard(departmentId: string, departmentName: string) {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 2. Proceed to create board
    const { error: boardError } = await supabase
        .from('boards')
        .insert({
            department_id: departmentId,
            title: `${departmentName} 板塊`,
            background_color: '#4F46E5',
            is_active: true
        })

    if (boardError) {
        return { error: boardError.message }
    }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
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
