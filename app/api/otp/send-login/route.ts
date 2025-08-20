import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if the user exists
    const user = await prisma.users.findUnique({ where: { email }, include: { company: true } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Remove existing OTPs for this email
    await prisma.email_otps.deleteMany({ where: { email } })

    // Store new OTP
    await prisma.email_otps.create({
      data: {
        email,
        code,
        expires_at: expiresAt,
      },
    })

    if (process.env.NODE_ENV !== "production") {
      console.log(`\n===== OTP LOGIN CODE =====\nEmail: ${email}\nOTP: ${code}\nExpires: ${expiresAt.toISOString()}\n==========================\n`)
    }

    return NextResponse.json({ ok: true, message: "OTP sent" })
  } catch (error: any) {
    console.error("Error sending login OTP:", error)
    return NextResponse.json({ error: error?.message || "Failed to send OTP" }, { status: 500 })
  }
}
