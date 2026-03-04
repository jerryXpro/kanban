import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        hasCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
        calendarIdLength: process.env.GOOGLE_CALENDAR_ID?.length || 0,
        hasServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        serviceAccountKeyLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0,
        calendarIdValue: process.env.GOOGLE_CALENDAR_ID ? 'SET' : 'UNSET',
    })
}
