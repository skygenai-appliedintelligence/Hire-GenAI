import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import crypto from "node:crypto"

const OWNER_EMAIL = process.env.OWNER_EMAIL || "support@hire-genai.com"
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export async function POST(req: NextRequest) {
  const client = await pool.connect()
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

    // Verify email is owner
    if (normalizedEmail !== OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Access restricted", restricted: true },
        { status: 403 }
      )
    }

    // Get the OTP challenge
    const challengeResult = await client.query(
      `SELECT id, code_hash, expires_at, tries_used, max_tries 
       FROM otp_challenges 
       WHERE email = $1 AND purpose = 'admin_login'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [normalizedEmail]
    )

    console.log(`🔍 Database query result:`, {
      error: null,
      count: challengeResult.rows.length,
    })

    if (challengeResult.rows.length === 0) {
      console.log(`🔍 Challenge found: No challenge`)
      return NextResponse.json(
        { error: "No OTP found for this email" },
        { status: 400 }
      )
    }

    const record = challengeResult.rows[0]

    console.log(`🔍 Challenge found:`, {
      id: record.id,
      expires_at: record.expires_at,
      tries_used: record.tries_used,
      max_tries: record.max_tries,
    })

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
      await client.query(
        `UPDATE otp_challenges SET tries_used = tries_used + 1 WHERE id = $1`,
        [record.id]
      )
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
    await client.query(
      `INSERT INTO admin_sessions 
       (owner_email, session_token_hash, ip_address, user_agent, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, sessionTokenHash, ip, userAgent, expiresAt.toISOString()]
    )

    console.log(`🔍 Session created successfully`)

    // Delete the OTP challenge
    await client.query(`DELETE FROM otp_challenges WHERE id = $1`, [record.id])

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
  } finally {
    client.release()
  }
}
