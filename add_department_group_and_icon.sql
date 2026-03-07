-- ==========================================
-- Add Department Groups and Custom Icons
-- ==========================================

-- 1. Add new columns to departments table
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_icon_url TEXT;

-- 2. Create Storage Bucket for department icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('department-icons', 'department-icons', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for 'department-icons' bucket

-- Allow public read access to the icons
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'department-icons' );

-- Allow authenticated users (Admins/Managers) to insert objects
CREATE POLICY "Authenticated users can upload icons"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND bucket_id = 'department-icons'
);

-- Allow authenticated users to update their uploaded icons
CREATE POLICY "Authenticated users can update icons"
ON storage.objects FOR UPDATE
USING (
    auth.role() = 'authenticated' AND bucket_id = 'department-icons'
);

-- Allow authenticated users to delete icons
CREATE POLICY "Authenticated users can delete icons"
ON storage.objects FOR DELETE
USING (
    auth.role() = 'authenticated' AND bucket_id = 'department-icons'
);
