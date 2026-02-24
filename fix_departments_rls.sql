-- Patch for missing RLS policies on departments table
create policy "Enable insert for authenticated users" on departments for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on departments for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users" on departments for delete using (auth.role() = 'authenticated');
