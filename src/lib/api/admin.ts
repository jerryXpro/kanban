import { createClient } from '@/lib/supabase/server'

export async function isDepartmentManager(departmentId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, is_department_admin, department_id')
        .eq('id', user.id)
        .single()

    if (!profile) return false

    // Global admins can manage everything
    if (profile.is_admin) return true

    // If not a department admin, they can't manage
    if (!profile.is_department_admin || !profile.department_id) return false

    // Check if the target department is a descendant of the user's department
    return isDescendant(profile.department_id, departmentId)
}

// Recursively queries upward to see if childDeptId is a descendant of ancestorDeptId
export async function isDescendant(ancestorDeptId: string, childDeptId: string): Promise<boolean> {
    if (ancestorDeptId === childDeptId) return true

    const supabase = await createClient()

    let currentId: string | null = childDeptId
    let attempts = 0
    const MAX_DEPTH = 10 // Prevent infinite loops in case of circular references

    while (currentId && attempts < MAX_DEPTH) {
        if (currentId === ancestorDeptId) return true

        const { data: deptData, error } = await supabase
            .from('departments')
            .select('parent_id')
            .eq('id', currentId)
            .single()

        if (error || !deptData || !deptData.parent_id) {
            return false // Reached root without finding ancestor
        }

        currentId = deptData.parent_id
        attempts++
    }

    return false
}

// Retrieves all ancestor department IDs for a given department, starting from parent to root
export async function getAncestorDepartmentIds(departmentId: string): Promise<string[]> {
    const supabase = await createClient()
    const ancestors: string[] = []

    let currentId: string | null = departmentId
    let attempts = 0
    const MAX_DEPTH = 10

    while (currentId && attempts < MAX_DEPTH) {
        const { data, error } = await supabase
            .from('departments')
            .select('parent_id')
            .eq('id', currentId)
            .single()

        const deptData = data as { parent_id: string | null } | null

        if (error || !deptData || !deptData.parent_id) {
            break // Reached root or error
        }

        ancestors.push(deptData.parent_id)
        currentId = deptData.parent_id
        attempts++
    }

    return ancestors
}
