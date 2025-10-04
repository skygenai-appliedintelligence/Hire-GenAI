import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/interview/link
// Body: { applicationId: string, email: string, name?: string, jobTitle?: string, jdId?: string }
// Generates an interview start URL for the candidate and (for testing) logs it to the server console.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { applicationId, email, name, jobTitle } = body || {}

    if (!applicationId || !email) {
      return NextResponse.json({ ok: false, error: "applicationId and email are required" }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const interviewUrl = `${baseUrl}/interview/${encodeURIComponent(applicationId)}/start`

    // In a real implementation, send an email using your provider (Resend, SES, SendGrid, etc.)
    // For now, log to the server console for testing (like OTP logs during login)
    console.log("[Interview Link] Send to:", email)
    console.log("[Interview Link] Candidate:", name || "Unknown")
    console.log("[Interview Link] Job Title:", jobTitle || "N/A")
    console.log("[Interview Link] URL:", interviewUrl)

    return NextResponse.json({ ok: true, url: interviewUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to generate interview link" }, { status: 500 })
  }
}
