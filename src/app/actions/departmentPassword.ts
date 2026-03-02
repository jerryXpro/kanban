'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcrypt'
import { isDepartmentManager } from '@/lib/api/admin'
import { revalidatePath } from 'next/cache'

export async function updateDepartmentPassword(departmentId: string, password: string | null) {
    const supabase = await createClient()

    // 1. Verify authorization (must be department manager)
    const isManager = await isDepartmentManager(departmentId)
    if (!isManager) {
        return { error: '您沒有權限設定此部門的密碼' }
    }

    let hashedPassword = null;
    if (password && password.trim().length > 0) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    // 2. Update database
    const { error } = await supabase
        .from('departments')
        .update({ password: hashedPassword })
        .eq('id', departmentId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
}

export async function verifyDepartmentPassword(departmentId: string, password: string) {
    const supabase = await createClient()

    // Get the department's hashed password
    const { data: dept, error } = await supabase
        .from('departments')
        .select('password')
        .eq('id', departmentId)
        .single()

    if (error || !dept) {
        return { error: '找不到該部門' }
    }

    if (!dept.password) {
        // No password set, allow
        return { success: true }
    }

    try {
        const isValid = await bcrypt.compare(password, dept.password)

        if (!isValid) {
            return { error: '密碼錯誤' }
        }

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set(`dept_unlock_${departmentId}`, 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        })

        return { success: true }
    } catch (err) {
        console.error('Password verification error:', err)
        return { error: '驗證時發生錯誤' }
    }
}
