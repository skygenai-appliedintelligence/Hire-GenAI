import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { EmailService } from '@/lib/email-service'

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

    // Validate required fields
    if (!fullName || !workEmail || !companyName || !meetingDate || !meetingTime) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, workEmail, companyName, meetingDate, meetingTime' },
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

    // Check if time slot is available (with end time for overlap detection)
    const isAvailable = await DatabaseService.isTimeSlotAvailable(meetingDate, meetingTime, endTime)
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select a different time.' },
        { status: 409 }
      )
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

    // Send emails only if meetingLink is configured in .env
    if (meetingLink) {
      // Send confirmation email to candidate
      try {
        await EmailService.sendMeetingBookingConfirmation({
          fullName,
          workEmail,
          companyName,
          meetingDate,
          meetingTime,
          meetingEndTime: endTime,
          meetingLink,
          timezone: timezone || 'India Standard Time',
        })
        console.log('✅ [API] Confirmation email sent to candidate:', workEmail)
      } catch (emailError: any) {
        console.error('⚠️ [API] Failed to send confirmation email to candidate:', emailError.message)
        // Don't fail the booking if email fails
      }

      // Send notification email to support team
      try {
        await EmailService.sendMeetingBookingNotification({
          fullName,
          workEmail,
          companyName,
          phoneNumber,
          meetingDate,
          meetingTime,
          meetingEndTime: endTime,
          meetingLink,
          timezone: timezone || 'India Standard Time',
          notes,
          bookingId: booking.id,
        })
        console.log('✅ [API] Notification email sent to support team')
      } catch (emailError: any) {
        console.error('⚠️ [API] Failed to send notification email to support:', emailError.message)
        // Don't fail the booking if email fails
      }
    } else {
      console.warn('⚠️ [API] Emails not sent - CALENDAR_SCHEDULING_URL not configured in .env')
    }

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
