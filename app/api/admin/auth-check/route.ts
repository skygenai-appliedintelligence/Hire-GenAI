import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "node:crypto"

const OWNER_EMAIL = process.env.OWNER_EMAIL || "support@hire-genai.com"

export async function GET(req: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = req.cookies.get("admin_session")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, error: "No session found" },
        { status: 401 }
      )
    }

    // Hash the session token
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex")

    const sb = createServerClient()

    // Verify session exists and is not expired
    const { data: sessions, error } = await sb
      .from("admin_sessions")
      .select("id, owner_email, expires_at, revoked_at")
      .eq("session_token_hash", sessionTokenHash)
      .limit(1)

    if (error || !sessions || sessions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401 }
      )
    }

    const session = sessions[0]

    // Check if session is revoked
    if (session.revoked_at) {
      return NextResponse.json(
        { ok: false, error: "Session revoked" },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json(
        { ok: false, error: "Session expired" },
        { status: 401 }
      )
    }

    // Update last activity
    await sb
      .from("admin_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", session.id)

    // Return authenticated user
    const user = {
      id: "owner",
      email: session.owner_email,
      role: "admin",
    }

    return NextResponse.json({ ok: true, user })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    )
  }
}
