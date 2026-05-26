# Hayat Ağı — Setup Guide

**Version:** 0.1.0  
**Last updated:** Sprint 1

Complete step-by-step guide to set up Supabase, run the migration, configure apps, and verify everything works.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Create Supabase Project](#3-create-supabase-project)
4. [Run SQL Migration](#4-run-sql-migration)
5. [Common Migration Errors](#5-common-migration-errors)
6. [Verify Database Setup](#6-verify-database-setup)
7. [Configure Storage Buckets](#7-configure-storage-buckets)
8. [Enable Auth](#8-enable-auth)
9. [Environment Variables](#9-environment-variables)
10. [Run Mobile App](#10-run-mobile-app)
11. [Run Admin Panel](#11-run-admin-panel)
12. [Create Admin User](#12-create-admin-user)
13. [Deploy Edge Functions](#13-deploy-edge-functions)
14. [RLS Quick Tests](#14-rls-quick-tests)
15. [End-to-End Smoke Test](#15-end-to-end-smoke-test)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 20.0.0 | `node -v` |
| npm | >= 10 | `npm -v` |
| Git | any | `git --version` |
| Expo Go | latest | iOS App Store / Google Play |
| Supabase account | free tier OK | https://supabase.com |

**Optional:**
- Supabase CLI (`npm install -g supabase`) — for Edge Function deployment
- iOS Simulator / Android Emulator — alternative to Expo Go
- Docker — required if using Supabase CLI locally

---

## 2. Clone & Install

```bash
cd /path/to/projects
git clone <repository-url> acil-destek
cd acil-destek

npm install
```

This installs dependencies for all workspaces (`apps/mobile`, `apps/admin`, `packages/shared`).

**Verify:**
```bash
npm run typecheck
```

---

## 3. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name:** `hayat-agi` (or your choice)
   - **Database Password:** strong password — **save this securely**
   - **Region:** choose closest to Turkey (e.g., Frankfurt `eu-central-1`)
4. Wait 2–3 minutes for provisioning

### 3.1 Copy API Credentials

Navigate to **Project Settings → API**:

| Credential | Where to use |
|------------|--------------|
| **Project URL** | `EXPO_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public key** | `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role key** | Edge Functions secrets ONLY — **never in mobile/admin** |

---

## 4. Run SQL Migration

### 4.1 Where to Paste SQL

**Option A — Supabase Dashboard (Recommended for first setup):**

1. Open your project in Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open the file `supabase/migrations/0001_initial_schema.sql` from this repo
5. Copy the **entire contents** (all ~1350 lines)
6. Paste into the SQL Editor
7. Click **Run** (or Cmd/Ctrl + Enter)

**Option B — Supabase CLI:**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Project ref is in Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

### 4.2 What the Migration Creates

- Extensions: `uuid-ossp`, `postgis`, `pgcrypto`
- Private schema with security definer functions
- 22 public tables with indexes and triggers
- RLS policies on all tables
- Auth trigger for profile auto-creation
- Default system_settings for matching

### 4.3 Expected Result

SQL Editor should show **Success. No rows returned** (DDL statements don't return data).

Execution time: typically 5–15 seconds.

---

## 5. Common Migration Errors

### Error: `extension "postgis" is not available`

**Cause:** PostGIS not enabled on project.

**Fix:**
1. Dashboard → **Database → Extensions**
2. Search `postgis`
3. Click **Enable**
4. Re-run migration from the beginning (or from extensions section if partial)

### Error: `schema "extensions" does not exist`

**Cause:** Older Supabase project or non-standard setup.

**Fix:** Supabase hosted projects have `extensions` schema by default. If missing:
```sql
CREATE SCHEMA IF NOT EXISTS extensions;
```
Then re-run migration.

### Error: `permission denied to create extension`

**Cause:** Insufficient privileges (rare on hosted Supabase).

**Fix:** Enable extensions via Dashboard UI first, then re-run.

### Error: `relation "profiles" already exists`

**Cause:** Migration run twice.

**Fix:** Either:
- Skip if first run succeeded (verify with queries in Section 6)
- Or drop and recreate (DEV ONLY):
```sql
-- ⚠️ DESTRUCTIVE — dev only
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
-- Then re-run full migration
```

### Error: `function private.is_admin does not exist` (during policy creation)

**Cause:** Migration interrupted before helper functions created.

**Fix:** Re-run the **entire** migration file from the top. Policies depend on functions defined earlier.

### Error: `trigger "on_auth_user_created" already exists`

**Cause:** Re-running auth trigger section.

**Fix:** Migration includes `DROP TRIGGER IF EXISTS` — re-run full file, or ignore if tables exist.

### Error: Timeout / query too long

**Cause:** Very slow connection or large migration.

**Fix:** Run in smaller sections following file comment headers, in order:
1. Extensions
2. Tables
3. Helper functions
4. Auth trigger
5. RLS enable + policies

---

## 6. Verify Database Setup

Run these in **SQL Editor** after migration:

### 6.1 Tables Created

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** 22 tables including `profiles`, `incidents`, `responder_locations`, `user_consents`, etc.

### 6.2 Extensions Active

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('postgis', 'pgcrypto', 'uuid-ossp');
```

**Expected:** 3 rows.

### 6.3 RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** All tables show `rowsecurity = true`.

### 6.4 PostGIS Geography Columns

```sql
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'location';
```

**Expected:** Rows for `responder_locations`, `incident_locations`, etc.

### 6.5 status_112 Column

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'status_112';
```

**Expected:** 1 row, type `text`, default `'unknown'`.

### 6.6 System Settings Seeded

```sql
SELECT key, value FROM public.system_settings;
```

**Expected:** `incident_matching` and `mvp_simplified_matching` rows.

### 6.7 Helper Functions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'private'
ORDER BY routine_name;
```

**Expected:** `get_profile`, `is_admin`, `is_blocked`, `is_verified_responder`, `is_incident_creator`, `is_incident_responder`, `has_active_incident_consent`.

---

## 7. Configure Storage Buckets

Migration includes comments but does **not** auto-create buckets. Create manually:

### 7.1 responder-documents (Required)

1. Dashboard → **Storage**
2. **New bucket**
3. Settings:
   - **Name:** `responder-documents`
   - **Public:** OFF (private)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `application/pdf`

### 7.2 Storage RLS Policies (After bucket creation)

Run in SQL Editor (uncomment and adapt from migration footer):

```sql
CREATE POLICY "responder_docs_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'responder-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "responder_docs_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'responder-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "responder_docs_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'responder-documents'
    AND private.is_admin(auth.uid())
  );
```

### 7.3 avatars (Optional)

- Name: `avatars`
- Public: OFF recommended

---

## 8. Enable Auth

1. Dashboard → **Authentication → Providers**
2. Ensure **Email** is enabled
3. Settings:
   - **Confirm email:** Disable for dev speed (enable for production)
   - **Minimum password length:** 8 (matches app validation)

### 8.1 Redirect URLs (Future)

For magic links or OAuth (not MVP):
- Dashboard → **Authentication → URL Configuration**
- Add Expo dev URLs if needed

---

## 9. Environment Variables

### 9.1 Mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 9.2 Admin

```bash
cp apps/admin/.env.local.example apps/admin/.env.local
```

Edit `apps/admin/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 9.3 Edge Functions Secrets (When deploying)

```bash
supabase secrets set SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJ...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Optional:
supabase secrets set EXPO_ACCESS_TOKEN=your-expo-token
```

**⚠️ NEVER commit `.env` or `.env.local` files to git.**

---

## 10. Run Mobile App

### 10.1 iOS Simulator (önerilen — SDK 56 + Xcode)

App Store Expo Go SDK 56 desteklemediği için **native development build** kullanın:

```bash
# İlk kurulum (bir kez, 5–10 dk sürebilir)
cd apps/mobile
npx expo run:ios -d "iPhone 17 Pro"
```

Veya repo kökünden:

```bash
npm run mobile:ios
```

**Gereksinimler:** Xcode kurulu, Simulator runtime yüklü, `.env` dolu.

**Sonraki çalıştırmalar (daha hızlı):**

```bash
cd apps/mobile
npx expo start --dev-client
```

Simülatörde **Hayat Ağı** uygulaması zaten yüklüyse otomatik bağlanır; değilse tekrar `npx expo run:ios` çalıştırın.

### 10.2 Web (hızlı UI testi)

```bash
cd apps/mobile
npx expo start --web
```

Tarayıcı: `http://localhost:8081` — `react-native-web` kurulu olmalı.

### 10.3 Expo Go (fiziksel telefon — SDK 56 sınırlı)

App Store Expo Go **SDK 56 desteklemez**. Fiziksel iPhone için TestFlight SDK 56 Expo Go veya development build gerekir.

### 10.4 Metro only (eski yöntem)

```bash
npm run mobile
```

Press `i` — yalnızca uyumlu Expo Go / dev client varsa çalışır.

### 10.5 First Run Flow

1. Welcome → Create Account
2. Register with email, password, name
3. Safety screen → Continue
4. Profile setup (name, phone)
5. Consent screen → accept required items
6. Home screen with tabs (Ana Sayfa, Olaylar, Kişiler, Profil)

### 10.6 Verify in Supabase

After registration, check Dashboard → **Authentication → Users** — new user should appear.

Check **Table Editor → profiles** — row auto-created with matching id.

---

## 11. Run Admin Panel

```bash
# From repo root
npm run admin
```

Opens at [http://localhost:3001](http://localhost:3001)

Sprint 1 shows placeholder page. Full dashboard in Sprint 8.

---

## 12. Create Admin User

Admin status is **never** self-assigned. After signing up via mobile:

### 12.1 Find Your User ID

Dashboard → **Authentication → Users** → copy UUID

Or SQL:
```sql
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

### 12.2 Promote to Admin

SQL Editor:
```sql
UPDATE public.profiles
SET is_admin = true,
    user_type = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 12.3 Verify

```sql
SELECT id, email, full_name, is_admin, user_type, is_blocked
FROM public.profiles
WHERE is_admin = true;
```

**Expected:** Your user with `is_admin = true`.

### 12.4 Test Admin RLS

Log in as admin via mobile or future admin panel. Admin can now read all profiles (RLS policy `profiles_select_admin`).

---

## 13. Deploy Edge Functions

### 13.1 Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
```

### 13.2 Deploy create-incident (Stub)

```bash
supabase functions deploy create-incident
```

### 13.3 Test

```bash
# Get JWT from mobile app session or Supabase Dashboard → Authentication → Users → generate token

curl -X POST \
  'https://<project-ref>.supabase.co/functions/v1/create-incident' \
  -H 'Authorization: Bearer <user-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "incident_type": "unknown",
    "status_112": "unknown",
    "latitude": 41.0082,
    "longitude": 28.9784
  }'
```

**Expected (Sprint 1 stub):**
```json
{
  "message": "Stub — implement in Sprint 3",
  "user_id": "...",
  "payload": { ... }
}
```

---

## 14. RLS Quick Tests

### 14.1 Test as Anonymous (Should Fail)

In SQL Editor, RLS applies to API calls, not SQL Editor (postgres role bypasses RLS). Test RLS via the Supabase client or REST API:

```javascript
// In browser console or test script with anon key only
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Without login — should error or return empty
const { data } = await supabase.from('profiles').select('*');
// Expected: [] or error
```

### 14.2 Test as Authenticated Citizen

After mobile login, the app uses the user JWT. Verify via Dashboard → **API Docs** or mobile debug:

```typescript
// Should return only own profile
const { data } = await supabase.from('profiles').select('*');

// Should return 0 rows or error (RLS blocks)
const { data: locations } = await supabase.from('responder_locations').select('*');
```

### 14.3 Test Blocked User

```sql
UPDATE profiles SET is_blocked = true WHERE email = 'test@example.com';
```

Try creating incident — should fail RLS check.

```sql
-- Restore after test
UPDATE profiles SET is_blocked = false WHERE email = 'test@example.com';
```

### 14.4 Test Consent Gate

Try inserting incident without consents:

```sql
-- Simulate: user without consents
INSERT INTO incidents (created_by_user_id, incident_type, status_112)
VALUES ('<user-uuid-without-consents>', 'unknown', 'unknown');
-- Should fail if tested via authenticated client with RLS
```

---

## 15. End-to-End Smoke Test

| Step | Action | Expected |
|------|--------|----------|
| 1 | `npm install` | No errors |
| 2 | Run migration | 22 tables, RLS on |
| 3 | Configure `.env` files | Keys set |
| 4 | `npm run mobile` | Expo starts |
| 5 | Register new user | User in auth.users |
| 6 | Check profiles table | Auto-created row |
| 7 | Complete profile setup | phone filled |
| 8 | Accept consents | rows in user_consents |
| 9 | Reach home screen | No crash |
| 10 | Promote admin via SQL | is_admin = true |
| 11 | `npm run admin` | Page loads on :3001 |

---

## 16. Troubleshooting

### Mobile: "Network request failed"
- Check SUPABASE_URL is correct (https, no trailing slash)
- Check device/simulator has internet
- Verify Supabase project is not paused (free tier)

### Mobile: "Invalid login credentials"
- Confirm email provider enabled
- If email confirmation ON, check inbox for confirm link
- Reset password via Dashboard → Authentication → Users

### Mobile: Stuck on consent after accepting
- Check SQL: `SELECT * FROM user_consents WHERE user_id = '<uuid>';`
- Check browser/Expo console for errors
- Verify RLS insert policy on user_consents

### Profile not auto-created
- Verify trigger exists:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
- Check function:
```sql
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```
- Manually insert if needed (dev only):
```sql
INSERT INTO profiles (id, email, full_name)
VALUES ('<auth-user-uuid>', 'email@example.com', 'Test User');
```

### TypeScript errors in shared package
```bash
npm run shared:build
npm run typecheck
```

### Expo: "Unable to resolve @hayat-agi/shared"
```bash
npm install
# Ensure root node_modules links workspace packages
```

### PostGIS query returns empty
- Verify extension: `SELECT PostGIS_Version();`
- Check geography not null: `SELECT id, ST_AsText(location) FROM responder_locations;`

---

## Related Documents

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
