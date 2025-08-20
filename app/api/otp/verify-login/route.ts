import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    // Ensure user exists (login should not auto-create accounts)
    const user = await prisma.users.findUnique({ where: { email }, include: { company: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch latest OTP for email
    const otpRecord = await prisma.email_otps.findFirst({
      where: { email },
      orderBy: { created_at: "desc" },
    })

    if (!otpRecord) {
      return NextResponse.json({ error: "No OTP found for this email" }, { status: 400 })
    }

    if (new Date() > otpRecord.expires_at) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 })
    }

    if (otpRecord.code !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    // Consume OTP
    await prisma.email_otps.deleteMany({ where: { email } })

    // Success response
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name,
            slug: user.company.slug,
            industry: user.company.industry,
            size: user.company.size,
            website: user.company.website,
          }
        : null,
    })
  } catch (error: any) {
    console.error("Error verifying login OTP:", error)
    return NextResponse.json({ error: error?.message || "Failed to verify OTP" }, { status: 500 })
  }
}
