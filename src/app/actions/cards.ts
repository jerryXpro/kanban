'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    // 6. Bulk Insert to target departments
    const { error: insertError } = await supabase
        .from('cards')
        .insert(cardsToInsert)

    if (insertError) {
        return { error: `送出失敗：${insertError.message}` }
    }

    // 6b. Also create a "sent" copy in the SOURCE department's anomaly list
    const { data: srcBoard } = await supabase
        .from('boards')
        .select('id')
        .eq('department_id', currentDeptId)
        .neq('is_active', false)
        .single()

    if (srcBoard) {
        // Find or create anomaly list for source board
        let srcAnomalyListId: string | null = null
        const { data: srcAnomalyList } = await supabase
            .from('lists')
            .select('id')
            .eq('board_id', srcBoard.id)
            .eq('list_type', 'anomaly')
            .single()

        if (srcAnomalyList) {
            srcAnomalyListId = srcAnomalyList.id
        } else {
            const { data: newSrcList } = await supabase
                .from('lists')
                .insert({
                    board_id: srcBoard.id,
                    title: '通報事件',
                    order: 0.5,
                    list_type: 'anomaly',
                    is_global: false,
                })
                .select('id')
                .single()
            if (newSrcList) srcAnomalyListId = newSrcList.id
        }

        if (srcAnomalyListId) {
            // Get target department names for reference
            const { data: targetDepts } = await supabase
                .from('departments')
                .select('name')
                .in('id', targetDeptIds)
            const targetNames = targetDepts?.map(d => d.name).join('、') || ''

            const { data: srcMaxOrder } = await supabase
                .from('cards')
                .select('order')
                .eq('list_id', srcAnomalyListId)
                .order('order', { ascending: false })
                .limit(1)
                .single()
            const srcOrder = srcMaxOrder ? srcMaxOrder.order + 65536 : 65536

            // Build sent description: prepend target info to original description
            const sentNote = `📤 已通報至：${targetNames}`
            const sentDescription = description
                ? `${sentNote}\n\n${description}`
                : sentNote

            await supabase.from('cards').insert({
                list_id: srcAnomalyListId,
                title,
                description: sentDescription,
                order: srcOrder,
                card_type: 'anomaly',
                source_department_id: currentDeptId,
                status: 'sent',
                created_by: user.id,
            })
        }
    }

    // 7. Revalidate UI for all targeted departments + source department
    for (const deptId of targetDeptIds) {
        revalidatePath(`/department/${deptId}`, 'page')
    }
    revalidatePath(`/department/${currentDeptId}`, 'page')
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
    title?: string,
    description?: string,
    assignedUserId?: string | null,
    assignedDeptId?: string | null,
    listId?: string,
    order?: number
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    // Fetch user profile and card info for permission check
    const [{ data: currentCard }, { data: profile }] = await Promise.all([
        supabase.from('cards')
            .select('list_id, assigned_department_id, card_type, source_department_id, created_by, lists(is_global)')
            .eq('id', cardId).single(),
        supabase.from('profiles').select('is_admin, department_id, can_manage_global_messages').eq('id', user.id).single()
    ])

    if (!currentCard || !profile) return { error: '卡片不存在或使用者資料遺失' }

    // Enforce Ownership Rules
    let canModify = false
    if (profile.is_admin) {
        canModify = true
    } else if (currentCard.card_type === 'anomaly') {
        canModify = profile.department_id === currentCard.source_department_id
    } else if (currentCard.lists && (currentCard.lists as any).is_global) {
        canModify = profile.can_manage_global_messages || currentCard.created_by === user.id
    } else {
        // Regular card - rely on RLS/Board access rules
        canModify = true
    }

    if (!canModify) return { error: '無權限編輯此卡片 (需發送單位或管理員權限)' }

    let updatePayload: any = {
        updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (assignedUserId !== undefined) updatePayload.assigned_user_id = assignedUserId !== 'none' ? assignedUserId : null;
    if (assignedDeptId !== undefined) updatePayload.assigned_department_id = assignedDeptId !== 'none' ? assignedDeptId : null;
    if (listId !== undefined) updatePayload.list_id = listId;
    if (order !== undefined) updatePayload.order = order;

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

    revalidatePath('/')

    return { success: true }
}

/**
 * Update a card's position (list_id and order) via admin client,
 * completely bypassing RLS. Used exclusively for drag-and-drop reordering.
 */
export async function updateCardPosition(
    cardId: string,
    listId: string,
    order: number
) {
    console.log('[updateCardPosition] Called with:', { cardId, listId, order })

    // Verify the caller is authenticated first (using normal session client)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.log('[updateCardPosition] No user session found')
        return { error: '尚未登入' }
    }
    console.log('[updateCardPosition] User authenticated:', user.id)

    // Use admin client to bypass RLS for the actual update
    const adminClient = createAdminClient()

    const { data, error, count } = await adminClient
        .from('cards')
        .update({ list_id: listId, order, updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .select()

    console.log('[updateCardPosition] Update result:', { data, error, count })

    if (error) {
        console.error('Admin updateCardPosition failed:', error)
        return { error: `更新卡片位置失敗：${error.message}` }
    }

    if (!data || data.length === 0) {
        console.error('[updateCardPosition] No rows affected! Card ID may not exist:', cardId)
        return { error: '更新失敗：卡片不存在' }
    }

    console.log('[updateCardPosition] Success! Updated card:', data[0]?.id)
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

    // Fetch user profile and card info for permission check
    const [{ data: currentCard }, { data: profile }] = await Promise.all([
        supabase.from('cards')
            .select('card_type, source_department_id, created_by, lists(is_global)')
            .eq('id', cardId).single(),
        supabase.from('profiles').select('is_admin, department_id, can_manage_global_messages').eq('id', user.id).single()
    ])

    if (!currentCard || !profile) return { error: '卡片不存在或使用者資料遺失' }

    // Enforce Ownership Rules
    let canModify = false
    if (profile.is_admin) {
        canModify = true
    } else if (currentCard.card_type === 'anomaly') {
        canModify = profile.department_id === currentCard.source_department_id
    } else if (currentCard.lists && (currentCard.lists as any).is_global) {
        canModify = profile.can_manage_global_messages || currentCard.created_by === user.id
    } else {
        // Regular card - rely on RLS/Board access rules
        canModify = true
    }

    if (!canModify) return { error: '無權限刪除此卡片 (需發送單位或管理員權限)' }

    const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId)

    if (error) return { error: `刪除失敗：${error.message}` }
    return { success: true }
}
/**
 * Mark a card as read by a specific department
 */
export async function markCardAsRead(cardId: string, departmentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('card_reads')
        .upsert({
            card_id: cardId,
            department_id: departmentId,
            user_id: user.id
        }, { onConflict: 'card_id, department_id' })

    if (error) {
        console.error('Error marking card as read:', error)
        return { error: '記錄已讀失敗' }
    }

    return { success: true }
}

/**
 * Mark multiple cards as read by a specific department
 */
export async function markCardsAsRead(cardIds: string[], departmentId: string) {
    if (!cardIds.length) return { success: true }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const records = cardIds.map(id => ({
        card_id: id,
        department_id: departmentId,
        user_id: user.id
    }))

    const { error } = await supabase
        .from('card_reads')
        .upsert(records, { onConflict: 'card_id, department_id' })

    if (error) {
        console.error('Error marking cards as read:', error)
        return { error: '記錄已讀失敗' }
    }

    return { success: true }
}
