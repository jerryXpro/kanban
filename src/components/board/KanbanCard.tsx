'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Profile } from '@/types/kanban'
import { AlignLeft, MessageSquare, Paperclip, AlertCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'

interface KanbanCardProps {
    card: Card
    isGlobalList?: boolean
    userProfile?: Profile
    isOverlay?: boolean
}

export default function KanbanCard({ card, isGlobalList, userProfile, isOverlay }: KanbanCardProps) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
        useSortable({
            id: card.id,
            data: {
                type: 'Card',
                card,
            },
        })

    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(card.title)
    const [editDescription, setEditDescription] = useState(card.description || '')
    const supabase = createClient()

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    const handleDelete = async () => {
        if (!confirm(dict.delete_card_confirm)) return
        await supabase.from('cards').delete().eq('id', card.id)
    }

    const handleSave = async () => {
        if (!editTitle.trim()) return
        await supabase.from('cards').update({ title: editTitle.trim(), description: editDescription.trim() }).eq('id', card.id)
        setIsEditing(false)
    }

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    }

    if (isEditing) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-400">
                <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-medium mb-2 focus:outline-none border-b border-indigo-200 pb-1"
                    placeholder={dict.enter_card_title}
                />
                <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-xs text-slate-500 mb-3 focus:outline-none resize-none border border-slate-100 rounded p-1"
                    placeholder={dict.description_optional}
                    rows={2}
                />
                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 font-medium">
                        {dict.save}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="text-slate-500 text-xs hover:bg-slate-100 px-3 py-1.5 rounded">
                        {dict.cancel}
                    </button>
                </div>
            </div>
        )
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-lg h-24 opacity-50"
            />
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(!isGlobalList ? attributes : {})}
            {...(!isGlobalList ? listeners : {})}
            className={`bg-white p-3 rounded-lg shadow-sm border transition-all ${isGlobalList
                ? 'border-amber-200 hover:border-amber-400 hover:shadow-md cursor-default'
                : 'border-slate-200 group hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing'
                } ${isOverlay ? 'shadow-xl rotate-3 scale-105 border-indigo-500' : ''}`}
        >
            {isGlobalList && (
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 mb-2 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                    <AlertCircle size={12} />
                    {dict.global_announcement}
                </div>
            )}

            <div className={`flex justify-between items-start mb-2 ${isGlobalList ? 'text-amber-950 font-semibold' : 'text-slate-700'}`}>
                <div className="text-sm font-medium break-words leading-relaxed pr-2">
                    {card.title}
                </div>

                {(!isGlobalList || userProfile?.can_manage_global_messages) && !isOverlay && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-600 focus:outline-none shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                                <MoreHorizontal size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>{dict.edit_card}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleDelete} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{dict.delete_card}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {card.description && (
                <div className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {card.description}
                </div>
            )}

            <div className="flex items-center justify-between mt-3 text-slate-400">
                <div className="flex items-center gap-3">
                    {/* Mockup icons for attachments/comments for premium feel */}
                    <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        <span className="text-xs font-semibold">2</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Paperclip size={14} />
                        <span className="text-xs font-semibold">1</span>
                    </div>
                </div>

                {/* Mock Assignee Avatar */}
                {!isGlobalList && (
                    <div className="flex -space-x-2 overflow-hidden">
                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold uppercase">JD</div>
                    </div>
                )}
            </div>
        </div>
    )
}
