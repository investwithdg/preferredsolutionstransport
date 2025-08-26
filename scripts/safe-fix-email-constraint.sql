-- Safe Fix for Email Constraint Issue
-- This script adds the missing unique constraint without dropping tables

-- Step 1: Check current constraints on customers table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'customers';

-- Step 2: Check for duplicate emails (must be 0 for unique constraint to work)
SELECT email, COUNT(*) as duplicate_count
FROM public.customers
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 3: If no duplicates, add the unique constraint
-- First, drop any existing unique constraint on email (if it exists with wrong name)
DO $$
BEGIN
    -- Try to drop constraint if it exists
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_unique;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, that's fine
        NULL;
END $$;

-- Step 4: Add the unique constraint with the expected name
ALTER TABLE public.customers 
ADD CONSTRAINT customers_email_key UNIQUE (email);

-- Step 5: Verify the constraint was added successfully
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
AND contype = 'u';

-- Step 6: Test that the upsert will work now
-- This is just a test query, don't run in production with real data
/*
INSERT INTO public.customers (email, name, phone) 
VALUES ('test@example.com', 'Test User', '555-0123')
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone
RETURNING *;
*/
