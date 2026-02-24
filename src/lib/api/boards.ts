import { createClient } from '@/lib/supabase/server'
import { Card, BoardWithDetails, ListWithCards } from '@/types/kanban'
import { getAncestorDepartmentIds } from '@/lib/api/admin'

/**
 * Fetch a specific board and all its nested lists and cards.
 * Also handles injecting "Global Announcements" and "Targeted Lists" from ancestor departments.
 */
export async function getBoardData(boardId: string): Promise<BoardWithDetails | null> {
    const supabase = await createClient()

    // 1. Fetch the requested Board to get its department_id
    const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

    if (boardError || !boardData) {
        console.error('Error fetching board:', boardError)
        return null
    }

    const { department_id } = boardData

    // 2. Fetch the Lists belonging to this board (regular lists)
    const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true })

    let allLists = listsData || []

    // 3. Inject Global Announcements and Targeted Lists from ancestors
    const ancestorIds = await getAncestorDepartmentIds(department_id)

    if (ancestorIds.length > 0) {
        // Find the boards belonging to these ancestors
        const { data: ancestorBoards } = await supabase
            .from('boards')
            .select('id')
            .in('department_id', ancestorIds)

        const ancestorBoardIds = ancestorBoards?.map(b => b.id) || []

        if (ancestorBoardIds.length > 0) {
            // Fetch global and targeted lists from these ancestor boards
            const { data: sharedLists } = await supabase
                .from('lists')
                .select('*')
                .in('board_id', ancestorBoardIds)
                .or(`and(is_global.eq.true,target_department_id.is.null),target_department_id.eq.${department_id}`)

            if (sharedLists && sharedLists.length > 0) {
                // Prepend shared lists to the left
                allLists = [...sharedLists, ...allLists]
            }
        }
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
