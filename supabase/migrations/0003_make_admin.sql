-- =============================================================================
-- Hayat Ağı — Adım 3: Admin kullanıcı yapma (MANUEL)
--
-- ÖN KOŞUL:
-- 1. 0001_initial_schema.sql çalıştırılmış olmalı
-- 2. Mobil uygulamadan kayıt olmuş olmalısınız
--
-- Aşağıdaki e-postayı KENDİ e-postanızla değiştirin, sonra Run.
-- =============================================================================

-- ⚠️ BU SATIRI DÜZENLEYİN:
update public.profiles
set
  is_admin = true,
  user_type = 'admin'
where email = 'your-admin-email@example.com';

-- Kontrol
select id, email, full_name, is_admin, user_type, created_at
from public.profiles
where email = 'your-admin-email@example.com';
