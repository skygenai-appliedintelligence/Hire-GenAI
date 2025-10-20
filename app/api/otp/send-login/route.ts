import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { MockAuthService } from "@/lib/mock-auth"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, demo } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()
    const isDemoMode = Boolean(demo)

    // Check if database is configured
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, using MockAuthService for login OTP')
      
      // Use MockAuthService as fallback
      const users = MockAuthService.getUsers()
      const user = users.find(u => u.email === normEmail)
      
      if (!user) {
        return NextResponse.json({ error: 'No account found with this email. Please sign up first.' }, { status: 400 })
      }

      // Generate a mock OTP for development
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      console.log('\n' + '='.repeat(50))
      console.log(`🔐 MOCK OTP GENERATED FOR ${isDemoMode ? 'DEMO' : 'REGULAR'} LOGIN`)
      console.log('='.repeat(50))
      console.log(`📧 Email: ${normEmail}`)
      console.log(`🔢 OTP: ${otp}`)
      console.log(`🎯 Purpose: ${isDemoMode ? 'demo-login' : 'login'}`)
      console.log('='.repeat(50) + '\n')

      return NextResponse.json({ 
        ok: true, 
        message: `${isDemoMode ? 'Demo' : 'Login'} OTP sent successfully (using mock service)`,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        debug: { 
          usingMockService: true, 
          email: normEmail, 
          purpose: isDemoMode ? 'demo-login' : 'login',
          userId: user.id,
          isDemoMode
        }
      })
    }

    // Use database service
    if (isDemoMode) {
      // For demo mode, we don't need to check if user exists
      // We'll create them in the demo company during verification
      
      // Create OTP challenge for demo login
      const { challenge, code } = await DatabaseService.createOtpChallenge(
        normEmail, 
        'login', 
        'demo', 
        undefined // No specific user ID for demo mode
      )

      console.log('\n' + '='.repeat(50))
      console.log('🔐 DEMO OTP GENERATED')
      console.log('='.repeat(50))
      console.log(`📧 Email: ${normEmail}`)
      console.log(`🔢 OTP: ${code}`)
      console.log(`🎯 Purpose: demo-login`)
      console.log('='.repeat(50) + '\n')

      return NextResponse.json({ 
        ok: true, 
        message: 'Demo OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? code : undefined,
        debug: { 
          usingDatabase: true, 
          email: normEmail, 
          purpose: 'demo-login',
          challengeId: challenge.id,
          isDemoMode: true
        }
      })
    } else {
      // Regular login mode - user must be registered under the company matching their email domain
      const user = await DatabaseService.findUserByEmailAndCompanyDomain(normEmail)
      if (!user) {
        return NextResponse.json({ error: 'Please register first before signing in.' }, { status: 400 })
      }

      // Create OTP challenge for regular login
      const { challenge, code } = await DatabaseService.createOtpChallenge(
        normEmail, 
        'login', 
        'user', 
        user.id
      )

      return NextResponse.json({ 
        ok: true, 
        message: 'Login OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? code : undefined,
        debug: { 
          usingDatabase: true, 
          email: normEmail, 
          purpose: 'login',
          challengeId: challenge.id,
          userId: user.id,
          isDemoMode: false
        }
      })
    }
  } catch (error: any) {
    console.error('Error sending login OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to send login OTP' 
    }, { status: 500 })
  }
}
