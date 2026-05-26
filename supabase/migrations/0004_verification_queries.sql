-- =============================================================================
-- Hayat Ağı — Doğrulama sorguları (salt okunur, isteğe bağlı)
--
-- Migration sonrası her şeyin doğru kurulduğunu kontrol etmek için çalıştırın.
-- Bu dosya veritabanını değiştirmez.
-- =============================================================================

-- 1. Tüm public tablolar
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2. RLS açık mı?
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 3. PostGIS ve pgcrypto extension'ları
select extname, extversion
from pg_extension
where extname in ('postgis', 'pgcrypto', 'uuid-ossp');

-- 4. Private helper fonksiyonları
select proname as function_name
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'private'
order by proname;

-- 5. Auth trigger var mı?
select tgname, tgrelid::regclass
from pg_trigger
where tgname = 'on_auth_user_created';

-- 6. Sistem ayarları yüklendi mi?
select key, value
from public.system_settings;

-- 7. Storage bucket'ları (0002 çalıştırıldıysa)
select id, name, public
from storage.buckets
where id in ('responder-documents', 'avatars');

-- 8. Tablo sayısı özeti (22 tablo beklenir)
select count(*) as public_table_count
from pg_tables
where schemaname = 'public';
