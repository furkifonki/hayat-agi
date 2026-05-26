# Hayat Ağı — Database Schema

**Migration:** `supabase/migrations/0001_initial_schema.sql`  
**Last updated:** Sprint 1

---

## 1. Extensions

| Extension | Schema | Purpose |
|-----------|--------|---------|
| `uuid-ossp` | extensions | UUID utilities |
| `postgis` | extensions | Geography types, spatial queries |
| `pgcrypto` | extensions | `gen_random_uuid()` |

---

## 2. Schema Overview

```
auth.users
    └── profiles (1:1)
            ├── user_consents
            ├── emergency_contacts
            ├── emergency_health_cards
            ├── responder_profiles (1:1 optional)
            │       └── responder_documents
            ├── responder_locations (1:1 optional)
            ├── responder_availability_logs
            ├── push_tokens
            └── legal_acceptances

incidents
    ├── incident_locations
    ├── incident_responders
    ├── incident_status_events
    ├── incident_notifications
    └── incident_messages

organizations (future)
    ├── organization_members
    └── organization_locations

system_settings
legal_documents
audit_logs
abuse_reports
admin_notes
```

---

## 3. Tables Reference

### 3.1 `profiles`

Core user identity linked to Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text NOT NULL | |
| `phone` | text | |
| `email` | text | |
| `avatar_url` | text | |
| `user_type` | text | `citizen`, `responder`, `citizen_and_responder`, `admin` |
| `is_admin` | boolean | Default false; server-controlled |
| `is_blocked` | boolean | Default false |
| `preferred_language` | text | Default `tr` |
| `city` | text | |
| `date_of_birth` | date | |
| `created_at`, `updated_at` | timestamptz | Auto `updated_at` trigger |

**Indexes:** `user_type`, partial on `is_admin`, partial on `is_blocked`

---

### 3.2 `user_consents`

Granular consent audit trail.

| Column | Type | Notes |
|--------|------|-------|
| `consent_type` | text | See enum below |
| `version` | text | Default `1.0` |
| `accepted` | boolean | |
| `accepted_at` | timestamptz | |
| `ip_address`, `user_agent` | text | Optional audit |
| `metadata` | jsonb | |

**`consent_type` values:**
- `kvkk_notice`
- `explicit_consent_location`
- `explicit_consent_health_data`
- `terms_of_use`
- `responder_terms`
- `push_notifications`
- `emergency_contact_permission`

**Unique:** `(user_id, consent_type, version)`

---

### 3.3 `emergency_contacts`

| Column | Type | Notes |
|--------|------|-------|
| `name` | text NOT NULL | |
| `phone` | text NOT NULL | |
| `relationship` | text | |
| `notify_on_incident` | boolean | Default true |

---

### 3.4 `emergency_health_cards`

Optional health information. **Strict visibility rules via RLS.**

| Column | Type | Notes |
|--------|------|-------|
| `blood_type` | text | |
| `allergies` | text | |
| `chronic_conditions` | text | |
| `medications` | text | |
| `notes` | text | |
| `is_enabled` | boolean | Default false |
| `visibility_mode` | text | `incident_only`, `never`, `responder_accepted` |

**Unique:** one card per user (`user_id` UNIQUE)

---

### 3.5 `responder_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `responder_type` | text | `doctor`, `nurse`, `paramedic`, `emt`, `first_aider`, `other_healthcare` |
| `verification_status` | text | `not_started`, `pending_review`, `approved`, `rejected`, `suspended`, `expired` |
| `license_number` | text | |
| `certificate_number` | text | |
| `issuing_institution` | text | |
| `workplace` | text | |
| `bio` | text | |
| `verified_at` | timestamptz | |
| `verified_by` | uuid FK → profiles | |
| `rejection_reason` | text | |
| `suspended_reason` | text | |
| `document_expiry_date` | date | |
| `accepted_responder_terms` | boolean | Required for alerts |

**Unique:** one profile per user

---

### 3.6 `responder_documents`

| Column | Type | Notes |
|--------|------|-------|
| `document_type` | text | `identity_optional`, `medical_license`, `nurse_license`, `paramedic_certificate`, `first_aid_certificate`, `other` |
| `storage_path` | text NOT NULL | Supabase Storage path |
| `status` | text | `pending`, `approved`, `rejected`, `expired` |
| `reviewed_by` | uuid | |
| `reviewed_at` | timestamptz | |
| `rejection_reason` | text | |

---

### 3.7 `responder_locations` (PostGIS)

**Citizens MUST NOT query this table.** Matching is Edge Function only.

