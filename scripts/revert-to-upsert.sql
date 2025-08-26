-- After running the constraint fix, you can revert your code to use the cleaner upsert syntax
-- This file is just for reference - the actual code change needs to be done in the TypeScript file

-- The upsert syntax that will work after the unique constraint is added:
/*
const { data: customer, error: customerError } = await supabase
  .from('customers')
  .upsert(
    { email: normalizedEmail, name, phone },
    { onConflict: 'email' }
  )
  .select()
  .single();
*/

-- This is equivalent to this SQL:
/*
INSERT INTO public.customers (email, name, phone) 
VALUES ('user@example.com', 'User Name', '555-0123')
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone
RETURNING *;
*/
