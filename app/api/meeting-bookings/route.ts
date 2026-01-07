import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// Get calendar scheduling URL from environment - NO FALLBACK
const CALENDAR_SCHEDULING_URL = process.env.CALENDAR_SCHEDULING_URL

// POST - Create a new meeting booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      fullName,
      workEmail,
      companyName,
      phoneNumber,
      meetingDate,
      meetingTime,
      meetingEndTime,
      durationMinutes,
      timezone,
      meetingLocation,
      notes
    } = body

    // Validate required fields (date/time are now optional - will be set via Google Calendar)
    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, workEmail, companyName' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(workEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const endTime = meetingEndTime || meetingTime

    // Check if time slot is available (only if date/time provided)
    if (meetingDate && meetingTime) {
      const isAvailable = await DatabaseService.isTimeSlotAvailable(meetingDate, meetingTime, endTime)
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please select a different time.' },
          { status: 409 }
        )
      }
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Generate Google Meet link (using the scheduling URL from .env)
    const meetingLink = CALENDAR_SCHEDULING_URL || null
    
    if (!meetingLink) {
      console.warn('⚠️ [API] CALENDAR_SCHEDULING_URL not configured in .env')
    }

    // Create the booking with the meeting link
    const booking = await DatabaseService.createMeetingBooking({
      fullName,
      workEmail,
      companyName,
      phoneNumber,
      meetingDate,
      meetingTime,
      meetingEndTime: endTime,
      durationMinutes: durationMinutes || 30,
      timezone: timezone || 'India Standard Time',
      meetingLocation: meetingLocation || 'google-meet',
      meetingLink: meetingLink || undefined,
      notes,
      ipAddress,
      userAgent,
      source: 'website'
    })

    console.log('✅ [API] Meeting booking created successfully:', booking.id)

    // NOTE: Emails are NOT sent here - they will be sent automatically by Google Calendar
    // when the user selects a time slot in Step 2 (Google Calendar embed)

    return NextResponse.json({
      success: true,
      message: 'Meeting booked successfully',
      booking: {
        id: booking.id,
        fullName: booking.full_name,
        workEmail: booking.work_email,
        companyName: booking.company_name,
        meetingDate: booking.meeting_date,
        meetingTime: booking.meeting_time,
        meetingEndTime: booking.meeting_end_time,
        meetingLink: booking.meeting_link,
        status: booking.status
      }
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to create meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting booking' },
      { status: 500 }
    )
  }
}

// PATCH - Update meeting booking status (for admin)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, adminNotes, interactionSummary } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++

      // Set timestamps based on status
      if (status === 'confirmed') {
        updates.push(`confirmed_at = NOW()`)
      } else if (status === 'cancelled') {
        updates.push(`cancelled_at = NOW()`)
      }
    }

    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramIndex}`)
      params.push(adminNotes)
      paramIndex++
    }

    if (interactionSummary !== undefined) {
      updates.push(`interaction_summary = $${paramIndex}`)
      params.push(interactionSummary)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    params.push(id)
    const sql = `UPDATE meeting_bookings SET ${updates.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`
    
    const result = await DatabaseService.query(sql, params)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    console.log('✅ [API] Meeting booking updated:', id, 'Status:', status)

    return NextResponse.json({
      success: true,
      booking: result[0]
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to update meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meeting booking' },
      { status: 500 }
    )
  }
}

// GET - Get all meeting bookings (for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const bookings = await DatabaseService.getMeetingBookings({
      status,
      startDate,
      endDate,
      limit,
      offset
    })

    // Also get stats
    const stats = await DatabaseService.getMeetingBookingsStats()

    return NextResponse.json({
      success: true,
      bookings,
      stats,
      pagination: {
        limit,
        offset,
        total: parseInt(stats?.total || '0')
      }
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to get meeting bookings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get meeting bookings' },
      { status: 500 }
    )
  }
}
