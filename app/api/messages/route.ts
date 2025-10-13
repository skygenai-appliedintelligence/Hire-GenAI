import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

// GET /api/messages - Get messages by category
export async function GET(request: NextRequest) {
  try {
    // Get companyId from query params
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get category from query params
    const category = searchParams.get('category') as 'interview' | 'new_job' | 'general'
    const includeDrafts = searchParams.get('includeDrafts') === '1' || searchParams.get('includeDrafts') === 'true'

    if (!category || !['interview', 'new_job', 'general'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Get messages from database
    const messages = await DatabaseService.getMessagesByCategory(companyId, category, includeDrafts)

    return NextResponse.json({ 
      success: true, 
      messages: messages.map(msg => ({
        id: msg.id,
        recipientEmail: msg.recipient_email,
        recipientName: msg.recipient_name,
        category: msg.category,
        subject: msg.subject,
        content: msg.content,
        status: msg.status,
        sentAt: msg.sent_at,
        deliveredAt: msg.delivered_at,
        readAt: msg.read_at,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      })),
      includeDrafts
    })

  } catch (error: any) {
    console.error('Get messages error:', error)
    return NextResponse.json({ 
      error: 'Failed to get messages',
      details: error.message 
    }, { status: 500 })
  }
}

// POST /api/messages - Create a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, recipientEmail, recipientName, category, subject, content, status = 'sent' } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Validate category
    if (!['interview', 'new_job', 'general'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Validation rules: drafts need only category + content. Non-drafts need recipient + subject.
    if (status !== 'draft') {
      if (!recipientEmail || !subject || !content) {
        return NextResponse.json({ 
          error: 'Missing required fields: recipientEmail, subject, content' 
        }, { status: 400 })
      }
    }

    // Apply safe defaults for drafts
    const finalRecipientEmail = status === 'draft' ? 'draft@local' : recipientEmail
    const finalSubject = status === 'draft' ? 'Draft' : subject

    // Create message in database
    const message = await DatabaseService.createMessage({
      companyId,
      recipientEmail: finalRecipientEmail,
      recipientName,
      category,
      subject: finalSubject,
      content,
      status,
      metadata: {
        sentFrom: 'web_interface',
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: {
        id: message.id,
        recipientEmail: message.recipient_email,
        recipientName: message.recipient_name,
        category: message.category,
        subject: message.subject,
        content: message.content,
        status: message.status,
        sentAt: message.sent_at,
        createdAt: message.created_at
      }
    })

  } catch (error: any) {
    console.error('Create message error:', error)
    return NextResponse.json({ 
      error: 'Failed to create message',
      details: error.message 
    }, { status: 500 })
  }
}
