-- Migration: Support Ticket System
-- Creates tables for support tickets with full conversation history

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    assigned_to VARCHAR(255),
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Messages Table (conversation history)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'support', 'system')),
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    message TEXT NOT NULL,
    screenshot_url TEXT,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Attachments Table (for multiple attachments per message)
CREATE TABLE IF NOT EXISTS support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
    lock_key TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    -- Create a lock key specific to this function and year
    lock_key := 'ticket_number_' || year_part;
    
    -- Acquire advisory lock to prevent concurrent executions
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5 FOR 6) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM support_tickets
    WHERE ticket_number LIKE 'TKT' || year_part || '%';
    
    NEW.ticket_number := 'TKT' || year_part || LPAD(seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON support_tickets;
CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_tickets 
    SET updated_at = NOW() 
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket timestamp when message is added
DROP TRIGGER IF EXISTS trigger_update_ticket_timestamp ON support_messages;
CREATE TRIGGER trigger_update_ticket_timestamp
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- Function to set first_response_at when support replies
CREATE OR REPLACE FUNCTION set_first_response()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sender_type = 'support' THEN
        UPDATE support_tickets 
        SET first_response_at = COALESCE(first_response_at, NOW()),
            status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for first response tracking
DROP TRIGGER IF EXISTS trigger_set_first_response ON support_messages;
CREATE TRIGGER trigger_set_first_response
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_first_response();

-- Comments for documentation
COMMENT ON TABLE support_tickets IS 'Customer support tickets with status tracking';
COMMENT ON TABLE support_messages IS 'Conversation messages for support tickets';
COMMENT ON TABLE support_attachments IS 'File attachments for support messages';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Human-readable ticket ID (TKT2026000001)';
COMMENT ON COLUMN support_tickets.status IS 'open, in_progress, waiting_customer, resolved, closed';
COMMENT ON COLUMN support_messages.is_internal IS 'Internal notes not visible to customer';
