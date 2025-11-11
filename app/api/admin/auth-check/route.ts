import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // In production, verify session and check if user is admin
    // For now, return mock admin user
    const user = {
      id: "admin-1",
      email: "admin@hiregenai.com",
      role: "admin",
    }

    return NextResponse.json({ ok: true, user })
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
}
