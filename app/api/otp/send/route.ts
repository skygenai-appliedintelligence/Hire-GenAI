import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, companyName, fullName } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Store OTP in database (delete older and insert fresh)
    await prisma.email_otps.deleteMany({ where: { email } })
    await prisma.email_otps.create({
      data: {
        email,
        code,
        expires_at: expiresAt,
      },
    })

    // Also ensure a company record is reserved when provided, respecting unique name
    if (companyName && companyName.trim()) {
      const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 40)
      const slug = slugify(companyName)
      const existingByName = await prisma.companies.findFirst({ where: { name: companyName } })
      if (!existingByName) {
        const placeholderEmail = `${slug || 'company'}+${Date.now()}@example.com`
        try {
          await prisma.companies.create({
            data: {
              name: companyName,
              slug: slug || `company-${Date.now()}`,
              email: placeholderEmail,
            },
          })
        } catch (_) {
          // Ignore unique violations here; verify endpoint will handle final association
        }
      }
    }

    // Log OTP to terminal for development
    console.log('\n' + '='.repeat(50))
    console.log('🔐 OTP SENT FOR DEVELOPMENT')
    console.log('='.repeat(50))
    console.log(`📧 Email: ${email}`)
    if (fullName) console.log(`👤 Name: ${fullName}`)
    if (companyName) console.log(`🏢 Company: ${companyName}`)
    console.log(`🔢 OTP: ${code}`)
    console.log(`⏰ Expires: ${expiresAt.toLocaleString()}`)
    console.log('='.repeat(50) + '\n')

    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? code : undefined // Only return OTP in development
    })
  } catch (error: any) {
    console.error('Error sending OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to send OTP' 
    }, { status: 500 })
  }
}
