import { NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, otp, applicationId } = await req.json()

    if (!email || !otp || !applicationId) {
      return NextResponse.json({ ok: false, error: 'Email, OTP, and Application ID are required' }, { status: 400 })
    }

    // Verify OTP from database
    const result = await verifyOTP(email, applicationId, otp)

    if (!result.valid) {
      return NextResponse.json({ ok: false, error: result.error || 'Invalid or expired OTP' }, { status: 400 })
    }

    console.log(`[Interview OTP] Verified OTP for ${email} on application ${applicationId}`)

    return NextResponse.json({ 
      ok: true, 
      message: 'OTP verified successfully' 
    })

  } catch (error: any) {
    console.error('[Interview OTP] Verification error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to verify OTP' }, { status: 500 })
  }
}
