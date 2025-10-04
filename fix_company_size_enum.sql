-- Fix company_size enum to match Prisma schema
-- This adds missing enum values if they don't exist

-- Check current enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;

-- If 'medium' doesn't exist, we need to recreate the enum
-- First, let's check if we can just add the missing value
DO $$ 
BEGIN
    -- Try to add 'medium' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'company_size'::regtype 
        AND enumlabel = 'medium'
    ) THEN
        ALTER TYPE company_size ADD VALUE 'medium';
    END IF;
    
    -- Try to add 'enterprise' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'company_size'::regtype 
        AND enumlabel = 'enterprise'
    ) THEN
        ALTER TYPE company_size ADD VALUE 'enterprise';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;
