'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentManager } from '@/lib/api/admin'

export async function createDepartment(name: string, icon: string | null = null, parentIds: string[] = [], color: string | null = null, customIconUrl: string | null = null, isGroup: boolean = false) {
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
        .insert({ name, icon, parent_ids: parentIds, color, custom_icon_url: customIconUrl, is_group: isGroup })
        .select()
        .single()

    if (deptError) {
        console.error('Create Dept DB Error:', deptError)
        return { error: deptError.message || '資料庫新增錯誤，請確認權限或名稱是否重複。' }
    }

    // 3. Create a board for the new department automatically
    const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .insert({
            department_id: deptData.id,
            title: `${name} 板塊`,
            background_color: color || '#4F46E5',
            is_active: true
        })
        .select('id')
        .single()

    if (boardError) {
        console.error('Failed to create default board:', boardError)
    }

    // 4. Create default lists for the new board
    if (boardData) {
        const defaultLists = [
            { board_id: boardData.id, title: '📋 待辦事項', order: 1000 },
            { board_id: boardData.id, title: '🔄 進行事項', order: 2000 },
            { board_id: boardData.id, title: '✅ 完成事項', order: 3000 },
        ]

        const { error: listsError } = await supabase
            .from('lists')
            .insert(defaultLists)

        if (listsError) {
            console.error('Failed to create default lists:', listsError)
        }
    }

    revalidatePath('/')
    return { data: deptData }
}

export async function updateListTitle(listId: string, title: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    // Assuming updateList is a helper function or another action
    // For now, we'll implement the direct update here.
    const { error } = await supabase
        .from('lists')
        .update({ title })
        .eq('id', listId)

    if (error) {
        console.error('Error updating list title:', error)
        return { error: `更新列表標題失敗: ${error.message}` }
    }

    revalidatePath('/') // Revalidate to show changes
    return { success: true }
}

export async function updateListOrder(listId: string, order: number) {
    const supabase = await createClient()

    // Validate auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Use admin client to bypass RLS for list reordering
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    const { error } = await adminClient
        .from('lists')
        .update({ order })
        .eq('id', listId)

    if (error) {
        console.error('Error updating list order:', error)
        return { error: `更新列表順序失敗: ${error.message}` }
    }

    return { success: true }
}

export async function createDefaultLists(boardId: string, departmentId: string): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get current max order in the board
    const { data: existingLists } = await supabase
        .from('lists')
        .select('order')
        .eq('board_id', boardId)
        .order('order', { ascending: false })
        .limit(1)

    const startOrder = existingLists && existingLists.length > 0 ? existingLists[0].order + 1000 : 1000

    const defaultLists = [
        { board_id: boardId, title: '📋 待辦事項', order: startOrder },
        { board_id: boardId, title: '🔄 進行事項', order: startOrder + 1000 },
        { board_id: boardId, title: '✅ 完成事項', order: startOrder + 2000 },
    ]

    const { error } = await supabase
        .from('lists')
        .insert(defaultLists)

    if (error) return { error: error.message }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
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

export async function updateDepartment(id: string, newName: string, icon: string | null = null, parentIds: string[] = [], color: string | null = null, customIconUrl: string | null = null, isGroup: boolean = false) {
    const supabase = await createClient()

    // Use the hierarchical manager check
    const isManager = await isDepartmentManager(id)
    console.log(`[updateDepartment] id: ${id}, isManager: ${isManager}`)
    if (!isManager) return { error: 'Unauthorized to update this department' }

    // 2. Update department
    const { data, error } = await supabase
        .from('departments')
        .update({ name: newName, icon, parent_ids: parentIds, color, custom_icon_url: customIconUrl, is_group: isGroup })
        .eq('id', id)
        .select()
        .single()

    if (error || !data) {
        console.error('Supabase Update Error:', error || 'No rows returned, RLS might have blocked the update.')
        return { error: error?.message || '更新失敗：請確認您有足夠的權限，或是資料庫 RLS 設定是否正確。' }
    }

    if (color) {
        // Also update the board background color to keep it synchronized if changed here
        await supabase
            .from('boards')
            .update({ background_color: color })
            .eq('department_id', id)
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

export async function updateDepartmentOrder(
    orderedIds: { id: string; display_order: number }[]
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) return { error: 'Only admins can reorder departments' }

    // Update each department's display_order
    for (const item of orderedIds) {
        const { error } = await supabase
            .from('departments')
            .update({ display_order: item.display_order })
            .eq('id', item.id)

        if (error) return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
}


export async function uploadDepartmentIcon(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const file = formData.get('file') as File
    if (!file) return { error: 'No file provided' }

    // Validate size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { error: 'File size exceeds 5MB limit' }
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error } = await supabase.storage
        .from('department-icons')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (error) {
        console.error('Storage upload error:', error)
        return { error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('department-icons')
        .getPublicUrl(filePath)

    return { data: publicUrl }
}

