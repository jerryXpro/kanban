'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, Settings } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocaleStore } from '@/store/useLocaleStore'
import { dictionaries } from '@/lib/i18n/dictionaries'

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
    themeColor?: string
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

        // Helper to parse dates safely into local time 
        // to prevent 'YYYY-MM-DD' from defaulting to UTC midnight and shifting by +8 hours
        const parseEventDate = (dateStr: string) => {
            if (!dateStr.includes('T')) {
                const [y, m, d] = dateStr.split('-').map(Number)
                return new Date(y, m - 1, d)
            }
            return new Date(dateStr)
        }

        const startDate = parseEventDate(event.start)
        let endDate = event.end ? parseEventDate(event.end) : startDate

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

// Get a high-contrast highlight color based on the theme background
function getTodayHighlight(themeColor?: string): { bg: string; text: string; cellBg: string; eventBorder: string } {
    if (!themeColor) return { bg: '#FBBF24', text: '#78350F', cellBg: 'rgba(251,191,36,0.15)', eventBorder: '#FBBF24' }
    const hex = themeColor.replace('#', '').toLowerCase()
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // If theme is dark/blue-ish → yellow highlight
    // If theme is red/pink → cyan highlight
    // If theme is green → amber highlight
    // If theme is purple → lime highlight
    // If theme is warm/yellow → blue highlight
    if (r > 200 && g < 100) return { bg: '#22D3EE', text: '#164E63', cellBg: 'rgba(34,211,238,0.15)', eventBorder: '#22D3EE' } // red → cyan
    if (r > 200 && g > 150) return { bg: '#3B82F6', text: '#1E3A5F', cellBg: 'rgba(59,130,246,0.15)', eventBorder: '#3B82F6' } // yellow/amber → blue
    if (g > 150 && r < 100) return { bg: '#F59E0B', text: '#78350F', cellBg: 'rgba(245,158,11,0.15)', eventBorder: '#F59E0B' } // green → amber
    if (b > 150 && r > 100) return { bg: '#84CC16', text: '#365314', cellBg: 'rgba(132,204,22,0.15)', eventBorder: '#84CC16' } // purple → lime
    return { bg: '#FBBF24', text: '#78350F', cellBg: 'rgba(251,191,36,0.15)', eventBorder: '#FBBF24' } // default (blue) → yellow
}

export default function CalendarWidget({ calendarId, themeColor }: CalendarWidgetProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isConfigured, setIsConfigured] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('twoWeeks')
    const [textSize, setTextSize] = useState<TextSize>('md')
    const [expanded, setExpanded] = useState(true)
    const [offsetWeeks, setOffsetWeeks] = useState(0) // for two-week view navigation
    const [offsetMonths, setOffsetMonths] = useState(0) // for month view navigation

    const { locale } = useLocaleStore()
    const dict = dictionaries[locale].board

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
                setError(data.error || (dict.cal_error ? dict.cal_error.replace('{0}', '') : '無法載入行事曆'))
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

        // Use Western month numbers if not zh-TW
        const monthName = locale === 'zh-TW' ? MONTHS_ZH[targetDate.getMonth()] : (targetDate.getMonth() + 1).toString()
        rangeLabel = locale === 'zh-TW'
            ? `${targetDate.getFullYear()}年 ${monthName}`
            : `${monthName}/${targetDate.getFullYear()}`
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
                <span className="text-sm font-semibold opacity-90 flex-1">{dict.cal_title || 'Google 行事曆'}</span>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/10 rounded-md overflow-hidden border border-white/20">
                    <button
                        onClick={() => { setViewMode('twoWeeks'); setOffsetWeeks(0) }}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'twoWeeks' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                        {dict.cal_two_weeks || '雙週'}
                    </button>
                    <button
                        onClick={() => { setViewMode('month'); setOffsetMonths(0) }}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                        {dict.cal_month || '月'}
                    </button>
                </div>

                {/* Text Size Toggle */}
                <div className="flex items-center bg-white/10 rounded-md overflow-hidden border border-white/20 ml-2">
                    <button
                        onClick={() => setTextSize('sm')}
                        className={`px-2 py-1 text-[10px] font-medium transition-colors ${textSize === 'sm' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title={dict.cal_size_sm || '小'}
                    >
                        {dict.cal_size_sm || '小'}
                    </button>
                    <button
                        onClick={() => setTextSize('md')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${textSize === 'md' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title={dict.cal_size_md || '中'}
                    >
                        {dict.cal_size_md || '中'}
                    </button>
                    <button
                        onClick={() => setTextSize('lg')}
                        className={`px-2 py-1 text-sm font-medium transition-colors ${textSize === 'lg' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        title={dict.cal_size_lg || '大'}
                    >
                        {dict.cal_size_lg || '大'}
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-1">
                    <button onClick={handlePrev} className="p-1 rounded hover:bg-white/10 transition-colors" title={dict.cal_prev || '上一期'}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium min-w-[100px] text-center opacity-90">{rangeLabel}</span>
                    <button onClick={handleNext} className="p-1 rounded hover:bg-white/10 transition-colors" title={dict.cal_next || '下一期'}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <button onClick={handleToday} className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100">
                    {dict.cal_today || '今天'}
                </button>

                <button onClick={fetchEvents} disabled={isLoading} className="p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100" title={dict.cal_refresh || '重新整理'}>
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
                            <span>{dict.cal_error ? dict.cal_error.replace('{0}', error) : `載入失敗：${error}`}</span>
                        </div>
                    ) : !isConfigured && !isLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-white/60 text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{dict.cal_not_configured || '尚未設定 Google 行事曆。'} <code className="bg-white/10 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> / <code className="bg-white/10 px-1 rounded">GOOGLE_CALENDAR_ID</code></span>
                        </div>
                    ) : (
                        <div className="min-w-[700px]">
                            {rows.map((row, rowIdx) => (
                                <div key={rowIdx} className="grid border-b border-white/10 last:border-b-0" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                                    {row.map((day, dayIdx) => {
                                        const dayEvents = getEventsForDay(events, day)
                                        const isToday = isSameDay(day, new Date())
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6

                                        const todayHighlight = getTodayHighlight(themeColor)

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`px-1.5 py-1 border-r border-white/10 last:border-r-0 min-h-[52px] ${isWeekend && !isToday ? 'bg-white/5' : ''}`}
                                                style={isToday ? { backgroundColor: todayHighlight.cellBg } : undefined}
                                            >
                                                {/* Day Header */}
                                                <div className="flex items-baseline gap-1 mb-1">
                                                    <span
                                                        className={`leading-none ${textSizeClass} ${isToday ? 'rounded-sm px-1 py-0.5 font-bold' : 'opacity-70'}`}
                                                        style={isToday ? { backgroundColor: todayHighlight.bg, color: todayHighlight.text } : undefined}
                                                    >
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
                                                                            {event.isAllDay && <p className="opacity-70 text-xs">{dict.cal_all_day || '全天'}</p>}
                                                                            {event.location && <p className="opacity-70 mt-1 text-xs">📍 {event.location}</p>}
                                                                            {event.description && <p className="opacity-60 mt-1 line-clamp-3 text-xs">{event.description}</p>}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}
                                                            </TooltipProvider>
                                                            {dayEvents.length > 2 && (
                                                                <div className={`opacity-60 px-1 ${textSizeClass}`}>{(dict.cal_more || '+{0} 更多').replace('{0}', (dayEvents.length - 2).toString())}</div>
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
