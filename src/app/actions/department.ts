'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentManager } from '@/lib/api/admin'

export async function createDepartment(name: string, icon: string | null = null, parentIds: string[] = [], color: string | null = null) {
    const supabase = await createClient()

    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, is_department_admin, department_id')
        .eq('id', user.id)
        .single()

    // To create a department, you must be a global admin, OR a department admin creating a sub-department under your own hierarchy
    let canCreate = false;
    if (profile?.is_admin) {
        canCreate = true;
    } else if (profile?.is_department_admin && parentIds.length > 0) {
        canCreate = true;
        for (const pid of parentIds) {
            if (!(await isDepartmentManager(pid))) {
                canCreate = false;
                break;
            }
        }
    }

    if (!canCreate) return { error: 'Unauthorized. Only admins can create departments here.' }

    // 2. Insert department
    const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .insert({ name, icon, parent_ids: parentIds, color })
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
            background_color: color || '#4F46E5',
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

export async function updateDepartment(id: string, newName: string, icon: string | null = null, parentIds: string[] = [], color: string | null = null) {
    const supabase = await createClient()

    // Use the hierarchical manager check
    const isManager = await isDepartmentManager(id)
    console.log(`[updateDepartment] id: ${id}, isManager: ${isManager}`)
    if (!isManager) return { error: 'Unauthorized to update this department' }

    // 2. Update department
    const { data, error } = await supabase
        .from('departments')
        .update({ name: newName, icon, parent_ids: parentIds, color })
        .eq('id', id)
        .select()
        .single()

    if (error || !data) {
        console.error('Supabase Update Error:', error || 'No rows returned, RLS might have blocked the update.')
        return { error: error?.message || '更新失敗：請確認您有足夠的權限，或是資料庫 RLS 設定是否正確。' }
    }

    revalidatePath('/')
    return { success: true }
}

export async function deleteDepartment(id: string) {
    const supabase = await createClient()

    const isManager = await isDepartmentManager(id)
    if (!isManager) return { error: 'Unauthorized to delete this department' }

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
