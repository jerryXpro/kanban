// check_cards.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCards() {
    const { data, error } = await supabase
        .from('cards')
        .select('*, list:lists(title, board_id), author:profiles!created_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching cards:', error)
        return
    }

    console.log('Latest 10 cards:')
    console.dir(data, { depth: null })
}

checkCards()
