'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ScheduledEvent = {
    id: string
    department_id: string
    title: string
    description: string | null
    event_date: string
    remind_offset_days: number
    remind_date: string
    recurrence: 'once' | 'quarterly' | 'yearly'
    is_active: boolean
    last_triggered_at: string | null
    created_by: string | null
    created_at: string
}

export async function getScheduledEvents(departmentId: string): Promise<{ data: ScheduledEvent[] | null; error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: '尚未登入' }

    const { data, error } = await supabase
        .from('scheduled_events')
        .select('*')
        .eq('department_id', departmentId)
        .order('remind_date', { ascending: true })

    if (error) return { data: null, error: error.message }
    return { data: data as ScheduledEvent[], error: null }
}

export async function createScheduledEvent(
    departmentId: string,
    title: string,
    description: string,
    eventDate: string,
    remindOffsetDays: number,
    recurrence: 'once' | 'quarterly' | 'yearly'
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('scheduled_events')
        .insert({
            department_id: departmentId,
            title: title.trim(),
            description: description.trim() || null,
            event_date: eventDate,
            remind_offset_days: remindOffsetDays,
            recurrence,
            created_by: user.id,
        })

    if (error) return { error: `建立失敗：${error.message}` }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
}

export async function updateScheduledEvent(
    eventId: string,
    departmentId: string,
    title: string,
    description: string,
    eventDate: string,
    remindOffsetDays: number,
    recurrence: 'once' | 'quarterly' | 'yearly',
    isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('scheduled_events')
        .update({
            title: title.trim(),
            description: description.trim() || null,
            event_date: eventDate,
            remind_offset_days: remindOffsetDays,
            recurrence,
            is_active: isActive,
        })
        .eq('id', eventId)

    if (error) return { error: `更新失敗：${error.message}` }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
}

export async function deleteScheduledEvent(
    eventId: string,
    departmentId: string
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '尚未登入' }

    const { error } = await supabase
        .from('scheduled_events')
        .delete()
        .eq('id', eventId)

    if (error) return { error: `刪除失敗：${error.message}` }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
}
