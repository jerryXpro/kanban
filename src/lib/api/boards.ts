import { createClient } from '@/lib/supabase/server'
import { Card, BoardWithDetails, ListWithCards } from '@/types/kanban'
import { getAncestorDepartmentIds } from '@/lib/api/admin'

/**
 * Fetch a specific board and all its nested lists and cards.
 * Also handles injecting "Global Announcements" and "Targeted Lists" from ancestor departments.
 *
 * Visibility rules for anomaly cards (card_type === 'anomaly') in shared/ancestor lists:
 *   - Only visible to the TARGET department (the board being viewed — in its OWN lists)
 *   - Only visible to the SOURCE department (source_department_id === current department)
 *   - NOT visible to sibling departments
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

    // 2. Fetch the Lists belonging to this board (regular/own lists)
    const { data: listsData } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true })

    const ownLists = listsData || []
    const ownListIds = new Set(ownLists.map((l: any) => l.id))
    let sharedLists: any[] = []

    // 3. Inject Global Announcements and Targeted Lists from ancestors
    const ancestorIds = await getAncestorDepartmentIds(department_id)

    if (ancestorIds.length > 0) {
        // Find the boards belonging to these ancestors
        const { data: ancestorBoards } = await supabase
            .from('boards')
            .select('id')
            .in('department_id', ancestorIds)

        const ancestorBoardIds = ancestorBoards?.map((b: any) => b.id) || []

        if (ancestorBoardIds.length > 0) {
            // Fetch global and targeted lists from these ancestor boards
            const { data: fetchedSharedLists } = await supabase
                .from('lists')
                .select('*')
                .in('board_id', ancestorBoardIds)
                .or(`and(is_global.eq.true,target_department_id.is.null),target_department_id.eq.${department_id}`)

            if (fetchedSharedLists && fetchedSharedLists.length > 0) {
                sharedLists = fetchedSharedLists
            }
        }
    }

    // Combine: shared lists first (prepended), then own lists
    const allLists = [...sharedLists, ...ownLists]
    const sharedListIds = new Set(sharedLists.map((l: any) => l.id))

    // 4. Fetch all Cards that belong to the combined lists
    const listIds = allLists.map((l: any) => l.id)
    let allCards: Card[] = []

    if (listIds.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*, author:profiles!created_by(id, full_name, role)')
            .in('list_id', listIds)
            .order('order', { ascending: true })

        if (!cardsError && cardsData) {
            // Visibility filter: anomaly cards in shared (ancestor) lists are ONLY visible to:
            //   a) The TARGET department board: anomaly cards are inserted directly into OWN lists,
            //      so they come through via ownListIds and are always visible.
            //   b) The SOURCE department (source_department_id === department_id): they see their own reports
            //      reflected in the ancestor's shared list view.
            //
            // Result: sibling departments (C, D, ...) do NOT see B's anomaly reports to A.
            allCards = (cardsData as Card[]).filter(card => {
                // Cards in own lists are always visible (this is the target department's view)
                if (ownListIds.has(card.list_id)) return true

                // Cards from injected ancestor/shared lists:
                if (sharedListIds.has(card.list_id)) {
                    // Non-anomaly cards (global announcements, tasks) remain visible
                    if (card.card_type !== 'anomaly') return true

                    // Anomaly cards: only show if THIS department sent it
                    return card.source_department_id === department_id
                }

                return true
            })
        }
    }

    // 5. Assemble the structured nested payload
    const listsWithNestedCards: ListWithCards[] = allLists.map((list: any) => ({
        ...list,
        cards: allCards.filter(c => c.list_id === list.id)
    }))

    return {
        ...boardData,
        lists: listsWithNestedCards
    }
}
