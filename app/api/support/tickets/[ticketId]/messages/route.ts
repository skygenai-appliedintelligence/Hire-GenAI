import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// GET - Fetch messages for a ticket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    // Await params to fix Next.js warning
    const { ticketId } = await context.params
    const { searchParams } = new URL(request.url)
    const includeInternal = searchParams.get("internal") === "true"

    let query = `
      SELECT * FROM support_messages 
      WHERE ticket_id = $1::uuid
    `
    
    if (!includeInternal) {
      query += ` AND is_internal = false`
    }
    
    query += ` ORDER BY created_at ASC`

    const result = await DatabaseService.query(query, [ticketId]) as any

    return NextResponse.json({
      success: true,
      messages: result.rows || result
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// POST - Add a new message to ticket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    // Await params to fix Next.js warning
    const { ticketId } = await context.params
    const body = await request.json()
    const { 
      senderType, 
      senderName, 
      senderEmail, 
      message, 
      screenshot,
      isInternal = false 
    } = body

    if (!message || !senderType) {
      return NextResponse.json(
        { success: false, error: "Message and sender type are required" },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const ticketCheck = await DatabaseService.query(
      `SELECT id, status FROM support_tickets WHERE id = $1::uuid`,
      [ticketId]
    ) as any

    const ticketRows = ticketCheck.rows || ticketCheck
    if (ticketRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Insert message
    const result = await DatabaseService.query(
      `INSERT INTO support_messages 
        (ticket_id, sender_type, sender_name, sender_email, message, screenshot_url, is_internal)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ticketId, senderType, senderName, senderEmail, message, screenshot, isInternal]
    ) as any

    const messageRows = result.rows || result

    // Update ticket status based on sender
    if (senderType === "customer") {
      await DatabaseService.query(
        `UPDATE support_tickets 
         SET status = CASE WHEN status = 'waiting_customer' THEN 'in_progress' ELSE status END,
             updated_at = NOW()
         WHERE id = $1::uuid`,
        [ticketId]
      )
    } else if (senderType === "support" && !isInternal) {
      await DatabaseService.query(
        `UPDATE support_tickets 
         SET status = 'waiting_customer',
             updated_at = NOW()
         WHERE id = $1::uuid`,
        [ticketId]
      )
    }

    return NextResponse.json({
      success: true,
      message: messageRows[0]
    })
  } catch (error) {
    console.error("Error adding message:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add message" },
      { status: 500 }
    )
  }
}
