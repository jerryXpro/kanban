import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Cron Job: Auto-generate Kanban cards from scheduled events.
 * Called daily by Vercel Cron at midnight (UTC).
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(request: NextRequest) {
    // 1. Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env['CRON_SECRET']

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Use Service Role Key to bypass RLS
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 3. Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split('T')[0]

    // 4. Fetch all active events where remind_date = today and not yet triggered today
    const { data: events, error: fetchError } = await supabase
        .from('scheduled_events')
        .select('*')
        .eq('remind_date', today)
        .eq('is_active', true)

    if (fetchError) {
        console.error('Failed to fetch scheduled events:', fetchError.message)
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!events || events.length === 0) {
        return NextResponse.json({ message: 'No events to process today', generated: 0 })
    }

    // Filter out already-triggered events (same day)
    const eventsToProcess = events.filter(event => {
        if (!event.last_triggered_at) return true
        const lastTriggered = new Date(event.last_triggered_at).toISOString().split('T')[0]
        return lastTriggered !== today
    })

    if (eventsToProcess.length === 0) {
        return NextResponse.json({ message: 'All events already triggered today', generated: 0 })
    }

    let generatedCount = 0

    for (const event of eventsToProcess) {
        try {
            // 5. Find the department's board
            const { data: board } = await supabase
                .from('boards')
                .select('id')
                .eq('department_id', event.department_id)
                .eq('is_active', true)
                .single()

            if (!board) continue

            // 6. Find the first regular list in the board (not global, not anomaly)
            const { data: targetList } = await supabase
                .from('lists')
                .select('id')
                .eq('board_id', board.id)
                .eq('is_global', false)
                .is('list_type', null)
                .order('order', { ascending: true })
                .limit(1)
                .single()

            // If no regular list, try any non-global list
            let listId = targetList?.id
            if (!listId) {
                const { data: anyList } = await supabase
                    .from('lists')
                    .select('id')
                    .eq('board_id', board.id)
                    .eq('is_global', false)
                    .order('order', { ascending: true })
                    .limit(1)
                    .single()
                listId = anyList?.id
            }

            if (!listId) continue

            // 7. Get max order in target list
            const { data: maxOrderData } = await supabase
                .from('cards')
                .select('order')
                .eq('list_id', listId)
                .order('order', { ascending: false })
                .limit(1)
                .single()
            const newOrder = maxOrderData ? maxOrderData.order + 65536 : 65536

            // 8. Build card description
            const recurrenceLabel = event.recurrence === 'quarterly' ? '每季' : event.recurrence === 'yearly' ? '每年' : '一次性'
            const autoNote = `⏰ 排程提醒自動產生 (${recurrenceLabel})\n基準日期：${event.event_date}`
            const cardDescription = event.description
                ? `${autoNote}\n\n${event.description}`
                : autoNote

            // 9. Insert the card
            const { error: insertError } = await supabase
                .from('cards')
                .insert({
                    list_id: listId,
                    title: event.title,
                    description: cardDescription,
                    order: newOrder,
                    created_by: event.created_by,
                })

            if (insertError) {
                console.error(`Failed to create card for event ${event.id}:`, insertError.message)
                continue
            }

            generatedCount++

            // 10. Update last_triggered_at
            await supabase
                .from('scheduled_events')
                .update({ last_triggered_at: new Date().toISOString() })
                .eq('id', event.id)

            // 11. Handle recurrence: advance event_date for next cycle
            if (event.recurrence === 'quarterly') {
                const nextDate = new Date(event.event_date)
                nextDate.setMonth(nextDate.getMonth() + 3)
                await supabase
                    .from('scheduled_events')
                    .update({
                        event_date: nextDate.toISOString().split('T')[0],
                    })
                    .eq('id', event.id)
            } else if (event.recurrence === 'yearly') {
                const nextDate = new Date(event.event_date)
                nextDate.setFullYear(nextDate.getFullYear() + 1)
                await supabase
                    .from('scheduled_events')
                    .update({
                        event_date: nextDate.toISOString().split('T')[0],
                    })
                    .eq('id', event.id)
            } else {
                // One-time event: deactivate after triggering
                await supabase
                    .from('scheduled_events')
                    .update({ is_active: false })
                    .eq('id', event.id)
            }
        } catch (err) {
            console.error(`Error processing event ${event.id}:`, err)
        }
    }

    return NextResponse.json({
        message: `Generated ${generatedCount} card(s) from ${eventsToProcess.length} event(s)`,
        generated: generatedCount,
        processed: eventsToProcess.length,
    })
}