| Column | Type | Notes |
|--------|------|-------|
| `location` | geography(Point, 4326) | Auto-synced from lat/lng via trigger |
| `latitude` | double precision | |
| `longitude` | double precision | |
| `accuracy_meters` | double precision | |
| `availability_status` | text | `available`, `unavailable`, `busy`, `on_incident`, `suspended` |
| `permission_scope` | text | `foreground`, `background`, `none` |

**Indexes:** GIST on `location`, btree on `availability_status`, `updated_at`

**Trigger:** `sync_geography_from_lat_lng()` on INSERT/UPDATE

---

### 3.8 `responder_availability_logs`

Audit trail for availability status changes.

| Column | Type | Notes |
|--------|------|-------|
| `old_status` | text | |
| `new_status` | text NOT NULL | |
| `location` | geography(Point, 4326) | Optional snapshot |

---

### 3.9 `incidents`

Central incident record.

| Column | Type | Notes |
|--------|------|-------|
| `created_by_user_id` | uuid FK → profiles | Reporter/creator |
| `affected_person_is_creator` | boolean | Default true |
| `reporter_relation` | text | `self`, `bystander`, `family`, `coworker`, `unknown` |
| `incident_type` | text | 11 types + `unknown` |
| `severity_level` | text | `red`, `orange`, `yellow`, `unknown` |
| `status` | text | Lifecycle — see INCIDENT_LIFECYCLE.md |
| `description` | text | |
| **`status_112`** | text | **`called`, `not_called`, `unknown`, `unable_to_call`** |
| `max_responders` | int | Default 3, max 10 |
| `accepted_responder_count` | int | Default 0 |
| `is_public_alert` | boolean | Default true |
| `is_test` | boolean | Default false |
| `cancel_reason` | text | |
| `closed_reason` | text | |
| `closed_at` | timestamptz | |

> **Important:** The 112 call tracking column is named **`status_112`** (not `112_status`). This avoids SQL parsing issues and matches `@hayat-agi/shared` types and Zod schemas.

**Partial index:** active incidents where status NOT IN (`closed`, `cancelled`, `expired`)

---

### 3.10 `incident_locations` (PostGIS)

| Column | Type | Notes |
|--------|------|-------|
| `incident_id` | uuid FK | |
| `location` | geography(Point, 4326) | GIST index |
| `latitude`, `longitude` | double precision | NOT NULL |
| `accuracy_meters` | double precision | |
| `source` | text | `gps`, `manual`, `map_pin`, `last_known` |

---

### 3.11 `incident_responders`

| Column | Type | Notes |
|--------|------|-------|
| `incident_id` | uuid FK | |
| `responder_user_id` | uuid FK → profiles | |
| `status` | text | `notified`, `viewed`, `accepted`, `declined`, `on_the_way`, `arrived`, `completed`, `cancelled_by_system` |
| `distance_meters` | double precision | At notification time |
| `notified_at`, `accepted_at`, `on_the_way_at`, `arrived_at`, `completed_at`, `declined_at` | timestamptz | |
| `decline_reason` | text | |

**Unique:** `(incident_id, responder_user_id)`

---

### 3.12 `incident_status_events`

Immutable audit of status transitions.

| Column | Type | Notes |
|--------|------|-------|
| `actor_user_id` | uuid | Nullable for system events |
| `event_type` | text | |
| `old_status`, `new_status` | text | |
| `metadata` | jsonb | |

---

### 3.13 `incident_notifications`

Push notification log.

| Column | Type | Notes |
|--------|------|-------|
| `notification_type` | text | `incident_nearby`, `incident_update`, `responder_accepted`, `responder_arrived`, `emergency_contact_alert`, `verification_approved`, `verification_rejected` |
| `title`, `body` | text | |
| `status` | text | `queued`, `sent`, `failed`, `opened`, `expired` |
| `push_token_id` | uuid FK | |
| `sent_at`, `opened_at` | timestamptz | |
| `error_message` | text | |

---

### 3.14 `incident_messages`

MVP: table exists; in-app messaging may be disabled.

| Column | Type | Notes |
|--------|------|-------|
| `message` | text | Max 2000 chars |

---

### 3.15 `push_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `expo_push_token` | text NOT NULL | |
| `device_id` | text | |
| `platform` | text | `ios`, `android`, `web` |
| `is_active` | boolean | Default true |

**Unique:** `(user_id, expo_push_token)`

---

### 3.16 `abuse_reports`

