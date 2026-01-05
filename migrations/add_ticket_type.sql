-- Migration: Add type column to support_tickets table
-- Allows distinguishing between support tickets and product feedback

-- Add type column with default 'support'
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'support' 
CHECK (type IN ('support', 'feedback'));

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type);

-- Comment for documentation
COMMENT ON COLUMN support_tickets.type IS 'Type of submission: support (ticket) or feedback (product feedback)';
