-- ==========================================
-- Create scheduled_events table
-- Supports one-time, quarterly, and yearly recurring reminders
-- ==========================================

CREATE TABLE IF NOT EXISTS scheduled_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  remind_offset_days int DEFAULT 0,
  remind_date date,
  recurrence text DEFAULT 'once' CHECK (recurrence IN ('once', 'quarterly', 'yearly')),
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Auto-compute remind_date on insert/update
CREATE OR REPLACE FUNCTION compute_remind_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remind_date := NEW.event_date + (NEW.remind_offset_days * INTERVAL '1 day');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_remind_date
BEFORE INSERT OR UPDATE ON scheduled_events
FOR EACH ROW EXECUTE FUNCTION compute_remind_date();

-- RLS
ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated" ON scheduled_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON scheduled_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated" ON scheduled_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated" ON scheduled_events FOR DELETE USING (auth.role() = 'authenticated');

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scheduled_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_events;
  END IF;
END $$;
