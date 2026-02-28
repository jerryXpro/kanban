'use client'

import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ListWithCards, Card, Profile } from '@/types/kanban'
import KanbanCard from './KanbanCard'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { toast } from 'sonner'

interface KanbanListProps {
    list: ListWithCards
    cards: Card[]
    userProfile?: Profile
    isOverlay?: boolean
    departments?: { id: string, name: string }[]
    systemUsers?: { id: string, full_name: string | null, role: string }[]
}

export default function KanbanList({ list, cards, userProfile, isOverlay, departments = [], systemUsers = [] }: KanbanListProps) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
        useSortable({
            id: list.id,
            data: {
                type: 'List',
                list,
            },
        })

    const [isAddingCard, setIsAddingCard] = useState(false)
    const [newCardTitle, setNewCardTitle] = useState('')

    // Edit List State
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(list.title)
    const [editColor, setEditColor] = useState(list.color || '#f1f5f9')

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    const supabase = createClient()

    const handleDeleteList = async () => {
        if (!confirm(dict.delete_list_confirm)) return
        const { error } = await supabase.from('lists').delete().eq('id', list.id)
        if (error) toast.error("Delete failed: " + error.message)
    }

    const handleSaveList = async () => {
        if (!editTitle.trim()) return
        const { error } = await supabase.from('lists').update({ title: editTitle.trim(), color: editColor }).eq('id', list.id)
        if (error) {
            toast.error("Rename failed: " + error.message)
        } else {
            setIsEditing(false)
        }
    }

    const handleAddCard = async () => {
        if (!newCardTitle.trim()) {
            setIsAddingCard(false)
            return
        }

        const maxOrder = cards.length > 0 ? Math.max(...cards.map(c => c.order)) : 0
        const newOrder = maxOrder + 65536 // Add a large gap for floating order

        const { error } = await supabase.from('cards').insert({
            list_id: list.id,
            title: newCardTitle.trim(),
            order: newOrder
        })

        if (!error) {
            setNewCardTitle('')
            setIsAddingCard(false)
        } else {
            console.error(error)
            alert('新增卡片失敗。')
        }
    }

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    }

    const listBgStyle = list.is_global ? {} : { backgroundColor: list.color || '#f1f5f9' }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="w-[300px] shrink-0 h-full max-h-full rounded-xl bg-slate-200/50 border-2 border-dashed border-indigo-400 opacity-40 snap-center"
            />
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, ...listBgStyle }}
            className={`w-[300px] shrink-0 h-full max-h-[85vh] flex flex-col rounded-xl shadow-sm snap-center transition-all ${isOverlay ? 'shadow-2xl cursor-grabbing' : ''
                } ${list.is_global
                    ? 'bg-amber-50/90 border border-amber-200 backdrop-blur-md'
                    : 'border border-slate-200/50'
                }`}
        >
            {/* List Header (Drag Handle for the List) */}
            <div
                {...(!list.is_global && !isEditing ? attributes : {})}
                {...(!list.is_global && !isEditing ? listeners : {})}
                className={`group p-3 font-semibold flex justify-between items-center border-b ${list.is_global
                    ? 'text-amber-900 border-amber-200/50'
                    : isEditing ? 'border-indigo-200 bg-white/50 rounded-t-xl' : 'text-slate-700 border-slate-200/50 cursor-grab active:cursor-grabbing'
                    }`}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {isEditing ? (
                        <div className="flex flex-col gap-2 w-full pr-2">
                            <input
                                autoFocus
                                value={editTitle}
                                onPointerDown={(e) => e.stopPropagation()}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveList()
                                    if (e.key === 'Escape') setIsEditing(false)
                                }}
                                className="bg-white px-2 py-1 rounded text-sm font-semibold text-slate-800 border-2 border-indigo-400 focus:outline-none w-full shadow-sm"
                            />
                            <div className="flex items-center gap-1.5" onPointerDown={e => e.stopPropagation()}>
                                {['#f1f5f9', '#fee2e2', '#fef3c7', '#dcfce7', '#e0e7ff', '#f3e8ff', '#fce7f3'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setEditColor(c)}
                                        className={`w-4 h-4 rounded-full border ${editColor === c ? 'border-slate-800 scale-110 ring-1 ring-slate-800 ring-offset-1' : 'border-slate-300'} transition-transform hover:scale-110`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <span className="truncate">{list.title}</span>
                    )}

                    {!isEditing && (
                        <span className={`shrink-0 text-xs font-normal px-2 py-0.5 rounded-full ${list.is_global ? 'text-amber-700 bg-amber-200/50' : 'text-slate-500 bg-slate-200'
                            }`}>
                            {cards.length}
                        </span>
                    )}
                </div>

                {!list.is_global && (
                    isEditing ? (
                        <div className="flex gap-1 shrink-0 ml-2">
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleSaveList()} className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded">{dict.save}</button>
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsEditing(false)} className="text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded">{dict.cancel}</button>
                        </div>
                    ) : (
                        <div className="flex gap-1 shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity">
                            <button
                                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setIsEditing(true); }}
                                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                className="text-slate-400 hover:text-indigo-600 focus:outline-none p-1.5 rounded bg-slate-200/50 hover:bg-slate-200 transition-colors"
                                title={dict.rename_list}
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteList(); }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteList(); }}
                                className="text-slate-400 hover:text-red-600 focus:outline-none p-1.5 rounded bg-slate-200/50 hover:bg-red-50 transition-colors"
                                title={dict.delete_list}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* List Body (Droppable for Cards) */}
            <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden flex flex-col gap-2 min-h-[100px]">
                <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {cards.map((card) => (
                        <KanbanCard key={card.id} card={card} isGlobalList={list.is_global} userProfile={userProfile} departments={departments} systemUsers={systemUsers} />
                    ))}
                </SortableContext>
            </div>

            {/* List Footer (Add Card) */}
            {(!list.is_global || userProfile?.can_manage_global_messages) && (
                <div className="p-2 pt-0">
                    {isAddingCard ? (
                        <div className="mt-2 flex flex-col gap-2">
                            <textarea
                                autoFocus
                                placeholder={dict.enter_card_title}
                                className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none"
                                rows={2}
                                value={newCardTitle}
                                onChange={(e) => setNewCardTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleAddCard()
                                    }
                                    if (e.key === 'Escape') {
                                        setNewCardTitle('')
                                        setIsAddingCard(false)
                                    }
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAddCard}
                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 transition"
                                >
                                    {dict.add}
                                </button>
                                <button
                                    onClick={() => {
                                        setNewCardTitle('')
                                        setIsAddingCard(false)
                                    }}
                                    className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingCard(true)}
                            className="flex items-center gap-2 w-full text-left text-slate-500 p-2 hover:bg-slate-200/60 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Plus size={16} /> {dict.add_card}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
