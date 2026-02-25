'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reportAnomaly(currentDeptId: string, targetDeptId: string, title: string, description: string) {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 2. Find target department's board
    const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('department_id', targetDeptId)
        .eq('is_active', true)
        .limit(1)
        .single()

    if (boardError || !boardData) {
        return { error: 'Target department does not have an active board.' }
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
        return { error: 'Target board has no lists. Cannot create anomaly card.' }
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
        return { error: insertError.message }
    }

    // Refresh the target department's page if anyone is using it
    revalidatePath(`/department/${targetDeptId}`)

    return { success: true }
}
