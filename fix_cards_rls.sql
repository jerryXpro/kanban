-- =====================================================
-- 修正 profiles 欄位值 - 確保管理員有正確的權限設定
-- 請在 Supabase SQL Editor 貼上以下內容並執行
-- =====================================================

-- Step 1: 確認 profiles 表格有必要的欄位（若缺少則新增）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_department_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_global_messages boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_lists boolean DEFAULT false;

-- Step 2: 確認目前用戶的設定
SELECT id, email, is_admin, is_department_admin, can_manage_global_messages, can_manage_lists
FROM profiles
WHERE email = 'jerry@see-box.com';

-- Step 3: 強制設定管理員權限（將 email 改成你的信箱）
UPDATE profiles
SET
  is_admin = true,
  is_department_admin = true,
  can_manage_global_messages = true,
  can_manage_lists = true
WHERE email = 'jerry@see-box.com';

-- Step 4: 確認設定已儲存
SELECT id, email, is_admin, is_department_admin, can_manage_global_messages, can_manage_lists
FROM profiles
WHERE email = 'jerry@see-box.com';
