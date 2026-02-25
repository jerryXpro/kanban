-- Supabase Schema Update - Kanban V2 Features
-- Run these commands in your Supabase SQL Editor

-- 1. Update cards table (Anomaly Reporting & Trello UI)
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS card_type text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS source_department_id uuid REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS labels jsonb DEFAULT '[]'::jsonb;

-- 2. Update departments table (Custom Colors)
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS color text;

-- 3. Update lists table (Custom Colors)
ALTER TABLE lists 
ADD COLUMN IF NOT EXISTS color text;

-- (Optional) If you want to enable real-time for these new columns, they are already covered by the existing realtime publication on the table level.
