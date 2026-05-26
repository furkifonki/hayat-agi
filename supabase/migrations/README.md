# Supabase SQL — Çalıştırma Sırası

Supabase Dashboard → **SQL Editor** → **New query**

Her dosyanın **tamamını** kopyalayıp yapıştırın ve **Run** deyin.

## Zorunlu (sırayla)

| Sıra | Dosya | Ne yapar |
|------|-------|----------|
| 1 | `0001_initial_schema.sql` | Tüm tablolar, RLS, PostGIS, trigger'lar |
| 2 | `0002_storage_setup.sql` | Belge/avatar bucket'ları + storage RLS |

## Kayıt sonrası (bir kez)

| Sıra | Dosya | Ne yapar |
|------|-------|----------|
| 3 | `0003_make_admin.sql` | E-postanızı düzenleyip admin yapın |

## İsteğe bağlı

| Dosya | Ne yapar |
|-------|----------|
| `0004_verification_queries.sql` | Kurulum doğrulama (değişiklik yapmaz) |

## Dosya yolları

```
supabase/migrations/0001_initial_schema.sql   ← İLK BU
supabase/migrations/0002_storage_setup.sql
supabase/migrations/0003_make_admin.sql     ← e-postayı değiştir
supabase/migrations/0004_verification_queries.sql
```

## Hata alırsanız

- **postgis yok:** Database → Extensions → `postgis` etkinleştir → 0001'i tekrar çalıştır
- **already exists:** Tablolar zaten var; yeni proje kullanın veya mevcut tabloları temizleyin
- **0002 policy already exists:** Storage politikaları zaten kurulu; güvenle atlayabilirsiniz
