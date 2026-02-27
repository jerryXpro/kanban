-- 新增應用程式設定資料表
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 開放所有已登入使用者讀取
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" 
ON app_settings FOR SELECT 
USING (auth.role() = 'authenticated');

-- 僅允許管理員更新與新增
CREATE POLICY "Enable insert for admins" 
ON app_settings FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Enable update for admins" 
ON app_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- 寫入預設的系統名稱
INSERT INTO app_settings (key, value) 
VALUES ('workspace_name', '看板管理系統')
ON CONFLICT (key) DO NOTHING;
