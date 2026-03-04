-- Create table to track which department has read which card
CREATE TABLE IF NOT EXISTS card_reads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT now(),
    UNIQUE(card_id, department_id) -- Only need to record once per department per card
);

-- RLS Policies
ALTER TABLE card_reads ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Enable read access for all users" ON card_reads
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own read records
CREATE POLICY "Enable insert for authenticated users" ON card_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);
