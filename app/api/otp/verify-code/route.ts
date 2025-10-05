import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, purpose } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex')

    // Verify the OTP using code_hash (OTPs are stored as hashes for security)
    const verifyQuery = `
      SELECT * FROM otp_challenges 
      WHERE email = $1 
        AND code_hash = $2 
        AND purpose = $3
        AND expires_at > NOW()
        AND consumed_at IS NULL
      LIMIT 1
    `
    const result = await DatabaseService.query(verifyQuery, [normEmail, codeHash, purpose || 'signup']) as any[]

    if (result.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired OTP code' 
      }, { status: 400 })
    }

    const challenge = result[0]

    // Check if max tries exceeded
    if (challenge.tries_used >= challenge.max_tries) {
      return NextResponse.json({ 
        error: 'Maximum OTP attempts exceeded' 
      }, { status: 400 })
    }

    // OTP is valid - just return success
    // Don't mark as consumed yet, that will happen in /api/signup/complete
    return NextResponse.json({
      ok: true,
      message: 'OTP verified successfully'
    })
  } catch (error: any) {
    console.error('Error verifying OTP code:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify OTP' 
    }, { status: 500 })
  }
}
