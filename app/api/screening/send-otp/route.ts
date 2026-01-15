import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { sendMail } from '@/lib/smtp'
import { storeOTP, generateOTP } from '@/lib/otp-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, jobId } = await req.json()

    if (!email || !jobId) {
      return NextResponse.json({ ok: false, error: 'Email and Job ID are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email format' }, { status: 400 })
    }

    // Check if this email has already applied for this job
    if (DatabaseService.isDatabaseConfigured()) {
      const checkQuery = `
        SELECT id FROM candidate_screening_answers 
        WHERE job_id = $1::uuid 
        AND candidate_details->>'email' = $2
        LIMIT 1
      `
      const existing = await (DatabaseService as any).query(checkQuery, [jobId, email.toLowerCase()])
      
      if (existing && existing.length > 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'This email has already been used to apply for this job. Please use a different email address.' 
        }, { status: 400 })
      }

      // Also check in applications table
      const checkApplicationQuery = `
        SELECT id FROM applications 
        WHERE job_id = $1::uuid 
        AND email = $2
        LIMIT 1
      `
      const existingApplication = await (DatabaseService as any).query(checkApplicationQuery, [jobId, email.toLowerCase()])
      
      if (existingApplication && existingApplication.length > 0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'This email has already been used to apply for this job. Please use a different email address.' 
        }, { status: 400 })
      }
    }

    // Generate OTP
    const otp = generateOTP()

    // Store OTP in database
    await storeOTP(email, jobId, otp, 10) // 10 minutes expiry

    // Send OTP email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Email Verification</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Please use the following OTP to verify your email address:
            </p>
            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #059669;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
              This code will expire in <strong>10 minutes</strong>.<br>
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} HireGenAI. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    await sendMail({
      to: email,
      subject: 'Your Verification Code - HireGenAI',
      html: emailHtml,
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: 'no-reply@hire-genai.com'
    })

    console.log(`[Screening OTP] Sent OTP to ${email} for job ${jobId}`)

    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully' 
    })

  } catch (error: any) {
    console.error('[Screening OTP] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to send OTP' }, { status: 500 })
  }
}
