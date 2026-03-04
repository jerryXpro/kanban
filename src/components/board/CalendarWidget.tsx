'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CalendarEvent {
    id: string
    title: string
    start: string | null
    end: string | null
    isAllDay: boolean
    description: string | null
    location: string | null
    color: string | null
}

type ViewMode = 'twoWeeks' | 'month'
type TextSize = 'sm' | 'md' | 'lg'

interface CalendarWidgetProps {
    calendarId?: string
}

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getEventColor(event: CalendarEvent) {
    return event.color || '#6366f1'
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
}

function getDaysInRange(start: Date, end: Date): Date[] {
    const days: Date[] = []
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)
    while (current <= endDate) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }
    return days
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    return events.filter(event => {
        if (!event.start) return false
        const startDate = new Date(event.start)
        let endDate = event.end ? new Date(event.end) : startDate

        // Google Calendar API all-day events have exclusive end dates
        // e.g. Start 2026-03-13, End 2026-03-14 means it only spans the 13th.
        // We subtract 1 millisecond so it falls back to 23:59:59 of the actual last day.
        if (event.isAllDay && event.end && startDate < endDate) {
            endDate = new Date(endDate.getTime() - 1)
        }

        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)

        return startDate <= dayEnd && endDate >= dayStart
    })
}

export default function CalendarWidget({ calendarId }: CalendarWidgetProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isConfigured, setIsConfigured] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('twoWeeks')
    const [textSize, setTextSize] = useState<TextSize>('sm')
    const [expanded, setExpanded] = useState(true)
    const [offsetWeeks, setOffsetWeeks] = useState(0) // for two-week view navigation
    const [offsetMonths, setOffsetMonths] = useState(0) // for month view navigation

    const fetchEvents = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Calculate date range based on current state to pass to API
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            let startOfRange: Date
            let endOfRange: Date

            if (viewMode === 'twoWeeks') {
                startOfRange = new Date(today)
                startOfRange.setDate(today.getDate() + offsetWeeks * 14)
                endOfRange = new Date(startOfRange)
                endOfRange.setDate(startOfRange.getDate() + 13)
            } else {
                startOfRange = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1)
                endOfRange = new Date(startOfRange.getFullYear(), startOfRange.getMonth() + 1, 0)
            }
            startOfRange.setHours(0, 0, 0, 0)
            endOfRange.setHours(23, 59, 59, 999)

            const params = new URLSearchParams({
                view: viewMode,
                timeMin: startOfRange.toISOString(),
                timeMax: endOfRange.toISOString()
            })
            if (calendarId) params.set('calendarId', calendarId)
            const res = await fetch(`/api/calendar?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || '無法載入行事曆')
            } else {
                setEvents(data.events || [])
                setIsConfigured(data.configured)
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }, [viewMode, calendarId, offsetWeeks, offsetMonths])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    // --- Calculate visible date range ---
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let days: Date[]
    let rangeLabel: string

    if (viewMode === 'twoWeeks') {
        const startOfRange = new Date(today)
        startOfRange.setDate(today.getDate() + offsetWeeks * 14)
        const endOfRange = new Date(startOfRange)
        endOfRange.setDate(startOfRange.getDate() + 13)
        days = getDaysInRange(startOfRange, endOfRange)

        const startLabel = `${startOfRange.getMonth() + 1}/${startOfRange.getDate()}`
        const endLabel = `${endOfRange.getMonth() + 1}/${endOfRange.getDate()}`
        rangeLabel = `${startLabel} – ${endLabel}`
    } else {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1)
        const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
        days = getDaysInRange(targetDate, lastDay)
        rangeLabel = `${targetDate.getFullYear()}年 ${MONTHS_ZH[targetDate.getMonth()]}`
    }

    const handlePrev = () => {
        if (viewMode === 'twoWeeks') setOffsetWeeks(o => o - 1)
        else setOffsetMonths(o => o - 1)
    }
    const handleNext = () => {
        if (viewMode === 'twoWeeks') setOffsetWeeks(o => o + 1)
        else setOffsetMonths(o => o + 1)
    }
    const handleToday = () => {
        setOffsetWeeks(0)
        setOffsetMonths(0)
    }

    // Split days into rows (7 per row)
    const rows: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
        rows.push(days.slice(i, i + 7))
    }

    const textSizeClass = textSize === 'sm' ? 'text-[10px]' : textSize === 'md' ? 'text-xs' : 'text-sm'

    return (
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 text-white select-none">
            {/* Header Bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
                <Calendar className="h-4 w-4 opacity-70" />
                <span className="text-sm font-semibold opacity-90 flex-1">Google 行事曆</span>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/10 rounded-md overflow-hidden border border-white/20">
                    <button
                        onClick={() => { setViewMode('twoWeeks'); setOffsetWeeks(0) }}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'twoWeeks' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                        雙週
                    </button>
                    <button
                        onClick={() => { setViewMode('month'); setOffsetMonths(0) }}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                        月
                    </button>
                </div>

                {/* Text Size Toggle */}
                <div className="flex items-center bg-white/10 rounded-md overflow-hidden border border-white/20 ml-2">
                    <button
                        onClick={() => setTextSize('sm')}
                        className={`px-2 py-1 text-[10px] font-medium transition-colors ${textSize === 'sm' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title="小字體"
                    >
                        小
                    </button>
                    <button
                        onClick={() => setTextSize('md')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${textSize === 'md' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title="中字體"
                    >
                        中
                    </button>
                    <button
                        onClick={() => setTextSize('lg')}
                        className={`px-2 py-1 text-sm font-medium transition-colors ${textSize === 'lg' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title="大字體"
                    >
                        大
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-1">
                    <button onClick={handlePrev} className="p-1 rounded hover:bg-white/10 transition-colors" title="上一期">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium min-w-[100px] text-center opacity-90">{rangeLabel}</span>
                    <button onClick={handleNext} className="p-1 rounded hover:bg-white/10 transition-colors" title="下一期">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <button onClick={handleToday} className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
                    今天
                </button>

                <button onClick={fetchEvents} disabled={isLoading} className="p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100" title="重新整理">
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Collapse Button */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 text-xs font-bold ml-1"
                    title={expanded ? '收合' : '展開'}
                >
                    {expanded ? '▲' : '▼'}
                </button>
            </div>

            {/* Calendar Grid */}
            {expanded && (
                <div className="overflow-x-auto">
                    {error && !isLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-red-300 text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>載入失敗：{error}</span>
                        </div>
                    ) : !isConfigured && !isLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-white/60 text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>尚未設定 Google 行事曆。請在 Vercel / .env.local 加入 <code className="bg-white/10 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> 與 <code className="bg-white/10 px-1 rounded">GOOGLE_CALENDAR_ID</code>。</span>
                        </div>
                    ) : (
                        <div className="min-w-[700px]">
                            {rows.map((row, rowIdx) => (
                                <div key={rowIdx} className="grid border-b border-white/10 last:border-b-0" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                                    {row.map((day, dayIdx) => {
                                        const dayEvents = getEventsForDay(events, day)
                                        const isToday = isSameDay(day, new Date())
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`px-1.5 py-1 border-r border-white/10 last:border-r-0 min-h-[52px] ${isWeekend ? 'bg-white/5' : ''}`}
                                            >
                                                {/* Day Header */}
                                                <div className="flex items-baseline gap-1 mb-1">
                                                    <span className={`leading-none ${textSizeClass} ${isToday ? 'bg-white text-indigo-600 rounded-sm px-1 py-0.5 font-bold' : 'opacity-70'}`}>
                                                        {day.getDate()}
                                                    </span>
                                                    <span className={`leading-none opacity-50 ${textSizeClass} ${isWeekend ? 'text-red-300 opacity-70' : ''}`}>
                                                        {WEEKDAYS_ZH[day.getDay()]}
                                                    </span>
                                                </div>

                                                {/* Events */}
                                                <div className="flex flex-col gap-0.5">
                                                    {isLoading ? (
                                                        <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                                                    ) : dayEvents.length === 0 ? null : (
                                                        <>
                                                            <TooltipProvider delayDuration={0}>
                                                                {dayEvents.slice(0, 2).map(event => (
                                                                    <Tooltip key={event.id}>
                                                                        <TooltipTrigger asChild>
                                                                            <div
                                                                                className={`leading-tight px-1 py-0.5 rounded truncate cursor-default ${textSizeClass}`}
                                                                                style={{ backgroundColor: getEventColor(event) + '99', borderLeft: `2px solid ${getEventColor(event)}` }}
                                                                            >
                                                                                {!event.isAllDay && (
                                                                                    <span className="opacity-70 mr-0.5">{formatTime(event.start)}</span>
                                                                                )}
                                                                                {event.title}
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent
                                                                            side="bottom"
                                                                            align="start"
                                                                            className="z-[999] w-48 bg-slate-800 text-white border-white/10 shadow-xl"
                                                                        >
                                                                            <p className="font-semibold mb-1 text-xs">{event.title}</p>
                                                                            {!event.isAllDay && (
                                                                                <p className="opacity-70 text-xs">{formatTime(event.start)} – {formatTime(event.end)}</p>
                                                                            )}
                                                                            {event.isAllDay && <p className="opacity-70 text-xs">全天</p>}
                                                                            {event.location && <p className="opacity-70 mt-1 text-xs">📍 {event.location}</p>}
                                                                            {event.description && <p className="opacity-60 mt-1 line-clamp-3 text-xs">{event.description}</p>}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}
                                                            </TooltipProvider>
                                                            {dayEvents.length > 2 && (
                                                                <div className={`opacity-60 px-1 ${textSizeClass}`}>+{dayEvents.length - 2} 更多</div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
