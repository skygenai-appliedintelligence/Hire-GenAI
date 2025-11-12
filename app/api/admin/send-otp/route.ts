import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "node:crypto"
import nodemailer from "nodemailer"

const OWNER_EMAIL = process.env.OWNER_EMAIL || "support@hire-genai.com"

// Configure email transporter
const smtpUser = process.env.SMTP_USER || process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if email is the owner email
    if (normalizedEmail !== OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Access restricted", restricted: true },
        { status: 403 }
      )
    }

    // Generate OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const codeHash = crypto.createHash("sha256").update(code).digest("hex")

    const sb = createServerClient()

    // Remove previous pending OTPs for this email
    await sb
      .from("otp_challenges")
      .delete()
      .eq("email", normalizedEmail)
      .eq("purpose", "admin_login")

    // Insert new OTP challenge
    const { error: insertError } = await sb.from("otp_challenges").insert({
      email: normalizedEmail,
      principal_type: "admin",
      purpose: "admin_login",
      code_hash: codeHash,
      max_tries: 5,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error("OTP insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to generate OTP" },
        { status: 500 }
      )
    }

    // Send OTP via email
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@hire-genai.com",
        to: normalizedEmail,
        subject: "HireGenAI Admin Login - OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">HireGenAI Admin Login</h2>
            <p>Your one-time password (OTP) for admin access:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin: 0;">${code}</p>
            </div>
            <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      })
      console.log(`✅ OTP email sent to ${normalizedEmail}`)
    } catch (emailError) {
      console.error("Email send error:", emailError)
      // Don't fail the request if email fails, but log it
    }

    // Log OTP to console for testing/development
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n${"=".repeat(60)}`)
      console.log(`🔐 DEVELOPMENT MODE - OTP FOR TESTING`)
      console.log(`${"=".repeat(60)}`)
      console.log(`Email: ${normalizedEmail}`)
      console.log(`OTP Code: ${code}`)
      console.log(`Expires in: 10 minutes`)
      console.log(`${"=".repeat(60)}\n`)
    }

    return NextResponse.json({ ok: true, message: "OTP sent to email" })
  } catch (err: any) {
    console.error("Send OTP error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}
