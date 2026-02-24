-- ==========================================
-- Supabase Reset, Schema V2 & Seed Script
-- WARNING: THIS WILL DROP OLD KANBAN TABLES AND RECREATE THEM
-- ==========================================

-- 1. DROP EXISTING TABLES TO AVOID CONFLICTS
drop table if exists public.card_assignees cascade;
drop table if exists public.cards cascade;
drop table if exists public.lists cascade;
drop table if exists public.boards cascade;
drop table if exists public.profiles cascade;
drop table if exists public.departments cascade;

-- 2. CREATE SCHEMAS

create table departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  department_id uuid references departments(id) on delete set null,
  role text default '作業員',
  is_admin boolean default false,
  can_manage_global_messages boolean default false,
  can_manage_lists boolean default false
);

create table boards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  department_id uuid references departments(id) on delete cascade not null,
  title text not null,
  background_color text default '#4F46E5',
  is_active boolean default true
);

create table lists (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  board_id uuid references boards(id) on delete cascade,
  title text not null,
  "order" double precision not null,
  is_global boolean default false
);

create table cards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  list_id uuid references lists(id) on delete cascade not null,
  title text not null,
  description text,
  "order" double precision not null,
  due_date timestamp with time zone,
  created_by uuid references profiles(id) on delete set null
);

create table card_assignees (
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  primary key (card_id, user_id)
);

-- RLS
alter table departments enable row level security;
alter table profiles enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table cards enable row level security;
alter table card_assignees enable row level security;

create policy "Enable read access for all users" on departments for select using (true);
create policy "Enable insert for authenticated users" on departments for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on departments for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on departments for delete using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on profiles for select using (true);
create policy "Enable read access for all users" on boards for select using (true);
create policy "Enable read access for all users" on lists for select using (true);
create policy "Enable read access for all users" on cards for select using (true);

create policy "Enable insert for authenticated users" on profiles for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on profiles for update using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on boards for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on boards for update using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on lists for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on lists for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on lists for delete using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on cards for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on cards for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on cards for delete using (auth.role() = 'authenticated');

-- REALTIME setup (Ignore duplicate object errors if they exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'departments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE departments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'boards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE boards;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lists;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cards;
  END IF;
END $$;


-- 3. INSERT SEED DATA
INSERT INTO departments (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', '管理總部'),
  ('22222222-2222-2222-2222-222222222222', '生產一課')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT id, email INTO user_record FROM auth.users LIMIT 1;
    IF user_record IS NOT NULL THEN
        INSERT INTO profiles (id, email, full_name, department_id, role, is_admin, can_manage_global_messages, can_manage_lists)
        VALUES (
            user_record.id, 
            user_record.email, 
            '工廠主任', 
            '22222222-2222-2222-2222-222222222222', 
            '課長',
            true, true, true
        ) 
        ON CONFLICT (id) DO UPDATE SET department_id = '22222222-2222-2222-2222-222222222222', role = '課長', is_admin = true, can_manage_global_messages = true, can_manage_lists = true;
    END IF;
END $$;

INSERT INTO boards (id, department_id, title) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '總部看板'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '生產一課日常排程')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lists (id, title, "order", is_global) VALUES
  ('55555555-5555-5555-5555-555555555555', '📢 廠部共同訊息佈告', 1.0, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lists (id, board_id, title, "order", is_global) VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '待處理 (To Do)', 2.0, false),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', '產線佈建 (In Progress)', 3.0, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cards (id, list_id, title, description, "order") VALUES
  ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', '【廠長公告】下週五全場進行高壓電消防安檢', '早上 09:00 至 12:00 將暫停 A 區供電，請各課提早將機台備用電源接上。', 1.0)
ON CONFLICT DO NOTHING;

INSERT INTO cards (id, list_id, title, description, "order") VALUES
  ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', '安排新人阿翔上機時數', '本月工時須滿 40 小時', 1.0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', '一號機台季度保養', '請領班注意潤滑油剩餘量', 2.0)
ON CONFLICT DO NOTHING;
