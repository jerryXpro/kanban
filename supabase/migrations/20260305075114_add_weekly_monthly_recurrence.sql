-- ==========================================
-- Update scheduled_events recurrence constraint
-- Adds 'weekly' and 'monthly' to the allowed values
-- ==========================================

ALTER TABLE scheduled_events DROP CONSTRAINT scheduled_events_recurrence_check;
ALTER TABLE scheduled_events ADD CONSTRAINT scheduled_events_recurrence_check CHECK (recurrence IN ('once', 'weekly', 'monthly', 'quarterly', 'yearly'));
