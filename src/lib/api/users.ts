'use server'

import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createUser(data: {
    email: string
    password?: string
    fullName: string
    departmentId: string | null
    role: string
    isDepartmentAdmin: boolean
}) {
    // 1. Authenticate and Authorize
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return { success: false, error: 'Permission denied: Global Admin access required' }
    }

    // 2. Initialize Admin Client
    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient()
    } catch (e: any) {
        return { success: false, error: 'Server misconfiguration: ' + e.message }
    }

    // 3. Create User in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password || 'kanban1234', // default password if not provided
        email_confirm: true,
        user_metadata: {
            full_name: data.fullName
        }
    })

    if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user in Auth' }
    }

    const newUserId = authData.user.id

    // 4. Update the Profile record (created automatically via trigger in DB, so we just update it)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: data.fullName,
            department_id: data.departmentId,
            role: data.role,
            is_department_admin: data.isDepartmentAdmin
        })
        .eq('id', newUserId)

    if (profileError) {
        // Warning: user created in Auth but profile update failed.
        // We shouldn't delete the user automatically here just in case, but return the error.
        return { success: false, error: 'User created but profile update failed: ' + profileError.message }
    }

    revalidatePath('/admin/settings')
    return { success: true, user: authData.user }
}

export async function deleteUser(userId: string) {
    // 1. Authenticate and Authorize
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    if (user.id === userId) {
        return { success: false, error: 'You cannot delete your own account' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return { success: false, error: 'Permission denied: Global Admin access required' }
    }

    // 2. Initialize Admin Client
    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient()
    } catch (e: any) {
        return { success: false, error: 'Server misconfiguration: ' + e.message }
    }

    // 3. Delete User from Auth
    // Because auth.users is tied with cascade deletes down to profiles, this should clear the DB.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}
