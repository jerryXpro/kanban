-- Migration script for Department Hierarchies & Targeting

-- 1. Update Departments table
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS parent_ids uuid[] default '{}';

-- 2. Update Profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_department_admin boolean default false;

-- 3. Update Lists table
ALTER TABLE lists
ADD COLUMN IF NOT EXISTS target_department_id uuid references departments(id) on delete set null;
