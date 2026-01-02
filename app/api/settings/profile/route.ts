import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request) {
  try {
    const { userId, email, name, phone, timezone } = await req.json()

    console.log('Profile update request:', { userId, email, name, phone, timezone })

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 })
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 })
    }

    // Check if database is configured, fallback to mock service if not
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, using mock response for profile update')
      return NextResponse.json({ 
        ok: true, 
        user: {
          id: userId,
          email: 'mock@example.com',
          full_name: name.trim(),
          phone: phone?.trim() || null,
          timezone: timezone || 'UTC',
          status: 'active'
        }
      })
    }
    
    // Store phone and timezone in user session data
    // This is a workaround since we don't have a user_profiles table
    // These values will be stored in memory and accessible via user context

    // Attempt update by userId, then fallback to email (no auto-creation)
    try {
      const user = await DatabaseService.updateUserProfile(userId, {
        full_name: name.trim(),
        phone: phone?.trim() || null,
        timezone: timezone || 'UTC'
      })
      return NextResponse.json({ 
        ok: true, 
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          timezone: user.timezone,
          status: user.status
        }
      })
    } catch (error: any) {
      if (error.message.includes('not found in database')) {
        // Try locate by email and update that record instead
        if (email) {
          const existing = await DatabaseService.getUserByEmailSimple(email)
          if (existing?.id) {
            const updated = await DatabaseService.updateUserProfile(existing.id, {
              full_name: name.trim(),
              phone: phone?.trim() || null,
              timezone: timezone || 'UTC'
            })
            return NextResponse.json({
              ok: true,
              user: {
                id: updated.id,
                email: updated.email,
                full_name: updated.full_name,
                phone: updated.phone,
                timezone: updated.timezone,
                status: updated.status,
              }
            })
          }
        }
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
      }
      throw error
    }
  } catch (err: any) {
    console.error('Error updating profile:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Failed to update profile' 
    }, { status: 500 })
  }
}
