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

interface KanbanBoardProps {
    initialLists: ListWithCards[]
    userProfile?: Profile
    boardId: string
    departments?: Department[]
}

// Float order calculation helper
const calculateNewOrder = (items: { order: number }[], newIndex: number) => {
    const prevOrder = newIndex > 0 ? items[newIndex - 1].order : 0
    const nextOrder = newIndex < items.length - 1 ? items[newIndex + 1].order : prevOrder + 2.0
    return (prevOrder + nextOrder) / 2.0
}

export default function KanbanBoard({ initialLists, userProfile, boardId, departments = [] }: KanbanBoardProps) {
    const [lists, setLists] = useState<ListWithCards[]>(initialLists)
    const [activeCard, setActiveCard] = useState<Card | null>(null)
    const [activeList, setActiveList] = useState<ListWithCards | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    // List Creation State
    const [isAddingList, setIsAddingList] = useState(false)
    const [newListTitle, setNewListTitle] = useState('')

    // New Hierarchy/Targeting State
    const [isGlobalList, setIsGlobalList] = useState(false)
    const [targetDepartmentId, setTargetDepartmentId] = useState<string>('none')

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    const canAddList = userProfile?.can_manage_lists || false
    const canManageGlobal = userProfile?.can_manage_global_messages || false

    const supabase = createClient()

    // Track ONLY the list IDs that belong to THIS board (not inherited shared lists from ancestors).
    // This prevents Realtime card INSERTs (e.g. anomaly cards inserted into a parent dept's list)
    // from accidentally appearing in sibling department boards via Realtime broadcast.
    const ownBoardListIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        setIsMounted(true)
    }, [])

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
                        // Only handle INSERT for lists that belong to THIS board.
                        // Anomaly cards are inserted into the PARENT dept's list, so their
                        // list_id won't be in ownBoardListIds — this prevents them from
                        // showing up on sibling department boards via Realtime.
                        if (!ownBoardListIdsRef.current.has(newCard.list_id)) return

                        setLists(current => current.map(list =>
                            list.id === newCard.list_id
                                ? { ...list, cards: [...list.cards, newCard].sort((a, b) => a.order - b.order) }
                                : list
                        ))
                    } else if (payload.eventType === 'UPDATE') {
                        setLists(current => {
                            const removedList = current.map(list => ({
                                ...list,
                                cards: list.cards.filter(c => c.id !== newCard.id)
                            }))
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

                // Prevent dragging in or out of global lists
                if (activeList.is_global || overList.is_global) return currentLists

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

                // Prevent dragging in or out of global lists
                if (activeList.is_global || overList.is_global) return currentLists

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
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string
        if (activeId === overId) return

        const isActiveAColumn = active.data.current?.type === 'List'
        const isActiveACard = active.data.current?.type === 'Card'

        // Handling List Drop
        if (isActiveAColumn) {
            if (!canAddList) {
                alert(dict.permission_denied_list)
                return
            }

            let activeListIndex = 0
            let overListIndex = 0
            let newLists: ListWithCards[] = []

            setLists((currentLists) => {
                activeListIndex = currentLists.findIndex((col) => col.id === activeId)

                const isOverACard = over.data.current?.type === 'Card'
                if (isOverACard) {
                    const overList = findListByCardId(overId, currentLists)
                    overListIndex = currentLists.findIndex(l => l.id === overList?.id)
                } else {
                    overListIndex = currentLists.findIndex((col) => col.id === overId)
                }

                if (activeListIndex === -1 || overListIndex === -1) {
                    newLists = currentLists
                    return currentLists
                }

                // Prevent dragging global list or moving things before global list
                if (currentLists[activeListIndex]?.is_global || overListIndex === 0 && currentLists[0]?.is_global) {
                    newLists = currentLists
                    return currentLists
                }

                newLists = arrayMove(currentLists, activeListIndex, overListIndex)

                // Assign new orders
                const newOrder = calculateNewOrder(newLists, overListIndex)
                newLists[overListIndex].order = newOrder

                return newLists
            })

            // Async DB Update
            if (newLists.length && newLists[overListIndex]) {
                await supabase.from('lists').update({ order: newLists[overListIndex].order }).eq('id', activeId)
            }
        }

        // Handling Card Drop
        if (isActiveACard) {
            let targetListId = ''
            let targetCardOrder = 0
            let shouldUpdateDB = false

            setLists((currentLists) => {
                // Find where the card ended up (from handleDragOver optimistic updates)
                const listWithCard = findListByCardId(activeId, currentLists)
                if (!listWithCard || listWithCard.is_global) return currentLists

                const cardIndex = listWithCard.cards.findIndex(c => c.id === activeId)
                targetListId = listWithCard.id
                targetCardOrder = calculateNewOrder(listWithCard.cards, cardIndex)

                const newLists = [...currentLists]
                const listIndex = newLists.findIndex(l => l.id === listWithCard.id)
                newLists[listIndex].cards[cardIndex].order = targetCardOrder

                shouldUpdateDB = true
                return newLists
            })

            // Async DB Update
            if (shouldUpdateDB && targetListId) {
                await supabase.from('cards').update({ list_id: targetListId, order: targetCardOrder }).eq('id', activeId)
            }
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
        }

        if (canManageGlobal) {
            payload.is_global = isGlobalList
            payload.target_department_id = targetDepartmentId !== 'none' ? targetDepartmentId : null
        } else {
            payload.is_global = false
        }

        const { error } = await supabase.from('lists').insert(payload)

        if (!error) {
            setNewListTitle('')
            setIsGlobalList(false)
            setTargetDepartmentId('none')
            setIsAddingList(false)
        } else {
            console.error(error)
            alert(dict.add_list_failed)
        }
    }

    if (!isMounted) {
        return (
            <div className="flex w-full gap-6 overflow-x-auto pb-8 snap-x snap-mandatory px-4 md:px-8">
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
            <div className="flex w-full gap-6 overflow-x-auto pb-8 snap-x snap-mandatory px-4 md:px-8">
                <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
                    {lists.map((list) => (
                        <KanbanList key={list.id} list={list} cards={list.cards} userProfile={userProfile} departments={departments} />
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

                            {canManageGlobal && (
                                <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-md border border-slate-100 text-xs">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={isGlobalList}
                                            onChange={(e) => setIsGlobalList(e.target.checked)}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Make Global (All sub-departments)
                                    </label>

                                    {isGlobalList && departments && departments.length > 0 && (
                                        <div className="flex flex-col gap-1 mt-1">
                                            <span className="text-slate-500">Target Specific Sub-department:</span>
                                            <select
                                                value={targetDepartmentId}
                                                onChange={(e) => setTargetDepartmentId(e.target.value)}
                                                className="w-full p-1.5 rounded border border-slate-200 text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none"
                                            >
                                                <option value="none">-- All Sub-departments --</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

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
                    <KanbanList list={activeList} cards={activeList.cards} userProfile={userProfile} isOverlay departments={departments} />
                ) : null}
                {activeCard ? <KanbanCard card={activeCard} isGlobalList={false} userProfile={userProfile} isOverlay departments={departments} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
