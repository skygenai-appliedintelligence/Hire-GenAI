import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// GET - Fetch all tickets for a company or all tickets (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const isAdmin = searchParams.get("admin") === "true"

    let query = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
        (SELECT message FROM support_messages WHERE ticket_id = t.id ORDER BY created_at ASC LIMIT 1) as first_message
      FROM support_tickets t
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (!isAdmin && companyId) {
      query += ` AND t.company_id = $${paramIndex}::uuid`
      params.push(companyId)
      paramIndex++
    }

    if (userId) {
      query += ` AND t.user_id = $${paramIndex}::uuid`
      params.push(userId)
      paramIndex++
    }

    if (status && status !== "all") {
      if (status === "open") {
        query += ` AND t.status IN ('open', 'in_progress', 'waiting_customer')`
      } else if (status === "resolved") {
        query += ` AND t.status IN ('resolved', 'closed')`
      } else {
        query += ` AND t.status = $${paramIndex}`
        params.push(status)
        paramIndex++
      }
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.updated_at DESC`

    const tickets = await DatabaseService.query(query, params) as any[]
    
    // Convert BigInt to string for JSON serialization
    const sanitizedTickets = tickets?.map(ticket => ({
      ...ticket,
      message_count: ticket.message_count ? String(ticket.message_count) : '0'
    })) || []

    return NextResponse.json({
      success: true,
      tickets: sanitizedTickets
    })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tickets" },
      { status: 500 }
    )
  }
}

// POST - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      companyId, 
      userId, 
      userEmail, 
      userName,
      type = "support",
      title, 
      category, 
      priority = "medium", 
      description,
      screenshot 
    } = body

    if (!title || !category || !description || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate ticket number in API instead of using trigger
    const currentYear = new Date().getFullYear();
    
    // Get the latest ticket number and increment
    const lastTicketResult = await DatabaseService.query(
      `SELECT ticket_number FROM support_tickets 
       WHERE ticket_number LIKE $1
       ORDER BY ticket_number DESC LIMIT 1`,
      [`TKT${currentYear}%`]
    ) as any[];
    
    let ticketNumber = "";
    if (lastTicketResult.length === 0) {
      // No tickets for this year yet, start with 000001
      ticketNumber = `TKT${currentYear}000001`;
    } else {
      const lastNumber = lastTicketResult[0].ticket_number;
      // Extract numeric part (last 6 digits)
      const numericPart = parseInt(lastNumber.substring(7), 10);
      // Increment and pad to 6 digits
      const newNumeric = (numericPart + 1).toString().padStart(6, '0');
      ticketNumber = `TKT${currentYear}${newNumeric}`;
    }
    
    // Insert with explicit ticket_number and type
    const ticketResult = await DatabaseService.query(
      `INSERT INTO support_tickets 
        (ticket_number, company_id, user_email, user_name, title, category, priority, status, type)
       VALUES (
         $1, 
         CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2::uuid ELSE NULL END,
         $3, $4, $5, $6, $7, 'open', $8
       )
       RETURNING *`,
      [ticketNumber, companyId || null, userEmail, userName, title, category, priority, type]
    );

    const ticketRows = ticketResult as any[]
    const ticket = ticketRows[0]

    // Add the initial message
    await DatabaseService.query(
      `INSERT INTO support_messages 
        (ticket_id, sender_type, sender_name, sender_email, message, screenshot_url)
       VALUES ($1::uuid, 'customer', $2, $3, $4, $5)`,
      [ticket.id, userName, userEmail, description, screenshot]
    )

    // Add system message based on type
    const systemMessage = type === "feedback" 
      ? `Feedback ${ticket.ticket_number} submitted. Thank you for your valuable input!`
      : `Ticket ${ticket.ticket_number} created. Our support team will respond within 24 hours.`
    
    await DatabaseService.query(
      `INSERT INTO support_messages 
        (ticket_id, sender_type, message)
       VALUES ($1::uuid, 'system', $2)`,
      [ticket.id, systemMessage]
    )

    // Fetch the complete ticket with messages
    const completeTicketResult = await DatabaseService.query(
      `SELECT * FROM support_tickets WHERE id = $1::uuid`,
      [ticket.id]
    )
    const completeTicketRows = completeTicketResult as any[]

    const messagesResult = await DatabaseService.query(
      `SELECT * FROM support_messages WHERE ticket_id = $1::uuid ORDER BY created_at ASC`,
      [ticket.id]
    )
    const messageRows = messagesResult as any[]

    return NextResponse.json({
      success: true,
      ticket: {
        ...completeTicketRows[0],
        messages: messageRows
      }
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create ticket" },
      { status: 500 }
    )
  }
}
