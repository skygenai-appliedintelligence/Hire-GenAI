import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      email, 
      otp,
      // Step 1: Company Information
      companyName,
      industry,
      companySize,
      website,
      companyDescription,
      // Step 2: Contact Information
      street,
      city,
      state,
      postalCode,
      country,
      phone,
      // Step 3: Legal Information
      legalCompanyName,
      taxId,
      registrationNumber,
      // Step 4: Admin Account
      firstName,
      lastName,
      jobTitle,
      // Step 5: Consent
      agreeTos,
      agreePrivacy
    } = body
    
    // Validate required fields
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    if (!agreeTos || !agreePrivacy) {
      return NextResponse.json({ error: 'You must agree to Terms of Service and Privacy Policy' }, { status: 400 })
    }

    const normEmail = String(email).trim().toLowerCase()
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex')

    // Check if OTP exists and is valid (using code_hash)
    const checkOtpQuery = `
      SELECT * FROM otp_challenges 
      WHERE email = $1 
        AND code_hash = $2 
        AND purpose = 'signup'
        AND expires_at > NOW()
        AND consumed_at IS NULL
      LIMIT 1
    `
    const otpCheck = await DatabaseService.query(checkOtpQuery, [normEmail, codeHash]) as any[]
    
    if (otpCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired OTP. Please verify your email again.' 
      }, { status: 400 })
    }

    // Check if user already exists in their own company domain (not demo company)
    console.log('🔍 Checking if user exists in own domain for:', normEmail)
    const existingUser = await DatabaseService.findUserByEmailAndCompanyDomain(normEmail)
    console.log('🔍 Domain check result:', existingUser ? 'USER EXISTS' : 'USER NOT EXISTS')
    
    if (existingUser) {
      // User already exists, consume OTP and return existing user data
      const consumeOtpQuery = `
        UPDATE otp_challenges 
        SET consumed_at = NOW()
        WHERE email = $1 AND code_hash = $2 AND purpose = 'signup'
      `
      await DatabaseService.query(consumeOtpQuery, [normEmail, codeHash])
      
      // Create new session for existing user
      const { session, refreshToken } = await DatabaseService.createSession('user', existingUser.id)
      
      return NextResponse.json({
        ok: true,
        message: 'Account already exists. Logged in successfully.',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          full_name: existingUser.full_name,
          status: existingUser.status,
        },
        company: {
          id: existingUser.company_id,
          name: existingUser.companies.name,
        },
        session: {
          id: session.id,
          refreshToken,
          expiresAt: session.expires_at,
        },
      })
    }

    // Create company with full signup data
    console.log('🏢 Creating company for:', normEmail, 'with name:', companyName)
    const company = await DatabaseService.createCompanyFromSignup(normEmail, {
      companyName: companyName.trim(),
      industry: industry || undefined,
      companySize: companySize || undefined,
      website: website || undefined,
      companyDescription: companyDescription || undefined,
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
      phone: phone || undefined,
      legalCompanyName: legalCompanyName || undefined,
      taxId: taxId || undefined,
      registrationNumber: registrationNumber || undefined,
    })

    console.log('✅ Company created:', { id: company.id, name: company.name })

    // Create user with job title and mark email as verified (since OTP was verified)
    console.log('👤 Creating user for:', normEmail, 'in company:', company.id)
    const user = await DatabaseService.findOrCreateUser(
      normEmail, 
      fullName, 
      company.id,
      jobTitle && jobTitle.trim() ? jobTitle.trim() : undefined,
      true // Email is verified since OTP was successfully verified
    )

    console.log('✅ User created:', { id: user.id, email: user.email, company_id: user.company_id })

    // Create email identity
    await DatabaseService.createEmailIdentity('user', user.id, normEmail)

    // Create session
    const { session, refreshToken } = await DatabaseService.createSession('user', user.id)

    // Mark OTP as consumed ONLY after all operations succeed
    const consumeOtpQuery = `
      UPDATE otp_challenges 
      SET consumed_at = NOW()
      WHERE email = $1 AND code_hash = $2 AND purpose = 'signup'
    `
    await DatabaseService.query(consumeOtpQuery, [normEmail, codeHash])

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
        industry: company.industry,
        size_band: company.size_band,
        website_url: company.website_url,
        headquarters: company.headquarters,
      },
      session: {
        id: session.id,
        refreshToken,
        expiresAt: session.expires_at,
      },
    })
  } catch (error: any) {
    console.error('Error completing signup:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to complete signup' 
    }, { status: 500 })
  }
}
