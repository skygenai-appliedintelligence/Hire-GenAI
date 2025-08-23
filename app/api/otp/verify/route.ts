import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, companyName, fullName } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()

    // Verify OTP challenge
    await DatabaseService.verifyOtpChallenge(normEmail, otp, 'signup')

    // Create or find company
    const company = await DatabaseService.findOrCreateCompany(normEmail, companyName)

    // Create user
    const user = await DatabaseService.findOrCreateUser(normEmail, fullName.trim(), company.id)

    // Create email identity
    await DatabaseService.createEmailIdentity('user', user.id, normEmail)

    // Create session
    const { session, refreshToken } = await DatabaseService.createSession('user', user.id)

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        status: user.status,
      },
      company: {
        id: company.id,
        name: company.name,
        status: company.status,
        verified: company.verified,
      },
      session: {
        id: session.id,
        refreshToken,
        expiresAt: session.expires_at,
      },
    })
  } catch (error: any) {
    console.error('Error verifying signup OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify OTP' 
    }, { status: 500 })
  }
}
