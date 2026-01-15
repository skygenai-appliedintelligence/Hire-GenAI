import { NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, otp, jobId } = await req.json()

    if (!email || !otp || !jobId) {
      return NextResponse.json({ ok: false, error: 'Email, OTP, and Job ID are required' }, { status: 400 })
    }

    // Verify OTP from database
    const result = await verifyOTP(email, jobId, otp)

    if (!result.valid) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }

    console.log(`[Screening OTP] Verified OTP for ${email} on job ${jobId}`)

    return NextResponse.json({ 
      ok: true, 
      message: 'Email verified successfully' 
    })

  } catch (error: any) {
    console.error('[Screening OTP] Verification error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to verify OTP' }, { status: 500 })
  }
}
