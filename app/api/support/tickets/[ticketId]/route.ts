import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// GET - Fetch single ticket with messages
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    // Await params to fix Next.js warning
    const { ticketId } = await context.params

    // Fetch ticket - use CASE to handle UUID vs string
    const ticketResult = await DatabaseService.query(
      `SELECT * FROM support_tickets 
       WHERE (
         CASE 
           WHEN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN id = $1::uuid 
           ELSE ticket_number = $1 
         END
       )`,
      [ticketId]
    ) as any

    const ticketRows = ticketResult.rows || ticketResult
    if (ticketRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    const ticket = ticketRows[0]

    // Fetch messages
    const messagesResult = await DatabaseService.query(
      `SELECT * FROM support_messages 
       WHERE ticket_id = $1::uuid 
       ORDER BY created_at ASC`,
      [ticket.id]
    ) as any

    const messageRows = messagesResult.rows || messagesResult

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        messages: messageRows
      }
    })
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch ticket" },
      { status: 500 }
    )
  }
}

// PATCH - Update ticket (status, priority, assignment)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  try {
    // Await params to fix Next.js warning
    const { ticketId } = await context.params
    const body = await request.json()
    const { status, priority, assignedTo } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++

      if (status === "resolved" || status === "closed") {
        updates.push(`resolved_at = COALESCE(resolved_at, NOW())`)
      }
    }

    if (priority) {
      updates.push(`priority = $${paramIndex}`)
      values.push(priority)
      paramIndex++
    }

    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`)
      values.push(assignedTo)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      return NextResponse.json(
        { success: false, error: "No updates provided" },
        { status: 400 }
      )
    }

    values.push(ticketId)

    const result = await DatabaseService.query(
      `UPDATE support_tickets 
       SET ${updates.join(", ")} 
       WHERE (
         CASE 
           WHEN $${paramIndex} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
           THEN id = $${paramIndex}::uuid 
           ELSE ticket_number = $${paramIndex} 
         END
       )
       RETURNING *`,
      values
    ) as any

    const resultRows = result.rows || result
    if (resultRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      )
    }

    // Add system message for status change
    if (status) {
      const statusMessages: Record<string, string> = {
        "in_progress": "Ticket is now being reviewed by our support team.",
        "waiting_customer": "Waiting for customer response.",
        "resolved": "This ticket has been marked as resolved.",
        "closed": "This ticket has been closed."
      }

      if (statusMessages[status]) {
        await DatabaseService.query(
          `INSERT INTO support_messages (ticket_id, sender_type, message)
           VALUES ($1::uuid, 'system', $2)`,
          [resultRows[0].id, statusMessages[status]]
        )
      }
    }

    return NextResponse.json({
      success: true,
      ticket: resultRows[0]
    })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update ticket" },
      { status: 500 }
    )
  }
}
