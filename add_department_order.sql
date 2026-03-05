-- Add display_order column to departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order int DEFAULT 0;

-- Initialize order based on current name-based sorting
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) * 1000 as new_order
  FROM departments
)
UPDATE departments
SET display_order = ordered.new_order
FROM ordered
WHERE departments.id = ordered.id;
