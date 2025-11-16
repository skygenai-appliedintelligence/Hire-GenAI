import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import crypto from "node:crypto"

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
    // Get session token from cookie
    const sessionToken = req.cookies.get("admin_session")?.value

    console.log(`🔍 Logout: Session token present: ${!!sessionToken}`)

    if (!sessionToken) {
      console.log(`🔍 Logout: No session token found`)
      const response = NextResponse.json({ ok: true, message: "Logged out" })
      response.cookies.delete("admin_session")
      return response
    }

    // Hash the session token
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex")

    console.log(`🔍 Logout: Revoking session with hash: ${sessionTokenHash.substring(0, 10)}...`)

    // Revoke the session
    const result = await client.query(
      `UPDATE admin_sessions 
       SET revoked_at = NOW() 
       WHERE session_token_hash = $1
       RETURNING id, owner_email`,
      [sessionTokenHash]
    )

    if (result.rows.length > 0) {
      console.log(`✅ Logout: Session revoked for ${result.rows[0].owner_email}`)
    } else {
      console.log(`🔍 Logout: Session not found (already revoked?)`)
    }

    // Create response and clear cookie
    const response = NextResponse.json({ ok: true, message: "Logged out successfully" })
    response.cookies.delete("admin_session")

    return response
  } catch (error: any) {
    console.error("Logout error:", error)
    const response = NextResponse.json(
      { ok: false, error: "Logout failed" },
      { status: 500 }
    )
    response.cookies.delete("admin_session")
    return response
  } finally {
    client.release()
  }
}
