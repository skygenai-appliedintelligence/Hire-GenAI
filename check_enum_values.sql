-- Check what enum values actually exist in the database
SELECT enumlabel as enum_value
FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;

-- Also check the enum type definition
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'company_size'
ORDER BY e.enumsortorder;
