-- Add password column to departments table
ALTER TABLE departments ADD COLUMN password TEXT;

-- (Optional) If you want to restrict who can see the password column directly via API
-- but in Supabase, we usually just don't select it, or we can use a secure view.
