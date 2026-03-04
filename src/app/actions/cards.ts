'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reportAnomaly(currentDeptId: string, targetDeptIds: string[], title: string, description: string) {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (!targetDeptIds || targetDeptIds.length === 0) {
        return { error: '未選擇任何目標部門。' }
    }

    // 2. Find target departments' boards
    const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('id, department_id')
        .in('department_id', targetDeptIds)
        .neq('is_active', false)

    if (boardsError || !boardsData || boardsData.length === 0) {
        const errMsg = boardsError?.message || 'No boards found'
        return { error: `找不到目標部門的可用看板。(${errMsg})` }
    }

    const boardIds = boardsData.map(b => b.id)

    // 3. Find or create the dedicated anomaly list for each board
    // First, check which boards already have an anomaly list
    const { data: existingAnomalyLists } = await supabase
        .from('lists')
        .select('id, board_id')
        .in('board_id', boardIds)
        .eq('list_type', 'anomaly')

    const anomalyListPerBoard = new Map<string, string>() // board_id -> list_id
    if (existingAnomalyLists) {
        for (const list of existingAnomalyLists) {
            anomalyListPerBoard.set(list.board_id, list.id)
        }
    }

    // Create anomaly lists for boards that don't have one yet
    const boardsNeedingList = boardIds.filter(bid => !anomalyListPerBoard.has(bid))
    if (boardsNeedingList.length > 0) {
        const newLists = boardsNeedingList.map(boardId => ({
            board_id: boardId,
            title: '通報事件',
            order: 0.5, // After global announcement (order ~0) but before regular lists (order >= 65536)
            list_type: 'anomaly',
            is_global: false,
        }))

        const { data: createdLists, error: createError } = await supabase
            .from('lists')
            .insert(newLists)
            .select('id, board_id')

        if (createError || !createdLists) {
            return { error: `無法建立通報事件列表：${createError?.message || 'Unknown error'}` }
        }

        for (const list of createdLists) {
            anomalyListPerBoard.set(list.board_id, list.id)
        }
    }

    const targetListIds = Array.from(anomalyListPerBoard.values())

    if (targetListIds.length === 0) {
        return { error: `無法找到合適的清單來插入卡片。` }
    }

    // 4. Batch determine new order (Fetch max order for each target list)
    const { data: maxOrdersData } = await supabase
        .from('cards')
        .select('list_id, order')
        .in('list_id', targetListIds)

    const maxOrderPerList = new Map<string, number>()
    if (maxOrdersData) {
        for (const card of maxOrdersData) {
            const currentMax = maxOrderPerList.get(card.list_id) || 0
            if (card.order > currentMax) {
                maxOrderPerList.set(card.list_id, card.order)
            }
        }
    }

    // 5. Prepare bulk insert data
    const cardsToInsert = targetListIds.map(listId => {
        const currentMaxOrder = maxOrderPerList.get(listId) || 0
        const newOrder = currentMaxOrder > 0 ? currentMaxOrder + 65536 : 65536

        return {
            list_id: listId,
            title,
            description,
            order: newOrder,
            card_type: 'anomaly',
            source_department_id: currentDeptId,
            status: 'open',
            created_by: user.id
        }
    })

    // 6. Bulk Insert
    const { error: insertError } = await supabase
        .from('cards')
        .insert(cardsToInsert)

    if (insertError) {
        return { error: `送出失敗：${insertError.message}` }
    }

    // 7. Revalidate UI for all targeted departments
    for (const deptId of targetDeptIds) {
        revalidatePath(`/department/${deptId}`, 'page')
    }
    revalidatePath('/', 'layout')

    return { success: true }
}

/**
 * Update a card's title and description via server action.
 * Uses server-side Supabase client (with the user's session cookie),
 * which correctly applies RLS with the user's identity — unlike the
 * browser client which can silently fail on RLS-blocked writes.
 */
export async function updateCard(
    cardId: string,
    title: string,
    description: string,
    assignedUserId?: string | null,
    assignedDeptId?: string | null
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { data: currentCard } = await supabase.from('cards').select('list_id, assigned_department_id').eq('id', cardId).single()

    let updatePayload: any = {
        title: title.trim(),
        description: description.trim(),
        updated_at: new Date().toISOString(),
        assigned_user_id: assignedUserId !== undefined && assignedUserId !== 'none' ? assignedUserId : null,
        assigned_department_id: assignedDeptId !== undefined && assignedDeptId !== 'none' ? assignedDeptId : null
    }

    if (updatePayload.assigned_department_id && updatePayload.assigned_department_id !== currentCard?.assigned_department_id) {
        const { data: boardData } = await supabase.from('boards').select('id').eq('department_id', updatePayload.assigned_department_id).single()
        if (boardData) {
            const { data: listData } = await supabase.from('lists').select('id').eq('board_id', boardData.id).order('order', { ascending: true }).limit(1).single()
            if (listData) {
                updatePayload.list_id = listData.id

                const { data: maxOrderData } = await supabase.from('cards').select('order').eq('list_id', listData.id).order('order', { ascending: false }).limit(1).single()
                updatePayload.order = maxOrderData ? maxOrderData.order + 65536 : 65536
            }
        }
    }

    const { error } = await supabase
        .from('cards')
        .update(updatePayload)
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
