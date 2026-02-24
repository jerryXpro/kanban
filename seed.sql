-- Create Demo Departments
INSERT INTO departments (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', '管理總部'),
  ('22222222-2222-2222-2222-222222222222', '生產一課')
ON CONFLICT (name) DO NOTHING;

-- Find user ID. Assuming the test user is the only one in auth.users right now for testing
DO $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT id INTO user_record FROM auth.users LIMIT 1;

    IF user_record IS NOT NULL THEN
        -- Link user to 生產一課 as 課長
        INSERT INTO profiles (id, email, full_name, department_id, role)
        VALUES (
            user_record.id, 
            (SELECT email FROM auth.users WHERE id = user_record.id), 
            '工廠主任', 
            '22222222-2222-2222-2222-222222222222', 
            '課長'
        ) 
        ON CONFLICT (id) DO UPDATE SET department_id = '22222222-2222-2222-2222-222222222222';
    END IF;
END $$;

-- Create a Board for 管理總部
INSERT INTO boards (id, department_id, title) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '總部看板')
ON CONFLICT (id) DO NOTHING;

-- Create a Board for 生產一課
INSERT INTO boards (id, department_id, title) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '生產一課日常排程')
ON CONFLICT (id) DO NOTHING;


-- Create Global List 
INSERT INTO lists (id, title, "order", is_global) VALUES
  ('55555555-5555-5555-5555-555555555555', '📢 廠部共同訊息佈告', 1.0, true)
ON CONFLICT (id) DO NOTHING;

-- Create Local Lists for 生產一課
INSERT INTO lists (id, board_id, title, "order", is_global) VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '待處理 (To Do)', 2.0, false),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', '產線佈建 (In Progress)', 3.0, false)
ON CONFLICT (id) DO NOTHING;


-- Add a Demo Global Announcement
INSERT INTO cards (list_id, title, description, "order") VALUES
  ('55555555-5555-5555-5555-555555555555', '【廠長公告】下週五全場進行高壓電消防安檢', '早上 09:00 至 12:00 將暫停 A 區供電，請各課提早將機台備用電源接上。', 1.0)
ON CONFLICT DO NOTHING;

-- Add a Demo Task for 生產一課
INSERT INTO cards (list_id, title, description, "order") VALUES
  ('66666666-6666-6666-6666-666666666666', '安排新人阿翔上機時數', '本月工時須滿 40 小時', 1.0),
  ('77777777-7777-7777-7777-777777777777', '一號機台季度保養', '請領班注意潤滑油剩餘量', 1.0)
ON CONFLICT DO NOTHING;
