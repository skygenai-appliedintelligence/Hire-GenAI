import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { OtpEmailService } from "@/lib/otp-email-service"

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

    // Send OTP via email
    try {
      await OtpEmailService.sendSignupOtp({
        email: normEmail,
        fullName,
        otp: code,
        companyName,
      });
      console.log(`✅ Signup OTP sent via email to: ${normEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      // Continue with response even if email fails (fallback to console log)
      console.log('\n' + '='.repeat(50));
      console.log('🔐 SIGNUP OTP (EMAIL FAILED - CONSOLE FALLBACK)');
      console.log('='.repeat(50));
      console.log(`📧 Email: ${normEmail}`);
      console.log(`🔢 OTP: ${code}`);
      console.log(`👤 Name: ${fullName}`);
      console.log('='.repeat(50) + '\n');
    }

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
