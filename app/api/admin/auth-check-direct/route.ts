import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import crypto from "node:crypto"

// Get allowed admin and support emails from environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
  : []
const SUPPORT_EMAILS = process.env.SUPPORT_EMAILS
  ? process.env.SUPPORT_EMAILS.split(',').map(e => e.trim().toLowerCase())
  : []

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export async function GET(req: NextRequest) {
  const client = await pool.connect()
  try {
    // Get session token from cookie
    const sessionToken = req.cookies.get("admin_session")?.value

    console.log(`🔍 Auth-check: Session token present: ${!!sessionToken}`)

    if (!sessionToken) {
      console.log(`🔍 Auth-check: No session token found`)
      return NextResponse.json(
        { ok: false, error: "No session token" },
        { status: 401 }
      )
    }

    // Hash the session token
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex")

    console.log(`🔍 Auth-check: Looking up session with hash: ${sessionTokenHash.substring(0, 10)}...`)

    // Query admin_sessions table
    const result = await client.query(
      `SELECT id, owner_email, expires_at, revoked_at, ip_address, user_agent 
       FROM admin_sessions 
       WHERE session_token_hash = $1`,
      [sessionTokenHash]
    )

    console.log(`🔍 Auth-check: Query result count: ${result.rows.length}`)

    if (result.rows.length === 0) {
      console.log(`🔍 Auth-check: Session not found in database`)
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 401 }
      )
    }

    const session = result.rows[0]

    console.log(`🔍 Auth-check: Session found for ${session.owner_email}`)

    // Check if session is revoked
    if (session.revoked_at) {
      console.log(`🔍 Auth-check: Session is revoked`)
      return NextResponse.json(
        { ok: false, error: "Session revoked" },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      console.log(`🔍 Auth-check: Session expired`)
      return NextResponse.json(
        { ok: false, error: "Session expired" },
        { status: 401 }
      )
    }

    console.log(`✅ Auth-check: Session valid for ${session.owner_email}`)

    // Update last activity
    await client.query(
      `UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = $1`,
      [session.id]
    )

    // Determine user role based on email
    const normalizedEmail = session.owner_email.toLowerCase().trim()
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail)
    const isSupport = SUPPORT_EMAILS.includes(normalizedEmail)
    const userRole = isAdmin ? "admin" : isSupport ? "support" : "unknown"
    
    console.log(`✅ Auth-check: User role determined as ${userRole} for ${normalizedEmail}`)

    return NextResponse.json({
      ok: true,
      user: {
        id: session.id,
        email: session.owner_email,
        role: userRole,
      },
    })
  } catch (error: any) {
    console.error("Auth-check error:", error)
    return NextResponse.json(
      { ok: false, error: "Authentication failed" },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
