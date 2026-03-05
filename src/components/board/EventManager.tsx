'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'

interface EventManagerProps {
    departmentId: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}
export function EventManager({ departmentId, isOpen, onOpenChange }: EventManagerProps) {
    const [events, setEvents] = useState<ScheduledEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null)

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formEventDate, setFormEventDate] = useState('')
    const [formOffsetDays, setFormOffsetDays] = useState(0)
    const [formRecurrence, setFormRecurrence] = useState<'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('once')

    const RECURRENCE_LABELS: Record<string, string> = {
        once: dict.recurrence_once || '一次性',
        weekly: dict.recurrence_weekly || '每週',
        monthly: dict.recurrence_monthly || '每月',
        quarterly: dict.recurrence_quarterly || '每季',
        yearly: dict.recurrence_yearly || '每年',
    }

    const OFFSET_PRESETS = [
        { label: dict.offset_0 || '當天', days: 0 },
        { label: dict.offset_7 || '7 天後', days: 7 },
        { label: dict.offset_30 || '30 天後', days: 30 },
        { label: dict.offset_90 || '3 個月後', days: 90 },
        { label: dict.offset_180 || '6 個月後', days: 180 },
        { label: dict.offset_365 || '1 年後', days: 365 },
    ]

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
        if (!formTitle.trim()) { toast.error(dict.event_title_req || '請輸入事件標題'); return }
        if (!formEventDate) { toast.error(dict.event_date_req || '請選擇基準日期'); return }

        if (editingEvent) {
            const res = await updateScheduledEvent(
                editingEvent.id, departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence, editingEvent.is_active
            )
            if (res.error) toast.error(res.error)
            else { toast.success(dict.event_updated || '排程事件已更新'); setIsDialogOpen(false); fetchEvents() }
        } else {
            const res = await createScheduledEvent(
                departmentId, formTitle, formDescription,
                formEventDate, formOffsetDays, formRecurrence
            )
            if (res.error) toast.error(res.error)
            else { toast.success(dict.event_created || '排程事件已建立'); setIsDialogOpen(false); fetchEvents() }
        }
    }

    const handleDelete = async (event: ScheduledEvent) => {
        if (!confirm((dict.event_delete_confirm || `確定要刪除「{0}」？`).replace('{0}', event.title))) return
        const res = await deleteScheduledEvent(event.id, departmentId)
        if (res.error) toast.error(res.error)
        else { toast.success(dict.event_deleted || '排程事件已刪除'); fetchEvents() }
    }

    const handleToggleActive = async (event: ScheduledEvent) => {
        const res = await updateScheduledEvent(
            event.id, departmentId, event.title, event.description || '',
            event.event_date, event.remind_offset_days, event.recurrence, !event.is_active
        )
        if (res.error) toast.error(res.error)
        else { toast.success(event.is_active ? (dict.event_disabled || '排程已停用') : (dict.event_enabled || '排程已啟用')); fetchEvents() }
    }

    const computedRemindDate = formEventDate
        ? new Date(new Date(formEventDate).getTime() + formOffsetDays * 86400000).toLocaleDateString('zh-TW')
        : '—'

    return (
        <>
            {/* Right-side Drawer Overlay - rendered via Portal to bypass header stacking context */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100]" onClick={() => onOpenChange(false)}>
                    {/* Backdrop - fully blocks background content */}
                    <div className="absolute inset-0 bg-black/60" />

                    {/* Drawer Panel */}
                    <div
                        className="absolute top-0 right-0 h-full w-full max-w-md bg-slate-900 shadow-2xl border-l border-slate-700 flex flex-col animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <CalendarClock size={20} className="text-amber-400" />
                                <h2 className="text-lg font-semibold text-white">{dict.event_scheduler_title || '排程提醒事件'}</h2>
                                <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                                    {(dict.active_events || '{0} 啟用中').replace('{0}', activeEvents.length.toString())}
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
                                                <EventRow key={event.id} event={event} recurrenceLabel={RECURRENCE_LABELS[event.recurrence as keyof typeof RECURRENCE_LABELS] || RECURRENCE_LABELS['once']} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                                            ))}
                                        </div>
                                    )}
                                    {inactiveEvents.length > 0 && (
                                        <div className="space-y-2 pt-3 border-t border-white/10">
                                            <div className="text-xs font-medium text-white/30 uppercase tracking-wider">已停用</div>
                                            {inactiveEvents.map(event => (
                                                <EventRow key={event.id} event={event} recurrenceLabel={RECURRENCE_LABELS[event.recurrence as keyof typeof RECURRENCE_LABELS] || RECURRENCE_LABELS['once']} onEdit={openEditDialog} onDelete={handleDelete} onToggle={handleToggleActive} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Create/Edit Dialog - Must be OUTSIDE the Drawer portal to prevent inherited darkness/z-index issues */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg shadow-xl !bg-white !text-slate-900" style={{ background: '#ffffff', borderColor: '#e2e8f0' }} hideOverlay>
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">{editingEvent ? (dict.event_edit || '編輯排程事件') : (dict.event_add || '新增排程事件')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">{dict.event_title_label || '事件標題 *'}</label>
                            <input
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900 bg-white"
                                placeholder={dict.event_title_placeholder || '例如：ISO 稽核、新人滿 6 個月考核'}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">{dict.event_desc_label || '描述 (選填)'}</label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 h-20 resize-none text-slate-900 bg-white"
                                placeholder={dict.event_desc_placeholder || '提醒內容，將顯示在自動產生的卡片上'}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">{dict.event_date_label || '基準日期 *'}</label>
                            <input
                                type="date"
                                value={formEventDate}
                                onChange={(e) => setFormEventDate(e.target.value)}
                                className="w-full p-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-900 bg-white"
                            />
                            <p className="text-xs text-slate-400">{dict.event_date_hint || '例如：新人報到日、稽核基準日'}</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">{dict.event_timing_label || '提醒時機'}</label>
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
                                <span className="text-xs text-slate-500">{dict.event_custom_days || '自訂天數：'}</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={formOffsetDays}
                                    onChange={(e) => setFormOffsetDays(parseInt(e.target.value) || 0)}
                                    className="w-20 p-1.5 text-sm rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-900 bg-white"
                                />
                                <span className="text-xs text-slate-500">{dict.event_days || '天'}</span>
                            </div>
                            <p className="text-xs text-indigo-600 font-medium mt-1">
                                📅 {dict.event_predict_date || '預計提醒日期：'}{computedRemindDate}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">{dict.event_recurrence_label || '重複週期'}</label>
                            <div className="flex gap-2 flex-wrap">
                                {(['once', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map(r => (
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
    recurrenceLabel,
    onEdit,
    onDelete,
    onToggle,
}: {
    event: ScheduledEvent
    recurrenceLabel: string
    onEdit: (e: ScheduledEvent) => void
    onDelete: (e: ScheduledEvent) => void
    onToggle: (e: ScheduledEvent) => void
}) {
    // Simple next date projection based on recurrence
    const getNextRemindDate = (baseDateStr: string | null, recurrence: string) => {
        if (!baseDateStr) return '—'
        const baseDate = new Date(baseDateStr)
        const today = new Date()

        if (recurrence === 'once' && baseDate < today) return '已過期'
        if (recurrence === 'once') return baseDate.toLocaleDateString('zh-TW')

        let nextDate = new Date(baseDate)
        // Advance nextDate until it's in the future
        while (nextDate < today) {
            if (recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
            else if (recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
            else if (recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3)
            else if (recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1)
            else break // fallback
        }
        return nextDate.toLocaleDateString('zh-TW')
    }

    const nextRemindDateStr = getNextRemindDate(event.remind_date, event.recurrence)

    return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm group transition-colors ${event.is_active ? 'bg-white/5 hover:bg-white/10' : 'bg-white/5 opacity-40'
            }`}>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{event.title}</div>
                <div className="text-white/40 text-xs mt-0.5">
                    📅 {nextRemindDateStr} · {recurrenceLabel}
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
