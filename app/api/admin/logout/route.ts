import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "node:crypto"

export async function POST(req: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = req.cookies.get("admin_session")?.value

    if (sessionToken) {
      // Hash the session token
      const sessionTokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex")

      const sb = createServerClient()

      // Revoke the session
      await sb
        .from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_token_hash", sessionTokenHash)
    }

    // Clear the session cookie
    const response = NextResponse.json({ ok: true, message: "Logged out successfully" })
    response.cookies.delete("admin_session")

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { ok: false, error: "Logout failed" },
      { status: 500 }
    )
  }
}
