-- ==========================================
-- Supabase Schema V2 for Kanban Application
-- Supports Departments, RBAC (Role-Based Access Control)
-- and Global Announcement Lists
-- ==========================================

-- 1. Create Enums for Roles (職級)
-- Removed in V3, role is now a flexible TEXT field

-- 2. Create Departments table (生產部各課)
create table departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique, -- 例如: '生產一課', '管理部'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create profiles table (使用者檔案, 綁定部門與職級)
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

-- 4. Create boards table (每個部門一個看板)
create table boards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  department_id uuid references departments(id) on delete cascade not null,
  title text not null,
  background_color text default '#4F46E5',
  is_active boolean default true
);

-- 5. Create lists table (包含共同訊息佈告欄標記)
create table lists (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  board_id uuid references boards(id) on delete cascade, -- 如果是全域公告可以沒有 board_id，或是指派給特定的「總部看板」
  title text not null,
  "order" double precision not null,
  is_global boolean default false -- [關鍵設計] true 代表這是跨部門的共同訊息欄
);

-- 6. Create cards table
create table cards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  list_id uuid references lists(id) on delete cascade not null,
  title text not null,
  description text,
  "order" double precision not null,
  due_date timestamp with time zone,
  created_by uuid references profiles(id) on delete set null -- 記錄是哪個幹部發布的
);

-- 7. Create card_assignees table (任務指派)
create table card_assignees (
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  primary key (card_id, user_id)
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) & Policies
-- 這裡先設定最寬鬆的 policy 方便初期開發測試
-- ==========================================

alter table departments enable row level security;
alter table profiles enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table cards enable row level security;
alter table card_assignees enable row level security;

-- 任何人都可以讀取所有部門、檔案庫與看板 (為了方便測試)
create policy "Enable read access for all users" on departments for select using (true);
create policy "Enable read access for all users" on profiles for select using (true);
create policy "Enable read access for all users" on boards for select using (true);
create policy "Enable read access for all users" on lists for select using (true);
create policy "Enable read access for all users" on cards for select using (true);

-- 允許已登入使用者新增/修改/刪除 (初期測試用)
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


-- ==========================================
-- Realtime Setup
-- ==========================================
alter publication supabase_realtime add table departments;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table boards;
alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table cards;
