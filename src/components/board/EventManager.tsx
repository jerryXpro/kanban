'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarClock, Plus, Pencil, Trash2, Power, PowerOff, X } from 'lucide-react'
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
    isOpen: boolean
    onOpenChange: (open: boolean) => void
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

export default function EventManager({ departmentId, isOpen, onOpenChange }: EventManagerProps) {
    const [events, setEvents] = useState<ScheduledEvent[]>([])
    const [loading, setLoading] = useState(true)
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
        if (isOpen) fetchEvents()
    }, [isOpen, fetchEvents])

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
        if (!formTitle.trim()) { toast.error('請輸入事件標題'); return }
        if (!formEventDate) { toast.error('請選擇基準日期'); return }

        if (editingEvent) {
            const res = await updateScheduledEvent(
                editingEvent.id, departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence, editingEvent.is_active
            )
            if (res.error) toast.error(res.error)
            else { toast.success('排程事件已更新'); setIsDialogOpen(false); fetchEvents() }
        } else {
            const res = await createScheduledEvent(
                departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence
            )
            if (res.error) toast.error(res.error)
            else { toast.success('排程事件已建立'); setIsDialogOpen(false); fetchEvents() }
        }
    }

    const handleDelete = async (event: ScheduledEvent) => {
        if (!confirm(`確定要刪除「${event.title}」？`)) return
        const res = await deleteScheduledEvent(event.id, departmentId)
        if (res.error) toast.error(res.error)
        else { toast.success('排程事件已刪除'); fetchEvents() }
    }

    const handleToggleActive = async (event: ScheduledEvent) => {
        const res = await updateScheduledEvent(
            event.id, departmentId, event.title, event.description || '',
            event.event_date, event.remind_offset_days, event.recurrence, !event.is_active
        )
        if (res.error) toast.error(res.error)
        else { toast.success(event.is_active ? '排程已停用' : '排程已啟用'); fetchEvents() }
    }

    const computedRemindDate = formEventDate
        ? new Date(new Date(formEventDate).getTime() + formOffsetDays * 86400000).toLocaleDateString('zh-TW')
        : '—'

    return (
        <>
            {/* Right-side Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[60]" onClick={() => onOpenChange(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                    {/* Drawer Panel */}
                    <div
                        className="absolute top-0 right-0 h-full w-full max-w-md bg-slate-900 shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <CalendarClock size={20} className="text-amber-400" />
                                <h2 className="text-lg font-semibold text-white">排程提醒事件</h2>
                                <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                                    {activeEvents.length} 啟用中
                                </span>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {/* Add Button */}
                            <button
                                onClick={openCreateDialog}
                                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg border border-dashed border-amber-400/40 text-amber-300 text-sm font-medium hover:bg-amber-400/10 transition-colors"
                            >
                                <Plus size={16} />
                                新增排程事件
                            </button>

                            {loading ? (
                                <div className="text-sm text-white/40 py-8 text-center">載入中...</div>
                            ) : events.length === 0 ? (
                                <div className="text-sm text-white/40 py-8 text-center">
                                    尚未建立任何排程事件<br />
                                    <span className="text-xs">點擊上方按鈕新增第一個排程提醒</span>
                                </div>
                            ) : (
                                <>
                                    {activeEvents.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-white/50 uppercase tracking-wider">啟用中</div>
                                            {activeEvents.map(event => (
                                                <EventRow key={event.id} event={event} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                                            ))}
                                        </div>
                                    )}
                                    {inactiveEvents.length > 0 && (
                                        <div className="space-y-2 pt-3 border-t border-white/10">
                                            <div className="text-xs font-medium text-white/30 uppercase tracking-wider">已停用</div>
                                            {inactiveEvents.map(event => (
                                                <EventRow key={event.id} event={event} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? '編輯排程事件' : '新增排程事件'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">事件標題 *</label>
                            <input
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="例如：ISO 稽核、新人滿 6 個月考核"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">描述 (選填)</label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 h-20 resize-none"
                                placeholder="提醒內容，將顯示在自動產生的卡片上"
                            />
                        </div>

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
                        <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">取消</button>
                        <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm">
                            {editingEvent ? '更新' : '建立'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm group transition-colors ${event.is_active ? 'bg-white/5 hover:bg-white/10' : 'bg-white/5 opacity-40'
            }`}>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{event.title}</div>
                <div className="text-white/40 text-xs mt-0.5">
                    📅 {remindDate} · {RECURRENCE_LABELS[event.recurrence]}
                    {event.last_triggered_at && ` · 上次 ${new Date(event.last_triggered_at).toLocaleDateString('zh-TW')}`}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => onToggle(event)} className="p-1.5 hover:bg-white/15 rounded-md text-white/60 hover:text-white" title={event.is_active ? '停用' : '啟用'}>
                    {event.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
                <button onClick={() => onEdit(event)} className="p-1.5 hover:bg-white/15 rounded-md text-white/60 hover:text-white" title="編輯">
                    <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(event)} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400" title="刪除">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    )
}
