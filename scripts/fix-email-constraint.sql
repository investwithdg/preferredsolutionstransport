-- First, check if there are any duplicate emails that would prevent the unique constraint
SELECT email, COUNT(*) as count
FROM public.customers
GROUP BY email
HAVING COUNT(*) > 1;

-- If no duplicates are found, add the unique constraint
-- Option 1: Add constraint (if email column exists but has no unique constraint)
ALTER TABLE public.customers 
ADD CONSTRAINT customers_email_unique UNIQUE (email);

-- Option 2: If you get an error that constraint already exists with a different name,
-- you might need to drop and recreate it:
-- DROP CONSTRAINT IF EXISTS customers_email_key;
-- ALTER TABLE public.customers ADD CONSTRAINT customers_email_unique UNIQUE (email);

-- Verify the constraint was added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
AND contype = 'u';
