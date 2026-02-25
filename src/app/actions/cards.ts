'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reportAnomaly(currentDeptId: string, targetDeptId: string, title: string, description: string) {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 2. Find target department's board (include boards where is_active is null or true)
    const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('department_id', targetDeptId)
        .neq('is_active', false)
        .limit(1)
        .single()

    if (boardError || !boardData) {
        const errMsg = boardError?.message || 'No board found'
        return { error: `目標部門沒有可用的看板。(${errMsg})` }
    }

    // 3. Find target board's first list
    const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('id')
        .eq('board_id', boardData.id)
        .order('order', { ascending: true })
        .limit(1)
        .single()

    if (listError || !listData) {
        const errMsg = listError?.message || 'No lists found'
        return { error: `目標看板沒有任何清單，無法建立異常卡片。(${errMsg})` }
    }

    // 4. Determine new order
    const { data: maxOrderData } = await supabase
        .from('cards')
        .select('order')
        .eq('list_id', listData.id)
        .order('order', { ascending: false })
        .limit(1)
        .single()

    const newOrder = maxOrderData ? maxOrderData.order + 65536 : 65536

    // 5. Insert Anomaly Card
    const { error: insertError } = await supabase
        .from('cards')
        .insert({
            list_id: listData.id,
            title,
            description,
            order: newOrder,
            card_type: 'anomaly',
            source_department_id: currentDeptId,
            status: 'open',
            created_by: user.id
        })

    if (insertError) {
        return { error: `送出失敗：${insertError.message}` }
    }

    revalidatePath(`/department/${targetDeptId}`)
    return { success: true }
}

/**
 * Update a card's title and description via server action.
 * Uses server-side Supabase client (with the user's session cookie),
 * which correctly applies RLS with the user's identity — unlike the
 * browser client which can silently fail on RLS-blocked writes.
 */
export async function updateCard(cardId: string, title: string, description: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('cards')
        .update({ title: title.trim(), description: description.trim(), updated_at: new Date().toISOString() })
        .eq('id', cardId)

    if (error) return { error: `更新失敗：${error.message}` }
    return { success: true }
}

/**
 * Delete a card via server action.
 * Uses server-side Supabase client (with the user's session cookie).
 */
export async function deleteCard(cardId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId)

    if (error) return { error: `刪除失敗：${error.message}` }
    return { success: true }
}
