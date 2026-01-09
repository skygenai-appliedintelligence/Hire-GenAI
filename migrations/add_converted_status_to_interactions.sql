-- Add new lead status categories to contact_messages table
ALTER TABLE contact_messages 
DROP CONSTRAINT IF EXISTS contact_messages_status_check;

ALTER TABLE contact_messages
ADD CONSTRAINT contact_messages_status_check 
CHECK (status IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer'));

-- Update existing records to use new status values
UPDATE contact_messages SET status = 'new_lead' WHERE status = 'new';
UPDATE contact_messages SET status = 'active_prospect' WHERE status = 'read';
UPDATE contact_messages SET status = 'active_prospect' WHERE status = 'responded';
UPDATE contact_messages SET status = 'inactive_prospect' WHERE status = 'archived';
UPDATE contact_messages SET status = 'inactive_prospect' WHERE status = 'spam';

-- Add new lead status categories to meeting_bookings table
ALTER TABLE meeting_bookings 
DROP CONSTRAINT IF EXISTS meeting_bookings_status_check;

ALTER TABLE meeting_bookings
ADD CONSTRAINT meeting_bookings_status_check 
CHECK (status IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer'));

-- Update existing meeting records to use new status values
UPDATE meeting_bookings SET status = 'new_lead' WHERE status = 'scheduled';
UPDATE meeting_bookings SET status = 'active_prospect' WHERE status = 'confirmed';
UPDATE meeting_bookings SET status = 'converted_to_customer' WHERE status = 'completed';
UPDATE meeting_bookings SET status = 'inactive_prospect' WHERE status = 'cancelled';
UPDATE meeting_bookings SET status = 'inactive_prospect' WHERE status = 'no_show';
UPDATE meeting_bookings SET status = 'active_prospect' WHERE status = 'rescheduled';

-- Add description column to explain status meanings
COMMENT ON COLUMN contact_messages.status IS 
'Lead status categories:
- new_lead: A potential customer who has shown initial interest but has not yet made a purchase.
- active_prospect: The stage where a prospect becomes a paying customer or client.
- inactive_prospect: A customer who has stopped engaging with the company or using its products/services.
- converted_to_customer: A prospect who has been successfully converted to a paying customer.';

COMMENT ON COLUMN meeting_bookings.status IS 
'Lead status categories (same as contact_messages):
- new_lead: A potential customer who has shown initial interest but has not yet made a purchase.
- active_prospect: The stage where a prospect becomes a paying customer or client.
- inactive_prospect: A customer who has stopped engaging with the company or using its products/services.
- converted_to_customer: A prospect who has been successfully converted to a paying customer.';
