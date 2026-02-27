import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data: dept, error: fetchErr } = await supabase.from('departments').select('id, name, parent_ids').limit(1).single()
    console.log('Target Dept:', dept)
    if (!dept) return

    // Try to update parent_ids to include a random new one (or just something different)
    const newParents = dept.parent_ids || []

    const { data, error } = await supabase
        .from('departments')
        .update({ parent_ids: newParents })
        .eq('id', dept.id)
        .select()

    console.log('Update Result Data:', data)
    console.log('Update Error:', error)
}

test()
