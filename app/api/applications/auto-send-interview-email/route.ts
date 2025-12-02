import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { EmailService } from "@/lib/email-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/applications/auto-send-interview-email
 * Body: { applicationId: string, jobId: string, delay?: number }
 * 
 * This endpoint is called when a candidate is marked as qualified.
 * It checks if the job has auto_schedule_interview = TRUE,
 * then schedules the interview email to be sent after the specified delay (default 1 minute).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { 
      applicationId?: string
      jobId?: string
      delay?: number // delay in milliseconds, default 60000 (1 minute)
    }
    
    const { applicationId, jobId, delay = 60000 } = body

    if (!applicationId || !jobId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing applicationId or jobId" 
      }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database not configured" 
      }, { status: 500 })
    }

    console.log(`🎯 [AUTO-EMAIL] Checking auto-schedule for job: ${jobId}`)

    // Check if job has auto_schedule_interview enabled
    const jobQuery = `
      SELECT auto_schedule_interview 
      FROM jobs 
      WHERE id = $1::uuid
    `
    const jobRows = await (DatabaseService as any)["query"]?.call(
      DatabaseService, 
      jobQuery, 
      [jobId]
    ) as any[]

    if (!jobRows || jobRows.length === 0) {
      console.log(`⚠️ [AUTO-EMAIL] Job not found: ${jobId}`)
      return NextResponse.json({ 
        ok: false, 
        error: "Job not found" 
      }, { status: 404 })
    }

    const autoScheduleEnabled = jobRows[0]?.auto_schedule_interview === true

    if (!autoScheduleEnabled) {
      console.log(`ℹ️ [AUTO-EMAIL] Auto-schedule is OFF for job: ${jobId}`)
      return NextResponse.json({ 
        ok: true, 
        message: "Auto-schedule is disabled for this job",
        scheduled: false 
      })
    }

    // Check if email was already sent
    const checkQuery = `
      SELECT interview_email_sent 
      FROM applications 
      WHERE id = $1::uuid
    `
    const checkRows = await (DatabaseService as any)["query"]?.call(
      DatabaseService, 
      checkQuery, 
      [applicationId]
    ) as any[]

    if (checkRows?.[0]?.interview_email_sent === true) {
      console.log(`ℹ️ [AUTO-EMAIL] Email already sent for application: ${applicationId}`)
      return NextResponse.json({ 
        ok: true, 
        message: "Email already sent",
        scheduled: false 
      })
    }

    console.log(`⏰ [AUTO-EMAIL] Scheduling email to be sent in ${delay / 1000} seconds...`)

    // Schedule the email to be sent after the delay
    // Using setTimeout for simplicity (for production, consider using a job queue)
    setTimeout(async () => {
      try {
        await sendInterviewEmail(applicationId, jobId)
      } catch (err) {
        console.error(`❌ [AUTO-EMAIL] Failed to send scheduled email:`, err)
      }
    }, delay)

    return NextResponse.json({ 
      ok: true, 
      message: `Interview email scheduled to be sent in ${delay / 1000} seconds`,
      scheduled: true,
      delayMs: delay
    })

  } catch (e: any) {
    console.error("❌ [AUTO-EMAIL] Error:", e)
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Failed to schedule email" 
    }, { status: 500 })
  }
}

/**
 * Internal function to send the interview email
 */
async function sendInterviewEmail(applicationId: string, jobId: string) {
  console.log(`📧 [AUTO-EMAIL] Sending interview email for application: ${applicationId}`)

  // Get application and job details
  const query = `
    SELECT 
      a.id as application_id,
      a.email as candidate_email,
      a.first_name,
      a.last_name,
      j.id as job_id,
      j.title as job_title,
      c.name as company_name,
      c.id as company_id
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE a.id = $1::uuid AND j.id = $2::uuid
  `
  const rows = await (DatabaseService as any)["query"]?.call(
    DatabaseService, 
    query, 
    [applicationId, jobId]
  ) as any[]

  if (!rows || rows.length === 0) {
    throw new Error("Application or job not found")
  }

  const row = rows[0]
  const candidateName = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Candidate'
  const candidateEmail = row.candidate_email
  const jobTitle = row.job_title
  const companyName = row.company_name
  const companyId = row.company_id

  if (!candidateEmail) {
    throw new Error("Candidate email not found")
  }

  // Get the saved interview message template from the database
  const messageQuery = `
    SELECT content 
    FROM messages 
    WHERE company_id = $1::uuid 
      AND category = 'interview' 
      AND status = 'draft'
    ORDER BY updated_at DESC 
    LIMIT 1
  `
  const messageRows = await (DatabaseService as any)["query"]?.call(
    DatabaseService, 
    messageQuery, 
    [companyId]
  ) as any[]

  // Default message template if none saved
  let messageContent = messageRows?.[0]?.content || getDefaultInterviewMessage()

  // Generate interview link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const interviewLink = `${baseUrl}/interview/${encodeURIComponent(applicationId)}/start`

  // Replace placeholders in the message
  messageContent = messageContent
    .replace(/\[Candidate Name\]/g, candidateName)
    .replace(/\[Job Title\]/g, jobTitle)
    .replace(/\[Role Name\]/g, jobTitle)
    .replace(/\[Company Name\]/g, companyName)
    .replace(/\[Insert Meeting Link\]/g, interviewLink)
    .replace(/\[Date\]/g, "Valid for 48 hours")
    .replace(/\[Your Name\]/g, "Recruitment Team")
    .replace(/\[Your Job Title\]/g, "HR Manager")
    .replace(/\[Your Designation\]/g, "HR Manager")

  // Send the email
  await EmailService.sendCustomMessage({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    messageContent,
    category: 'interview',
  })

  console.log(`✅ [AUTO-EMAIL] Email sent successfully to: ${candidateEmail}`)

  // Update the application to mark email as sent
  const updateQuery = `
    UPDATE applications 
    SET interview_email_sent = TRUE, 
        interview_email_sent_at = NOW()
    WHERE id = $1::uuid
  `
  await (DatabaseService as any)["query"]?.call(
    DatabaseService, 
    updateQuery, 
    [applicationId]
  )

  console.log(`✅ [AUTO-EMAIL] Application updated: interview_email_sent = TRUE`)
}

/**
 * Default interview invitation message
 */
function getDefaultInterviewMessage(): string {
  return `Dear [Candidate Name],

Thank you for applying for the [Job Title] position at [Company Name].

We are pleased to inform you that your application has been shortlisted, and we would like to invite you for an AI-powered interview.

Please click the link below to start your interview:
[Insert Meeting Link]

This interview link is valid for 48 hours. Please ensure you are in a quiet environment with a stable internet connection.

Best regards,
[Company Name] Recruitment Team`
}
