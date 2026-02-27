-- ============================================
-- 修正「通報異常」功能所需的欄位
-- 請在 Supabase SQL Editor 貼上此內容並執行
-- ============================================

-- 1. 為 cards 資料表加入異常通報所需欄位
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS card_type text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS source_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS labels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. 為 departments 資料表加入顏色欄位（若尚未加入）
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS parent_ids uuid[] DEFAULT '{}';

-- 3. 為 lists 資料表加入顏色欄位（若尚未加入）
ALTER TABLE lists 
ADD COLUMN IF NOT EXISTS color text;

-- 4. 確保 boards 資料表有 department_id 和 is_active 欄位
--    注意：如果這些欄位已存在，以下語句會被忽略
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 5. 將所有 is_active 為 NULL 的看板設為 true
UPDATE boards SET is_active = true WHERE is_active IS NULL;