| Column | Type | Notes |
|--------|------|-------|
| `reporter_user_id` | uuid | |
| `reported_user_id` | uuid | Nullable |
| `incident_id` | uuid | Nullable |
| `reason` | text NOT NULL | |
| `status` | text | `open`, `reviewing`, `resolved`, `dismissed` |

---

### 3.17 `audit_logs`

Insert via Edge Functions / service_role only. Admin read via RLS.

| Column | Type | Notes |
|--------|------|-------|
| `action` | text NOT NULL | |
| `target_table` | text | |
| `target_id` | uuid | |
| `metadata` | jsonb | |

---

### 3.18 `organizations` (Future-ready)

| Column | Type | Notes |
|--------|------|-------|
| `type` | text | `school`, `mall`, `factory`, etc. |
| `status` | text | `active`, `inactive`, `suspended` |

Related: `organization_members`, `organization_locations` (PostGIS)

---

### 3.19 `legal_documents` / `legal_acceptances`

Versioned legal content stored in DB for in-app display.

---

### 3.20 `system_settings`

Key-value JSON configuration.

**Seeded keys:**
- `incident_matching` — escalation phases, radius, stale minutes
- `mvp_simplified_matching` — `{ enabled: true, radius_meters: 1000, max_responders: 10 }`

---

### 3.21 `admin_notes`

Internal admin notes on users or incidents.

---

## 4. PostGIS Usage

### 4.1 Geography Columns

All spatial data uses `extensions.geography(point, 4326)` (WGS 84).

Tables with geography:
- `responder_locations.location`
- `incident_locations.location`
- `responder_availability_logs.location`
- `organization_locations.location`

### 4.2 Sync Trigger

`public.sync_geography_from_lat_lng()` auto-populates `location` when `latitude` and `longitude` are set:

```sql
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
```

### 4.3 Planned Queries (Edge Functions)

```sql
-- Find responders within radius (service_role only)
SELECT rl.user_id,
       ST_Distance(rl.location, incident_point) AS distance_meters
FROM responder_locations rl
JOIN responder_profiles rp ON rp.user_id = rl.user_id
JOIN profiles p ON p.id = rl.user_id
WHERE rp.verification_status = 'approved'
  AND rl.availability_status = 'available'
  AND rl.updated_at > now() - interval '15 minutes'
  AND ST_DWithin(rl.location, incident_point, radius_meters)
  AND p.is_blocked = false;
```

---

## 5. Private Helper Functions

Located in `private` schema (security definer):

| Function | Returns | Purpose |
|----------|---------|---------|
| `private.get_profile(uuid)` | profiles row | Safe profile lookup |
| `private.is_blocked(uuid)` | boolean | Block check (default true if missing) |
| `private.is_admin(uuid)` | boolean | Admin + not blocked |
| `private.is_verified_responder(uuid)` | boolean | Approved + not blocked |
| `private.is_incident_creator(uuid, incident_id)` | boolean | |
| `private.is_incident_responder(uuid, incident_id, min_status)` | boolean | |
| `private.has_active_incident_consent(uuid)` | boolean | Required consents for incident |

---

## 6. Auth Trigger

`public.handle_new_user()` — AFTER INSERT on `auth.users`:
- Creates `profiles` row with id, email, full_name, phone from metadata
- ON CONFLICT updates email

---

## 7. RLS Principles Summary

| Table | Citizen | Responder | Admin |
|-------|---------|-----------|-------|
| profiles | Own read/update | Own read/update | All |
| responder_locations | **No access** | Own CRUD | Read all |
| incidents | Own + assigned | Notified/accepted | All |
| incident_locations | Own | Accepted only | All |
| emergency_health_cards | Own CRUD | Accepted + active incident | Read |
| responder_documents | Own | Own upload | Review |
| audit_logs | No | No | Read |
| incident_notifications | Own read | Own read | Read |

**Insert restrictions:**
- `incidents`: authenticated insert allowed if consents valid (MVP); production prefers Edge Function
- `incident_notifications`: no authenticated INSERT policy — Edge Function only
- `audit_logs`: no authenticated INSERT policy — service_role only

---

## 8. Storage Buckets (Manual Setup)

See migration comments for `responder-documents` and `avatars` bucket configuration and RLS policy templates.

---

## 9. Verification Queries

```sql
-- All public tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- PostGIS enabled
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'pgcrypto');

-- RLS enabled everywhere
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- status_112 column exists
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'status_112';
```

---

## 10. Related Documents

- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [INCIDENT_LIFECYCLE.md](./INCIDENT_LIFECYCLE.md)
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)
