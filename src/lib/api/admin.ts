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

    let currentIds: string[] = [childDeptId]
    let attempts = 0
    const MAX_DEPTH = 10 // Prevent infinite loops in case of circular references

    while (currentIds.length > 0 && attempts < MAX_DEPTH) {
        if (currentIds.includes(ancestorDeptId)) return true

        const { data, error } = await supabase
            .from('departments')
            .select('parent_ids')
            .in('id', currentIds)

        if (error || !data) break

        const nextIds = new Set<string>()
        for (const row of data) {
            const pIds = row.parent_ids as string[] | null
            if (pIds) pIds.forEach(id => nextIds.add(id))
        }

        currentIds = Array.from(nextIds)
        attempts++
    }

    return false
}

// Retrieves all ancestor department IDs for a given department, starting from parent to root
export async function getAncestorDepartmentIds(departmentId: string): Promise<string[]> {
    const supabase = await createClient()
    const ancestors = new Set<string>()

    let currentIds: string[] = [departmentId]
    let attempts = 0
    const MAX_DEPTH = 10

    while (currentIds.length > 0 && attempts < MAX_DEPTH) {
        const { data, error } = await supabase
            .from('departments')
            .select('parent_ids')
            .in('id', currentIds)

        if (error || !data) break

        const nextIds = new Set<string>()
        for (const row of data) {
            const pIds = row.parent_ids as string[] | null
            if (pIds) {
                pIds.forEach(id => {
                    if (!ancestors.has(id)) {
                        ancestors.add(id)
                        nextIds.add(id)
                    }
                })
            }
        }

        currentIds = Array.from(nextIds)
        attempts++
    }

    return Array.from(ancestors)
}
