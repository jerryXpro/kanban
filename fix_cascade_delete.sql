-- 修正 profiles 表的 foreign key，讓它在 Auth 刪除使用者時自動同步刪除

-- 1. 先刪除舊的沒有 cascade 的 foreign key 限制
ALTER TABLE public.profiles
DROP CONSTRAINT profiles_id_fkey;

-- 2. 重新加入帶有 ON DELETE CASCADE 的 foreign key 限制
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) 
ON DELETE CASCADE;
