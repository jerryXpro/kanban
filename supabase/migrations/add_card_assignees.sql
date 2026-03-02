ALTER TABLE cards ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS assigned_department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
