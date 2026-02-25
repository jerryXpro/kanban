'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Profile } from '@/types/kanban'
import { AlignLeft, MessageSquare, Paperclip, AlertCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { toast } from 'sonner'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { updateCard, deleteCard } from '@/app/actions/cards'

interface KanbanCardProps {
    card: Card
    isGlobalList?: boolean
    userProfile?: Profile
    isOverlay?: boolean
    departments?: { id: string, name: string }[]
}

export default function KanbanCard({ card, isGlobalList, userProfile, isOverlay, departments = [] }: KanbanCardProps) {
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

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    // A user can manage (edit/delete) announcements and anomaly cards
    // if they are admin, dept admin, or can manage global messages
    const canManage = !!(userProfile?.is_admin || userProfile?.is_department_admin || userProfile?.can_manage_global_messages)

    const handleDelete = async () => {
        if (!confirm(dict.delete_card_confirm)) return
        const res = await deleteCard(card.id)
        if (res.error) {
            toast.error(res.error)
        }
    }

    const handleSave = async () => {
        if (!editTitle.trim()) return
        const res = await updateCard(card.id, editTitle, editDescription)
        if (res.error) {
            toast.error(res.error)
        } else {
            setIsEditing(false)
        }
    }

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    }

    const isAnomaly = card.card_type === 'anomaly'
    const sourceDeptName = isAnomaly && card.source_department_id
        ? departments.find(d => d.id === card.source_department_id)?.name
        : null

    // Editing mode
    if (isEditing) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-400">
                <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-medium mb-3 focus:outline-none border-b border-indigo-200 pb-1"
                    placeholder={dict.enter_card_title}
                />

                <div className="text-xs text-slate-500 font-medium mb-1">{dict.description_optional || '內文'}</div>
                <RichTextEditor
                    value={editDescription}
                    onChange={setEditDescription}
                    placeholder={dict.description_optional}
                />

                <div className="flex gap-2 mt-1">
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
                className={`border-2 border-dashed rounded-lg h-24 opacity-50 ${isAnomaly ? 'bg-red-50 border-red-400' : 'bg-indigo-50 border-indigo-400'}`}
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
                ? 'group border-amber-200 hover:border-amber-400 hover:shadow-md cursor-default'
                : isAnomaly
                    ? 'border-red-300 ring-1 ring-red-50 group hover:shadow-md hover:border-red-400 cursor-grab active:cursor-grabbing bg-white/95'
                    : 'border-slate-200 group hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing'
                } ${isOverlay ? 'shadow-xl rotate-3 scale-105 ' + (isAnomaly ? 'border-red-500' : 'border-indigo-500') : ''}`}
        >
            {/* Cover image */}
            {card.cover_image_url && (
                <div className="w-full h-24 rounded-t-md -mt-3 -mx-3 mb-3 bg-cover bg-center" style={{ backgroundImage: `url(${card.cover_image_url})` }} />
            )}

            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {card.labels.map((label: any, idx: number) => (
                        <span key={idx} className="h-2 w-8 rounded-full" style={{ backgroundColor: label.color || '#cbd5e1' }} title={label.text} />
                    ))}
                </div>
            )}

            {/* Announcement badge */}
            {isGlobalList && (
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 mb-2 bg-amber-50 w-fit px-2 py-0.5 rounded border border-amber-100">
                    <AlertCircle size={12} />
                    {dict.global_announcement}
                </div>
            )}

            {/* Anomaly badge */}
            {isAnomaly && (
                <div className="flex items-center gap-1 text-xs font-semibold text-red-600 mb-2 bg-red-50 w-fit px-2 py-0.5 rounded border border-red-100">
                    <AlertCircle size={12} />
                    {sourceDeptName ? `Source: ${sourceDeptName}` : 'Anomaly'}
                </div>
            )}

            {/* Title + actions menu */}
            <div className={`flex justify-between items-start mb-2 ${isGlobalList ? 'text-amber-950 font-semibold' : isAnomaly ? 'text-red-900 font-semibold' : 'text-slate-700'}`}>
                <div className="text-sm font-medium break-words leading-relaxed pr-2">
                    {card.title}
                </div>

                {/* Show "⋯" menu for: non-special cards (anyone), OR special cards only if canManage */}
                {((!isGlobalList && !isAnomaly) || canManage) && !isOverlay && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="text-slate-400 hover:text-slate-600 focus:outline-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-slate-100 rounded p-0.5"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
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

            {/* Description preview */}
            {card.description && (
                <div className="flex items-start gap-1.5 text-slate-500 mb-3 w-full overflow-hidden">
                    <AlignLeft size={14} className="shrink-0 mt-0.5 opacity-70" />
                    <div
                        className="text-xs prose prose-slate prose-p:my-0 prose-ul:my-0 prose-li:my-0 line-clamp-3 max-w-none w-full break-words"
                        dangerouslySetInnerHTML={{ __html: card.description }}
                    />
                </div>
            )}

            {/* Footer badges */}
            <div className="flex items-center justify-between mt-3 text-slate-400">
                <div className="flex items-center gap-3">
                    {card.due_date && (
                        <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                            <span>⏲</span>
                            <span>{new Date(card.due_date).toLocaleDateString()}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1" title="Comments">
                        <MessageSquare size={14} />
                        <span className="text-xs font-semibold">2</span>
                    </div>
                    <div className="flex items-center gap-1" title="Attachments">
                        <Paperclip size={14} />
                        <span className="text-xs font-semibold">1</span>
                    </div>
                </div>

                {!isGlobalList && (
                    <div className="flex -space-x-2 overflow-hidden">
                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold uppercase">JD</div>
                    </div>
                )}
            </div>
        </div>
    )
}
