import { NextRequest, NextResponse } from 'next/server'

// GET - Get calendar configuration for frontend
// This endpoint provides the calendar scheduling URL without exposing it in client-side code
export async function GET(request: NextRequest) {
  try {
    // Get calendar URL from environment variable - NO FALLBACK
    const calendarUrl = process.env.CALENDAR_SCHEDULING_URL
    
    if (!calendarUrl) {
      console.warn('⚠️ [API] CALENDAR_SCHEDULING_URL not configured in .env')
    }
    
    return NextResponse.json({
      success: true,
      config: {
        schedulingUrl: calendarUrl || null,
        defaultDuration: 30,
        defaultTimezone: 'India Standard Time',
        meetingLocation: 'google-meet',
      }
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to get calendar config:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get calendar configuration' },
      { status: 500 }
    )
  }
}
