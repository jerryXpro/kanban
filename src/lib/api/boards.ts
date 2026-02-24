import { createClient } from '@/lib/supabase/server'
import { Card, BoardWithDetails, ListWithCards } from '@/types/kanban'

/**
 * Fetch a specific board and all its nested lists and cards.
 * Also handles injecting the "Global Announcements" list if the board is a department board.
 */
export async function getBoardData(boardId: string): Promise<BoardWithDetails | null> {
    const supabase = await createClient()

    // 1. Fetch the requested Board
    const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

    if (boardError || !boardData) {
        console.error('Error fetching board:', boardError)
        return null
    }

    // 2. Fetch the Lists belonging to this board (regular lists)
    const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true })

    let allLists = listsData || []

    // 3. Inject Global Announcements List
    // We look for any list where is_global is true. 
    // In a real app you might want only 1 specific global list per company.
    const { data: globalLists } = await supabase
        .from('lists')
        .select('*')
        .eq('is_global', true)

    if (globalLists && globalLists.length > 0) {
        // Put global list at the very beginning (leftmost column)
        const mainGlobalList = globalLists[0]
        allLists = [mainGlobalList, ...allLists]
    }

    // 4. Fetch all Cards that belong to the combined lists
    const listIds = allLists.map(l => l.id)
    let allCards: Card[] = []

    if (listIds.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .in('list_id', listIds)
            .order('order', { ascending: true })

        if (!cardsError && cardsData) {
            allCards = cardsData
        }
    }

    // 5. Assemble the structured nested payload
    const listsWithNestedCards: ListWithCards[] = allLists.map(list => ({
        ...list,
        // Attach cards that match this list_id
        cards: allCards.filter(c => c.list_id === list.id)
    }))

    return {
        ...boardData,
        lists: listsWithNestedCards
    }
}
