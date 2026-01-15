import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { sendMail } from '@/lib/smtp'
import { storeOTP, generateOTP } from '@/lib/otp-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    // Get candidate email from application
    const query = `
      SELECT a.email, a.first_name, a.last_name, a.job_id, j.title as job_title, c.name as company_name
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE a.id = $1::uuid
    `
    const result = await (DatabaseService as any).query(query, [applicationId])

    if (!result || result.length === 0) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const application = result[0]
    const email = application.email

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Candidate email not found' }, { status: 400 })
    }

    // Generate OTP
    const otp = generateOTP()

    // Store OTP in database (using applicationId as context)
    await storeOTP(email, applicationId, otp, 10) // 10 minutes expiry

    // Send OTP email
    const candidateName = application.first_name || 'Candidate'
    const jobTitle = application.job_title || 'the position'
    const companyName = application.company_name || 'the company'

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
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Interview Verification</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              Hi ${candidateName},
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              You're about to start your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. 
              Please use the following code to verify your identity:
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
      subject: `Interview Verification Code - ${jobTitle}`,
      html: emailHtml,
      text: `Your interview verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: 'no-reply@hire-genai.com'
    })

    console.log(`[Interview OTP] Sent OTP to ${email} for application ${applicationId}`)

    // Return masked email for UI display and actual email for verification
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      maskedEmail,
      email, // Actual email for OTP verification
      candidateName
    })

  } catch (error: any) {
    console.error('[Interview OTP] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to send OTP' }, { status: 500 })
  }
}
