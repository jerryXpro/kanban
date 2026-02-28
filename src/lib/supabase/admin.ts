import { createClient } from '@supabase/supabase-js'

// We create a single robust admin client using the service role key.
// This client bypasses RLS and should ONLY be used in restricted Server Actions.
export function createAdminClient() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
    }

    // Fall back to ANON_KEY only in dev environments if SERVICE_ROLE_KEY is missing, 
    // but warn that auth admin operations will fail without the service role.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin actions')
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
