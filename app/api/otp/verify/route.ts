import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, companyName, fullName } = await req.json()
    
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    // Find the OTP in database
    const otpRecord = await prisma.email_otps.findFirst({
      where: { email },
      orderBy: { created_at: 'desc' }
    })

    if (!otpRecord) {
      return NextResponse.json({ error: 'No OTP found for this email' }, { status: 400 })
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expires_at) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // Verify OTP
    if (otpRecord.code !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.users.findUnique({
      where: { email },
      include: { company: true }
    })

    if (!user) {
      // Create new user and company (derive sensible defaults if missing)
      const deriveNameFromEmail = (addr: string) => addr.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
      const deriveCompanyFromEmail = (addr: string) => {
        const domain = addr.split('@')[1] || 'company'
        const base = (domain.split('.')[0] || 'company').replace(/[._-]+/g, ' ')
        return base.replace(/\b\w/g, (m) => m.toUpperCase())
      }
      const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 40)

      const finalFullName = (fullName && fullName.trim().length > 0) ? fullName : deriveNameFromEmail(email)
      const finalCompanyName = (companyName && companyName.trim().length > 0) ? companyName : deriveCompanyFromEmail(email)
      const companySlug = slugify(finalCompanyName) || `company-${Date.now()}`

      // Reuse company if slug already exists, otherwise create
      let company = await prisma.companies.findFirst({ where: { slug: companySlug } })
      if (!company) {
        company = await prisma.companies.create({
          data: {
            name: finalCompanyName,
            slug: companySlug,
            industry: "Technology",
            size: "1-10",
            website: "",
            email: email,
          },
        })
      }

      // Create user
      user = await prisma.users.create({
        data: {
          email,
          name: finalFullName,
          role: "company_admin",
          status: "active",
          company_id: company.id,
        },
        include: { company: true },
      })

      console.log('\n' + '='.repeat(50))
      console.log('✅ NEW USER CREATED')
      console.log('='.repeat(50))
      console.log(`👤 User: ${fullName} (${email})`)
      console.log(`🏢 Company: ${user.company?.name}`)
      console.log(`🔑 Role: Company Admin`)
      console.log('='.repeat(50) + '\n')
    } else {
      console.log('\n' + '='.repeat(50))
      console.log('✅ USER LOGGED IN')
      console.log('='.repeat(50))
      console.log(`👤 User: ${user.name} (${email})`)
      console.log(`🏢 Company: ${user.company?.name || 'Unknown'}`)
      console.log(`🔑 Role: ${user.role}`)
      console.log('='.repeat(50) + '\n')
    }

    // Delete the used OTP
    await prisma.email_otps.deleteMany({ where: { email } })

    return NextResponse.json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        industry: user.company.industry,
        size: user.company.size,
        website: user.company.website
      } : null
    })
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to verify OTP' 
    }, { status: 500 })
  }
}
