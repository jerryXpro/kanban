import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId') || process.env['GOOGLE_CALENDAR_ID']
    const viewMode = searchParams.get('view') || 'twoWeeks' // 'twoWeeks' | 'month'

    if (!calendarId) {
        return NextResponse.json({ error: 'No calendar ID provided' }, { status: 400 })
    }

    const serviceAccountKeyRaw = process.env['GOOGLE_SERVICE_ACCOUNT_KEY']
    if (!serviceAccountKeyRaw) {
        // Return empty events so the UI can show a placeholder state
        return NextResponse.json({ events: [], configured: false })
    }

    try {
        const serviceAccountKey = JSON.parse(serviceAccountKeyRaw)

        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccountKey,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        })

        const calendar = google.calendar({ version: 'v3', auth })

        const now = new Date()
        let timeMax: Date

        if (viewMode === 'month') {
            // End of current month
            timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        } else {
            // 14 days from now (two weeks)
            timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        }

        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: now.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
        })

        const events = (response.data.items || []).map(event => ({
            id: event.id,
            title: event.summary || '(未命名事件)',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            isAllDay: !event.start?.dateTime,
            description: event.description || null,
            location: event.location || null,
            color: event.colorId ? colorMap[event.colorId] : null,
        }))

        return NextResponse.json({ events, configured: true })
    } catch (error: any) {
        console.error('Google Calendar API error:', error.message)
        return NextResponse.json({ error: error.message, events: [], configured: false }, { status: 500 })
    }
}

// Google Calendar color IDs to hex colors
const colorMap: Record<string, string> = {
    '1': '#7986CB', // Lavender
    '2': '#33B679', // Sage
    '3': '#8E24AA', // Grape
    '4': '#E67C73', // Flamingo
    '5': '#F6BF26', // Banana
    '6': '#F4511E', // Tangerine
    '7': '#039BE5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3F51B5', // Blueberry
    '10': '#0B8043', // Basil
    '11': '#D50000', // Tomato
}
