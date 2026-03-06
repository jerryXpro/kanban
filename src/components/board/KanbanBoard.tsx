'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core'
import {
    SortableContext,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'
import { ListWithCards, Card, List, Profile, Department } from '@/types/kanban'
import KanbanList from './KanbanList'
import KanbanCard from './KanbanCard'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { markCardsAsRead, updateCardPosition } from '@/app/actions/cards'
import { updateListOrder } from '@/app/actions/department'

interface KanbanBoardProps {
    initialLists: ListWithCards[]
    userProfile?: Profile
    boardId: string
    departmentId: string
    departments?: Department[]
    systemUsers?: { id: string, full_name: string | null, role: string }[]
}

// Float order calculation helper
const calculateNewOrder = (items: { order: number }[], newIndex: number) => {
    const prevOrder = newIndex > 0 ? items[newIndex - 1].order : 0
    const nextOrder = newIndex < items.length - 1 ? items[newIndex + 1].order : prevOrder + 2.0
    return (prevOrder + nextOrder) / 2.0
}

export default function KanbanBoard({ initialLists, userProfile, boardId, departmentId, departments = [], systemUsers = [] }: KanbanBoardProps) {
    const [lists, setLists] = useState<ListWithCards[]>(initialLists)
    const listsRef = useRef<ListWithCards[]>(initialLists)
    // Keep listsRef in sync with the latest lists state
    useEffect(() => { listsRef.current = lists }, [lists])
    const [activeCard, setActiveCard] = useState<Card | null>(null)
    const [activeList, setActiveList] = useState<ListWithCards | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    // List Creation State
    const [isAddingList, setIsAddingList] = useState(false)
    const [newListTitle, setNewListTitle] = useState('')



    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    const canAddList = userProfile?.can_manage_lists || false


    const supabase = createClient()

    // Tracks IDs of cards that are currently being dragged or awaiting DB update,
    // so that Realtime subscription doesn't override optimistic UI state and cause jumping/reverting.
    const pendingCardUpdateIdsRef = useRef<Set<string>>(new Set())

    // Track ONLY the list IDs that belong to THIS board (not inherited shared lists from ancestors).
    // This prevents Realtime card INSERTs (e.g. anomaly cards inserted into a parent dept's list)
    // from accidentally appearing in sibling department boards via Realtime broadcast.
    const ownBoardListIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        setIsMounted(true)

        // Auto-mark cards as read
        const unreadCardIds = initialLists.flatMap(list => list.cards)
            .filter(c => c.card_type === 'anomaly' && c.source_department_id !== departmentId)
            .filter(c => !c.read_receipts?.some(r => r.department_id === departmentId))
            .map(c => c.id)

        if (unreadCardIds.length > 0) {
            markCardsAsRead(unreadCardIds, departmentId).catch(console.error)
        }
    }, [initialLists, departmentId])

    // Keep ownBoardListIdsRef populated with the lists that belong to this specific board
    useEffect(() => {
        const fetchOwnListIds = async () => {
            const { data } = await supabase
                .from('lists')
                .select('id')
                .eq('board_id', boardId)
            if (data) {
                ownBoardListIdsRef.current = new Set(data.map((l: { id: string }) => l.id))
            }
        }
        fetchOwnListIds()
    }, [boardId])

    // -------------------------------------------------------------
    // Real-time Subscription Setup
    // -------------------------------------------------------------
    useEffect(() => {
        const channel = supabase.channel('board-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'cards' },
                (payload) => {
                    const newCard = payload.new as Card
                    const oldCard = payload.old as Card

                    if (payload.eventType === 'INSERT') {
                        setLists(current => {
                            const targetList = current.find(l => l.id === newCard.list_id)
                            if (!targetList) return current // Not on our board

                            if (!ownBoardListIdsRef.current.has(newCard.list_id)) {
                                // It's a shared/ancestor list
                                if (newCard.card_type === 'anomaly') {
                                    // Only the source department should see it injected into an ancestor list
                                    if (newCard.source_department_id !== departmentId) return current
                                }
                            }

                            return current.map(list =>
                                list.id === newCard.list_id
                                    ? { ...list, cards: [...list.cards, newCard].sort((a, b) => a.order - b.order) }
                                    : list
                            )
                        })
                    } else if (payload.eventType === 'UPDATE') {
                        setLists(current => {
                            const targetList = current.find(l => l.id === newCard.list_id)
                            // If it's moved to a list NOT on our board, we still might need to remove it from old list
                            // so we will process removing it first anyway.

                            let visible = true
                            if (targetList && !ownBoardListIdsRef.current.has(newCard.list_id)) {
                                if (newCard.card_type === 'anomaly') {
                                    if (newCard.source_department_id !== departmentId) visible = false
                                }
                            }

                            // If this card is currently being dragged/updated locally, ignore incoming server UPDATE
                            // so it doesn't revert our optimistic state.
                            if (pendingCardUpdateIdsRef.current.has(newCard.id)) return current

                            const removedList = current.map(list => ({
                                ...list,
                                cards: list.cards.filter(c => c.id !== newCard.id)
                            }))

                            if (!targetList || !visible) return removedList

                            return removedList.map(list =>
                                list.id === newCard.list_id
                                    ? { ...list, cards: [...list.cards, newCard].sort((a, b) => a.order - b.order) }
                                    : list
                            )
                        })
                    } else if (payload.eventType === 'DELETE') {
                        setLists(current => current.map(list => ({
                            ...list,
                            cards: list.cards.filter(c => c.id !== oldCard.id)
                        })))
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lists' },
                (payload) => {
                    const newList = payload.new as List
                    const oldList = payload.old as List

                    if (payload.eventType === 'INSERT') {
                        // Only add if it belongs to this board
                        if (newList.board_id === boardId) {
                            ownBoardListIdsRef.current.add(newList.id)
                            setLists(current => {
                                // Prevent duplicates if the client created it and already pushed it somehow
                                if (current.find(l => l.id === newList.id)) return current
                                return [...current, { ...newList, cards: [] }].sort((a, b) => a.order - b.order)
                            })
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setLists(current => current.map(list =>
                            list.id === newList.id ? { ...list, ...newList } : list
                        ).sort((a, b) => a.order - b.order))
                    } else if (payload.eventType === 'DELETE') {
                        ownBoardListIdsRef.current.delete(oldList.id)
                        setLists(current => current.filter(list => list.id !== oldList.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, boardId])


    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    )

    const findListByCardId = (cardId: string, currentLists: ListWithCards[]) => {
        return currentLists.find((list) => list.cards.some((card) => card.id === cardId))
    }

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const data = active.data.current

        if (data?.type === 'List') {
            setActiveList(data.list)
        } else if (data?.type === 'Card') {
            setActiveCard(data.card)
            pendingCardUpdateIdsRef.current.add(data.card.id)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string
        if (activeId === overId) return

        const isActiveACard = active.data.current?.type === 'Card'
        const isOverACard = over.data.current?.type === 'Card'
        const isOverAColumn = over.data.current?.type === 'List'

        if (!isActiveACard) return

        if (isActiveACard && isOverACard) {
            setLists((currentLists) => {
                const activeList = findListByCardId(activeId, currentLists)
                const overList = findListByCardId(overId, currentLists)

                if (!activeList || !overList) return currentLists

                const activeIndex = currentLists.findIndex(l => l.id === activeList.id)
                const overIndex = currentLists.findIndex(l => l.id === overList.id)

                // Prevent dragging in or out of global or anomaly lists
                if (activeList.is_global || overList.is_global || activeList.list_type === 'anomaly' || overList.list_type === 'anomaly') return currentLists

                const activeCardIndex = activeList.cards.findIndex((c) => c.id === activeId)
                const overCardIndex = overList.cards.findIndex((c) => c.id === overId)

                if (activeIndex === overIndex) {
                    const newCards = arrayMove(activeList.cards, activeCardIndex, overCardIndex)
                    const newLists = [...currentLists]
                    newLists[activeIndex] = { ...activeList, cards: newCards }
                    return newLists
                } else {
                    const newLists = [...currentLists]
                    const [movedCard] = newLists[activeIndex].cards.splice(activeCardIndex, 1)
                    movedCard.list_id = overList.id
                    newLists[overIndex].cards.splice(overCardIndex, 0, movedCard)
                    return newLists
                }
            })
        }

        if (isActiveACard && isOverAColumn) {
            setLists((currentLists) => {
                const activeList = findListByCardId(activeId, currentLists)
                const overIndex = currentLists.findIndex((l) => l.id === overId)

                if (!activeList || overIndex === -1) return currentLists

                const activeIndex = currentLists.findIndex(l => l.id === activeList.id)
                const overList = currentLists[overIndex]

                // Prevent dragging in or out of global or anomaly lists
                if (activeList.is_global || overList.is_global || activeList.list_type === 'anomaly' || overList.list_type === 'anomaly') return currentLists

                const newLists = [...currentLists]
                const activeCardIndex = newLists[activeIndex].cards.findIndex((c) => c.id === activeId)
                const [movedCard] = newLists[activeIndex].cards.splice(activeCardIndex, 1)
                movedCard.list_id = overList.id
                newLists[overIndex].cards.push(movedCard)
                return newLists
            })
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveCard(null)
        setActiveList(null)

        const { active, over } = event
        console.log('[DragEnd] active:', active.id, 'over:', over?.id, 'activeType:', active.data.current?.type)
        if (!over) {
            console.log('[DragEnd] No over target, returning')
            pendingCardUpdateIdsRef.current.delete(active.id as string)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        const isActiveAColumn = active.data.current?.type === 'List'
        const isActiveACard = active.data.current?.type === 'Card'

        // Handling List Drop (lists use activeId !== overId to detect actual movement)
        if (isActiveAColumn) {
            if (activeId === overId) return
            if (!canAddList) {
                alert(dict.permission_denied_list)
                return
            }

            const currentLists = lists
            const activeListIndex = currentLists.findIndex((col) => col.id === activeId)

            let overListIndex: number
            const isOverACard = over.data.current?.type === 'Card'
            if (isOverACard) {
                const overList = findListByCardId(overId, currentLists)
                overListIndex = currentLists.findIndex(l => l.id === overList?.id)
            } else {
                overListIndex = currentLists.findIndex((col) => col.id === overId)
            }

            if (activeListIndex === -1 || overListIndex === -1) return

            if (currentLists[activeListIndex]?.is_global || currentLists[activeListIndex]?.list_type === 'anomaly' || (overListIndex === 0 && currentLists[0]?.is_global)) return

            const reorderedLists = arrayMove(currentLists, activeListIndex, overListIndex)
            const newOrder = calculateNewOrder(reorderedLists, overListIndex)
            reorderedLists[overListIndex] = { ...reorderedLists[overListIndex], order: newOrder }

            setLists(reorderedLists)

            const { error } = await updateListOrder(activeId, newOrder)
            if (error) console.error("Failed to update list order:", error)
            else console.log('[DragEnd] List order updated successfully')
        }

        // Handling Card Drop — read from listsRef.current for latest state (React 18 batches setLists)
        if (isActiveACard) {
            console.log('[DragEnd] Card drop detected for card:', activeId)

            // Read the LATEST state directly from the ref
            const currentLists = listsRef.current
            const listWithCard = findListByCardId(activeId, currentLists)
            console.log('[DragEnd] Found card in list:', listWithCard?.id, 'is_global:', listWithCard?.is_global, 'list_type:', listWithCard?.list_type)

            if (!listWithCard || listWithCard.is_global || listWithCard.list_type === 'anomaly') {
                console.log('[DragEnd] Skipping: card in global/anomaly list or not found')
                pendingCardUpdateIdsRef.current.delete(activeId)
                return
            }

            const cardIndex = listWithCard.cards.findIndex(c => c.id === activeId)
            const finalTargetListId = listWithCard.id
            const finalTargetCardOrder = calculateNewOrder(listWithCard.cards, cardIndex)
            console.log('[DragEnd] Computed target:', { finalTargetListId, finalTargetCardOrder, cardIndex, totalCards: listWithCard.cards.length })

            // Update local state optimistically
            setLists((prev) => {
                const list = findListByCardId(activeId, prev)
                if (!list) return prev
                const idx = list.cards.findIndex(c => c.id === activeId)
                const newCards = [...list.cards]
                newCards[idx] = { ...newCards[idx], order: finalTargetCardOrder, list_id: finalTargetListId }
                return prev.map(l => l.id === list.id ? { ...list, cards: newCards } : l)
            })

            // Persist to DB
            console.log('[DragEnd] Calling updateCardPosition...')
            const res = await updateCardPosition(activeId, finalTargetListId, finalTargetCardOrder)
            console.log('[DragEnd] updateCardPosition result:', res)
            if (res?.error) console.error('Failed to update card position:', res.error)

            setTimeout(() => {
                pendingCardUpdateIdsRef.current.delete(activeId)
            }, 3000)
        }
    }

    const handleAddList = async () => {
        if (!newListTitle.trim()) {
            setIsAddingList(false)
            return
        }

        const maxOrder = lists.length > 0 ? Math.max(...lists.map(l => l.order)) : 0
        const newOrder = maxOrder + 65536 // Add a large gap for floating order

        const payload: any = {
            board_id: boardId,
            title: newListTitle.trim(),
            order: newOrder,
            is_global: false,
        }

        const { error } = await supabase.from('lists').insert(payload)

        if (!error) {
            setNewListTitle('')
            setIsAddingList(false)
        } else {
            console.error(error)
            alert(dict.add_list_failed)
        }
    }

    if (!isMounted) {
        return (
            <div className="flex w-full gap-6 overflow-x-auto pb-8 snap-x snap-mandatory px-4 md:px-8 scrollbar-hide">
                {lists.map((list) => (
                    <div key={list.id} className="w-[300px] shrink-0 h-[100px] rounded-xl bg-slate-100/50 animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex w-full gap-6 overflow-x-auto pb-8 snap-x snap-mandatory px-4 md:px-8 scrollbar-hide">
                <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
                    {lists.length === 0 && (userProfile?.is_admin || userProfile?.is_department_admin) && (
                        <div className="flex flex-col items-center justify-center w-full py-16 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-60"><path d="M11 12H3" /><path d="M16 6H3" /><path d="M16 18H3" /><path d="M18 9v6" /><path d="M21 12h-6" /></svg>
                            <h3 className="text-lg font-medium mb-1 opacity-90">{dict.no_lists_prompt || '看板尚無列表'}</h3>
                            <p className="text-sm opacity-60 mb-5">{dict.no_lists_desc || '點擊下方按鈕快速建立預設列表'}</p>
                            <button
                                onClick={async () => {
                                    const { createDefaultLists } = await import('@/app/actions/department')
                                    const res = await createDefaultLists(boardId, departmentId)
                                    if (res.error) alert(res.error)
                                    else window.location.reload()
                                }}
                                className="px-6 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium text-sm transition-colors border border-white/20"
                            >
                                {dict.default_lists_create_btn || '📋 一鍵建立預設列表'}
                            </button>
                        </div>
                    )}
                    {lists.map((list) => (
                        <KanbanList key={list.id} list={list} cards={list.cards} userProfile={userProfile} boardId={boardId} departments={departments} systemUsers={systemUsers} />
                    ))}
                </SortableContext>

                {/* Add new list inline form / button conditionally based on role */}
                {canAddList && (
                    isAddingList ? (
                        <div className="w-[300px] shrink-0 h-fit p-3 rounded-xl bg-white/80 border-2 border-indigo-200 snap-center shadow-sm flex flex-col gap-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder={dict.enter_list_title}
                                className="w-full p-2 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                value={newListTitle}
                                onChange={(e) => setNewListTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddList()
                                    if (e.key === 'Escape') {
                                        setNewListTitle('')
                                        setIsAddingList(false)
                                    }
                                }}
                            />


                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={handleAddList}
                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 transition"
                                >
                                    {dict.add}
                                </button>
                                <button
                                    onClick={() => {
                                        setNewListTitle('')
                                        setIsAddingList(false)
                                    }}
                                    className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => setIsAddingList(true)}
                            className="w-[300px] shrink-0 h-14 rounded-xl bg-white/50 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-white/80 transition flex items-center justify-center cursor-pointer text-slate-500 font-medium snap-center"
                        >
                            {dict.add_list}
                        </div>
                    )
                )}
            </div>

            <DragOverlay>
                {activeList ? (
                    <KanbanList list={activeList} cards={activeList.cards} userProfile={userProfile} isOverlay departments={departments} systemUsers={systemUsers} />
                ) : null}
                {activeCard ? <KanbanCard card={activeCard} isGlobalList={false} userProfile={userProfile} isOverlay departments={departments} systemUsers={systemUsers} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
