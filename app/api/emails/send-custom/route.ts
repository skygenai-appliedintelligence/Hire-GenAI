import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      candidateName, 
      candidateEmail, 
      jobTitle, 
      companyName, 
      messageContent, 
      category 
    } = body

    // Validate required fields
    if (!candidateName || !candidateEmail || !jobTitle || !companyName || !messageContent || !category) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate category
    if (category !== 'interview' && category !== 'new_job') {
      return NextResponse.json(
        { ok: false, error: 'Invalid category. Must be "interview" or "new_job"' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(candidateEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    console.log('📧 Sending custom email:', {
      to: candidateEmail,
      candidate: candidateName,
      job: jobTitle,
      company: companyName,
      category,
      messageLength: messageContent.length
    })

    // Send the email
    await EmailService.sendCustomMessage({
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      messageContent,
      category,
    })

    console.log('✅ Custom email sent successfully to:', candidateEmail)

    return NextResponse.json({
      ok: true,
      message: 'Email sent successfully',
      recipient: candidateEmail,
    })
  } catch (error: any) {
    console.error('❌ Failed to send custom email:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Failed to send email',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
