import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/interview/link
// Body: { applicationId: string, email: string, name?: string, jobTitle?: string, jdId?: string }
// Generates an interview start URL for the candidate and (for testing) logs it to the server console.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { applicationId, email, name, jobTitle, customMessage, category } = body || {}

    if (!applicationId || !email) {
      return NextResponse.json({ ok: false, error: "applicationId and email are required" }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const interviewUrl = `${baseUrl}/interview/${encodeURIComponent(applicationId)}`

    // In a real implementation, send an email using your provider (Resend, SES, SendGrid, etc.)
    // For now, log to the server console for testing (like OTP logs during login)
    console.log("\n" + "=".repeat(80))
    console.log("📧 EMAIL SENT TO CANDIDATE")
    console.log("=".repeat(80))
    console.log("📧 Recipient:", email)
    console.log("👤 Candidate:", name || "Unknown")
    console.log("💼 Job Title:", jobTitle || "N/A")
    console.log("🔗 Interview URL:", interviewUrl)
    console.log("📂 Category:", category || "interview")
    console.log("\n📝 FULL EMAIL CONTENT:")
    console.log("-".repeat(50))
    if (customMessage) {
      console.log(customMessage)
    } else {
      console.log("No custom message provided")
    }
    console.log("-".repeat(50))
    console.log("=".repeat(80) + "\n")

    return NextResponse.json({ ok: true, url: interviewUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to generate interview link" }, { status: 500 })
  }
}
