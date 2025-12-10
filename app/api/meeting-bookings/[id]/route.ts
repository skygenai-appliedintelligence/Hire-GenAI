import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET - Get a specific meeting booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const booking = await DatabaseService.getMeetingBookingById(id)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to get meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get meeting booking' },
      { status: 500 }
    )
  }
}

// PATCH - Update meeting booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const booking = await DatabaseService.updateMeetingBookingStatus(id, status)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to update meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meeting booking' },
      { status: 500 }
    )
  }
}
