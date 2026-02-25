import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Debug endpoint: returns the current user's profile as read by the server
// Visit /api/debug/me to check if permissions are correctly stored
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, role, is_admin, is_department_admin, can_manage_global_messages, can_manage_lists')
        .eq('id', user.id)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user_id: user.id, profile })
}
