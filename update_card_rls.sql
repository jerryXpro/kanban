-- ==========================================
-- Update Card RLS Policies
-- ==========================================

-- Drop existing generic update/delete policies for cards
DROP POLICY IF EXISTS "Enable update for authenticated users" ON cards;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON cards;

-- Recreate policies with centralized ownership logic
-- A user can update/delete a card IF:
-- 1. They are an admin OR
-- 2. It's an anomaly card AND their department matches the source_department_id OR
-- 3. It's a global card AND they have can_manage_global_messages OR they created it OR
-- 4. It's a regular card

CREATE POLICY "Enable centralized update for cards" ON cards
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
            p.is_admin = true
            OR (
                cards.card_type = 'anomaly' AND p.department_id = cards.source_department_id
            )
            OR (
                EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND l.is_global = true)
                AND (p.can_manage_global_messages = true OR cards.created_by = auth.uid())
            )
            OR (
                cards.card_type != 'anomaly' AND NOT EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND l.is_global = true)
            )
        )
    )
);

CREATE POLICY "Enable centralized delete for cards" ON cards
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
            p.is_admin = true
            OR (
                cards.card_type = 'anomaly' AND p.department_id = cards.source_department_id
            )
            OR (
                EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND l.is_global = true)
                AND (p.can_manage_global_messages = true OR cards.created_by = auth.uid())
            )
            OR (
                cards.card_type != 'anomaly' AND NOT EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND l.is_global = true)
            )
        )
    )
);
