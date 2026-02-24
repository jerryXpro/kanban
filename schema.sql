-- Supabase Schema for Kanban Application

-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text
);

-- Note: We will handle profile insertion mostly automatically when user signs up via Supabase trigger (can be set up later or handled on client sign-in)

-- Create boards table
create table boards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  background_color text default '#4F46E5'
);

-- Create lists table
create table lists (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  "order" double precision not null
);

-- Create cards table
create table cards (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  list_id uuid references lists(id) on delete cascade not null,
  title text not null,
  description text,
  "order" double precision not null,
  due_date timestamp with time zone
);

-- Create card_assignees table (Many-to-Many)
create table card_assignees (
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  primary key (card_id, user_id)
);

-- Setup Row Level Security (RLS)
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table cards enable row level security;
alter table card_assignees enable row level security;

-- Create Policies (For this MVP, we will allow authenticated users to read/write their own boards and related items)
-- Note: A more complex setup would involve workspace membership.
-- For now, owner_id dictates board access.

-- Profiles: Users can read all profiles (to assign someone), but only update their own
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Boards: Users can see all boards for simplicity here, or only boards they own
create policy "Users can view all boards" on boards for select using (true);
create policy "Users can insert boards" on boards for insert with check (auth.uid() = owner_id);
create policy "Users can update their own boards" on boards for update using (auth.uid() = owner_id);
create policy "Users can delete their own boards" on boards for delete using (auth.uid() = owner_id);

-- Lists: Rely on board access
create policy "Lists are viewable by everyone" on lists for select using (true);
create policy "Authenticated users can insert lists" on lists for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update lists" on lists for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete lists" on lists for delete using (auth.role() = 'authenticated');

-- Cards: Rely on board/list access
create policy "Cards are viewable by everyone" on cards for select using (true);
create policy "Authenticated users can insert cards" on cards for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update cards" on cards for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete cards" on cards for delete using (auth.role() = 'authenticated');

-- Enable Supabase Realtime for boards, lists, and cards
alter publication supabase_realtime add table boards;
alter publication supabase_realtime add table lists;
alter publication supabase_realtime add table cards;
