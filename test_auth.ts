import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

async function testUpdate() {
    // 假設 user 要編輯的是某個部門，我們先用 service role 模擬看看
    const { data: dept } = await supabase.from('departments').select().eq('name', '生產部').single()

    if (!dept) { console.log('dept not found'); return; }

    console.log('trying to update dept:', dept.id)

    const { error } = await supabase
        .from('departments')
        .update({ parent_ids: ['5ab0ff83-6893-41ec-914e-932ccdf83ec8'] })
        .eq('id', dept.id)

    console.log('error was:', error)
}
testUpdate()
