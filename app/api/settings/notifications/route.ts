import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request) {
  try {
    const { userId, notifications } = await req.json()

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 })
    }

    // Update user notification preferences in database
    const user = await DatabaseService.updateUserNotifications(userId, notifications)

    return NextResponse.json({ 
      ok: true, 
      notifications: user.notification_preferences || {}
    })
  } catch (err: any) {
    console.error('Error updating notifications:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Failed to update notifications' 
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 })
    }

    // Get user notification preferences from database
    const user = await DatabaseService.getUserNotifications(userId)

    return NextResponse.json({ 
      ok: true, 
      notifications: user.notification_preferences || {
        emailNotifications: true,
        candidateUpdates: true,
        interviewReminders: true,
        weeklyReports: false
      }
    })
  } catch (err: any) {
    console.error('Error fetching notifications:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Failed to fetch notifications' 
    }, { status: 500 })
  }
}
