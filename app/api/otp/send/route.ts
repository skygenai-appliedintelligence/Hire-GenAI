import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, fullName, companyName } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()

    // Check if user already exists in their own company domain (not demo company)
    const existingUser = await DatabaseService.findUserByEmailAndCompanyDomain(normEmail)
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists. Please use login instead.' }, { status: 400 })
    }

    // Create OTP challenge for signup
    const { challenge, code } = await DatabaseService.createOtpChallenge(normEmail, 'signup')

    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? code : undefined,
      debug: { 
        usingSupabase: true, 
        email: normEmail, 
        purpose: 'signup',
        challengeId: challenge.id
      }
    })
  } catch (error: any) {
    console.error('Error sending signup OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to send OTP' 
    }, { status: 500 })
  }
}
