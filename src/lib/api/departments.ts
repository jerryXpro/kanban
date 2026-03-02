import { createClient } from '@/lib/supabase/server'
import { Department } from '@/types/kanban'

export async function getDepartments(): Promise<Department[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching departments:', error)
        return []
    }

    return (data || []).map((dept: any) => {
        const { password, ...rest } = dept;
        return {
            ...rest,
            has_password: !!password,
        };
    }) as Department[];
}
