-- Add list_type column to lists table
-- list_type: null = normal list, 'anomaly' = fixed anomaly report list
ALTER TABLE lists ADD COLUMN IF NOT EXISTS list_type text DEFAULT NULL;
