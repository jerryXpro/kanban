-- Add calendar_id column to the departments table to allow per-department Google Calendar integration.
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS calendar_id text DEFAULT NULL;
