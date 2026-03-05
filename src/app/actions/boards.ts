'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isDepartmentManager } from '@/lib/api/admin'

export async function updateBoardTheme(boardId: string, departmentId: string, backgroundColor: string) {
    const supabase = await createClient()

    // Verify user is authorized to manage this department
    const isManager = await isDepartmentManager(departmentId)
    if (!isManager) {
        return { error: 'Unauthorized to update this board theme' }
    }

    // Update board background color
    const { error } = await supabase
        .from('boards')
        .update({ background_color: backgroundColor })
        .eq('id', boardId)

    if (error) {
        console.error('Update Board Theme Error:', error)
        return { error: error.message || '更新看板顏色失敗' }
    }

    revalidatePath(`/department/${departmentId}`)
    return { success: true }
}
