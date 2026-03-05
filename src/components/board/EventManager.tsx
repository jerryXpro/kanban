'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Power, PowerOff } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import {
    getScheduledEvents,
    createScheduledEvent,
    updateScheduledEvent,
    deleteScheduledEvent,
    type ScheduledEvent,
} from '@/app/actions/scheduled-events'

interface EventManagerProps {
    departmentId: string
    isManager: boolean
}

const RECURRENCE_LABELS: Record<string, string> = {
    once: '一次性',
    quarterly: '每季',
    yearly: '每年',
}

const OFFSET_PRESETS = [
    { label: '當天', days: 0 },
    { label: '7 天後', days: 7 },
    { label: '30 天後', days: 30 },
    { label: '3 個月後', days: 90 },
    { label: '6 個月後', days: 180 },
    { label: '1 年後', days: 365 },
]

export default function EventManager({ departmentId, isManager }: EventManagerProps) {
    const [events, setEvents] = useState<ScheduledEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formEventDate, setFormEventDate] = useState('')
    const [formOffsetDays, setFormOffsetDays] = useState(0)
    const [formRecurrence, setFormRecurrence] = useState<'once' | 'quarterly' | 'yearly'>('once')

    const fetchEvents = useCallback(async () => {
        setLoading(true)
        const result = await getScheduledEvents(departmentId)
        if (result.data) setEvents(result.data)
        setLoading(false)
    }, [departmentId])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    if (!isManager) return null

    const activeEvents = events.filter(e => e.is_active)
    const inactiveEvents = events.filter(e => !e.is_active)

    const resetForm = () => {
        setFormTitle('')
        setFormDescription('')
        setFormEventDate('')
        setFormOffsetDays(0)
        setFormRecurrence('once')
        setEditingEvent(null)
    }

    const openCreateDialog = () => {
        resetForm()
        // Default to today
        setFormEventDate(new Date().toISOString().split('T')[0])
        setIsDialogOpen(true)
    }

    const openEditDialog = (event: ScheduledEvent) => {
        setEditingEvent(event)
        setFormTitle(event.title)
        setFormDescription(event.description || '')
        setFormEventDate(event.event_date)
        setFormOffsetDays(event.remind_offset_days)
        setFormRecurrence(event.recurrence)
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formTitle.trim()) {
            toast.error('請輸入事件標題')
            return
        }
        if (!formEventDate) {
            toast.error('請選擇基準日期')
            return
        }

        if (editingEvent) {
            const res = await updateScheduledEvent(
                editingEvent.id, departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence, editingEvent.is_active
            )
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('排程事件已更新')
                setIsDialogOpen(false)
                fetchEvents()
            }
        } else {
            const res = await createScheduledEvent(
                departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence
            )
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('排程事件已建立')
                setIsDialogOpen(false)
                fetchEvents()
            }
        }
    }

    const handleDelete = async (event: ScheduledEvent) => {
        if (!confirm(`確定要刪除「${event.title}」？`)) return
        const res = await deleteScheduledEvent(event.id, departmentId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('排程事件已刪除')
            fetchEvents()
        }
    }

    const handleToggleActive = async (event: ScheduledEvent) => {
        const res = await updateScheduledEvent(
            event.id, departmentId, event.title, event.description || '',
            event.event_date, event.remind_offset_days, event.recurrence, !event.is_active
        )
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(event.is_active ? '排程已停用' : '排程已啟用')
            fetchEvents()
        }
    }

    const computedRemindDate = formEventDate
        ? new Date(new Date(formEventDate).getTime() + formOffsetDays * 86400000).toLocaleDateString('zh-TW')
        : '—'

    return (
        <div className="mx-4 mb-2">
            {/* Toggle Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium transition-all"
            >
                <CalendarClock size={16} className="text-amber-300" />
                <span>排程提醒事件</span>
                <span className="text-white/50 text-xs ml-1">({activeEvents.length} 啟用中)</span>
                <span className="ml-auto">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {/* Expandable Content */}
            {expanded && (
                <div className="mt-2 bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white space-y-2">
                    {/* Add Button */}
                    <button
                        onClick={openCreateDialog}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
                    >
                        <Plus size={14} />
                        新增排程事件
                    </button>

                    {loading ? (
                        <div className="text-xs text-white/50 py-2">載入中...</div>
                    ) : events.length === 0 ? (
                        <div className="text-xs text-white/50 py-2">尚未建立任何排程事件</div>
                    ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {activeEvents.map(event => (
                                <EventRow key={event.id} event={event} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                            ))}
                            {inactiveEvents.length > 0 && (
                                <>
                                    <div className="text-[10px] text-white/40 pt-2 border-t border-white/10">已停用</div>
                                    {inactiveEvents.map(event => (
                                        <EventRow key={event.id} event={event} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? '編輯排程事件' : '新增排程事件'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Title */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">事件標題 *</label>
                            <input
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="例如：ISO 稽核、新人滿 6 個月考核"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">描述 (選填)</label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 h-20 resize-none"
                                placeholder="提醒內容，將顯示在自動產生的卡片上"
                            />
                        </div>

                        {/* Event Date */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">基準日期 *</label>
                            <input
                                type="date"
                                value={formEventDate}
                                onChange={(e) => setFormEventDate(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <p className="text-xs text-slate-400">例如：新人報到日、稽核基準日</p>
                        </div>

                        {/* Offset */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">提醒時機</label>
                            <div className="flex flex-wrap gap-1.5">
                                {OFFSET_PRESETS.map(preset => (
                                    <button
                                        key={preset.days}
                                        type="button"
                                        onClick={() => setFormOffsetDays(preset.days)}
                                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${formOffsetDays === preset.days
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500">自訂天數：</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={formOffsetDays}
                                    onChange={(e) => setFormOffsetDays(parseInt(e.target.value) || 0)}
                                    className="w-20 p-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <span className="text-xs text-slate-500">天</span>
                            </div>
                            <p className="text-xs text-indigo-600 font-medium mt-1">
                                📅 預計提醒日期：{computedRemindDate}
                            </p>
                        </div>

                        {/* Recurrence */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">重複週期</label>
                            <div className="flex gap-2">
                                {(['once', 'quarterly', 'yearly'] as const).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setFormRecurrence(r)}
                                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${formRecurrence === r
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        {RECURRENCE_LABELS[r]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            onClick={() => setIsDialogOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
                        >
                            {editingEvent ? '更新' : '建立'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function EventRow({
    event,
    onEdit,
    onDelete,
    onToggle,
}: {
    event: ScheduledEvent
    onEdit: (e: ScheduledEvent) => void
    onDelete: (e: ScheduledEvent) => void
    onToggle: (e: ScheduledEvent) => void
}) {
    const remindDate = event.remind_date
        ? new Date(event.remind_date).toLocaleDateString('zh-TW')
        : '—'

    return (
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs group transition-colors ${event.is_active ? 'bg-white/5 hover:bg-white/15' : 'bg-white/5 opacity-50'
            }`}>
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-white/50 text-[10px]">
                    {remindDate} · {RECURRENCE_LABELS[event.recurrence]}
                    {event.last_triggered_at && ` · 上次觸發 ${new Date(event.last_triggered_at).toLocaleDateString('zh-TW')}`}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => onToggle(event)} className="p-1 hover:bg-white/20 rounded" title={event.is_active ? '停用' : '啟用'}>
                    {event.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                </button>
                <button onClick={() => onEdit(event)} className="p-1 hover:bg-white/20 rounded" title="編輯">
                    <Pencil size={12} />
                </button>
                <button onClick={() => onDelete(event)} className="p-1 hover:bg-red-500/30 rounded text-red-300" title="刪除">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    )
}
