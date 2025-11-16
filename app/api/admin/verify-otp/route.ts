import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "node:crypto"

const OWNER_EMAIL = process.env.OWNER_EMAIL || "support@hire-genai.com"
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(req: NextRequest) {
  try {
    const { email, code } = (await req.json()) as { email: string; code: string }

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    console.log(`🔍 Verifying OTP for: ${normalizedEmail}, Code: ${code}`)
    console.log(`🔍 OWNER_EMAIL: ${OWNER_EMAIL}`)
    console.log(`🔍 Email matches: ${normalizedEmail === OWNER_EMAIL.toLowerCase()}`)
    if (normalizedEmail !== OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Access restricted", restricted: true },
        { status: 403 }
      )
    }

    const sb = createServerClient()

    // Get the OTP challenge
    const { data: challenges, error: chErr } = await sb
      .from("otp_challenges")
      .select("id, code_hash, expires_at, tries_used, max_tries")
      .eq("email", normalizedEmail)
      .eq("purpose", "admin_login")
      .order("created_at", { ascending: false })
      .limit(1)

    console.log(`🔍 Database query result:`, { error: chErr, count: challenges?.length })
    console.log(`🔍 Challenge found:`, challenges?.[0] ? {
      id: challenges[0].id,
      expires_at: challenges[0].expires_at,
      tries_used: challenges[0].tries_used,
      max_tries: challenges[0].max_tries
    } : 'No challenge')

    if (chErr || !challenges || challenges.length === 0) {
      return NextResponse.json(
        { error: "No OTP found for this email" },
        { status: 400 }
      )
    }

    const record = challenges[0]

    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 })
    }

    // Check max tries
    if (record.tries_used >= record.max_tries) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      )
    }

    // Verify code
    const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex")
    console.log(`🔍 Code hash comparison:`)
    console.log(`   Input code: ${code}`)
    console.log(`   Generated hash: ${codeHash}`)
    console.log(`   Stored hash: ${record.code_hash}`)
    console.log(`   Hashes match: ${record.code_hash === codeHash}`)

    if (record.code_hash !== codeHash) {
      await sb
        .from("otp_challenges")
        .update({ tries_used: (record.tries_used ?? 0) + 1 })
        .eq("id", record.id)
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex")
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex")

    const expiresAt = new Date(Date.now() + SESSION_DURATION)

    // Get client IP and user agent
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const userAgent = req.headers.get("user-agent") || undefined

    // Create admin session
    const { error: sessionError } = await sb.from("admin_sessions").insert({
      owner_email: normalizedEmail,
      session_token_hash: sessionTokenHash,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })

    console.log(`🔍 Session creation:`, {
      owner_email: normalizedEmail,
      session_token_hash: sessionTokenHash.substring(0, 10) + '...', // Truncated for security
      ip_address: ip,
      expires_at: expiresAt.toISOString(),
      error: sessionError
    })

    if (sessionError) {
      console.error("Session creation error:", sessionError)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Delete the OTP challenge
    await sb.from("otp_challenges").delete().eq("id", record.id)

    // Create response with session token in cookie
    const response = NextResponse.json({
      ok: true,
      message: "Login successful",
      sessionToken,
    })

    // Set secure session cookie
    response.cookies.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: "/",
    })

    return response
  } catch (err: any) {
    console.error("Verify OTP error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}
