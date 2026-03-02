import { createAdminClient } from './src/lib/supabase/admin'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function testCreate() {
    const supabaseAdmin = createAdminClient()
    const email = 'test_new_crash@example.com'
    const password = 'kanban1234'
    const fullName = 'Crash Test Dummy'

    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName
        }
    })

    if (authError) {
        console.error('Auth Error:', authError)
        return
    }

    const newUserId = authData.user.id
    console.log('Created auth user:', newUserId)

    console.log('Updating profile...')
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: fullName,
            department_id: null,
            role: 'Tester',
            is_department_admin: false
        })
        .eq('id', newUserId)

    if (profileError) {
        console.error('Profile Error:', profileError)
    } else {
        console.log('Profile updated.')
    }

    // Check if the profile exists
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', newUserId).single()
    console.log('Profile fetch:', profile)
}

testCreate()
