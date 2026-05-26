# Hayat Ağı — Technical Architecture

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Overview

Hayat Ağı is a TypeScript monorepo with three deployable surfaces and one shared package:

```
acil-destek/
├── apps/
│   ├── mobile/          # Expo React Native (citizens + responders)
│   └── admin/           # Next.js operations panel
├── packages/
│   └── shared/          # Types, validation, constants, permissions
├── supabase/
│   ├── migrations/      # Postgres schema + RLS
│   └── functions/       # Deno Edge Functions
└── docs/                # Product & engineering documentation
```

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo SDK 56, React Native 0.85, Expo Router 6, TypeScript |
| Admin | Next.js 16, React 19, Tailwind CSS 4, TypeScript |
| Backend | Supabase (Auth, Postgres 15+, PostGIS, Storage, Edge Functions, Realtime) |
| Validation | Zod (shared schemas in `@hayat-agi/shared`) |
| Mobile state | Zustand (`auth-store`) |
| Forms | react-hook-form + Zod resolvers |
| Push (MVP) | expo-notifications → Expo Push API |
| Maps (planned) | react-native-maps or Expo-compatible solution |

---

## 3. Monorepo Structure

### 3.1 npm Workspaces

Root `package.json` defines workspaces: `apps/*`, `packages/*`.

```bash
npm install          # Install all workspaces
npm run mobile       # Start Expo dev server
npm run admin        # Start Next.js on port 3001
npm run shared:build # Build shared package
npm run typecheck    # Typecheck all workspaces
```

### 3.2 `@hayat-agi/shared`

Single source of truth for cross-app> definitions and types:

| Module | Contents |
|--------|----------|
| `types/database.ts` | Profile, Incident, ResponderProfile interfaces |
| `validation/schemas.ts` | signUp, createIncident, closeIncident, etc. |
| `constants/emergency-types.ts` | Incident types, statuses, consent types |
| `constants/colors.ts` | Design tokens |
| `constants/legal-copy.ts` | Short in-app legal strings |
| `permissions/helpers.ts` | canReceiveIncidentAlerts, isAdmin, etc. |

Both mobile and admin import from `@hayat-agi/shared` to prevent schema drift.

---

## 4. Application Separation

### 4.1 Mobile App (`apps/mobile`)

**Audience:** Citizens and responders (same binary, role-based UX).

**Responsibilities:**
- Supabase Auth (email/password)
- Profile setup and consent recording
- Emergency incident creation (via Edge Function)
- Responder availability and location updates
- Push token registration
- Realtime subscriptions for active incidents (planned)

**Must NOT:**
- Hold or use `SUPABASE_SERVICE_ROLE_KEY`
- Query all `responder_locations`
- Approve responders or review documents as admin
- Send push notifications directly

**Routing (Expo Router):**
```
app/
├── index.tsx              # Auth gate
├── (auth)/                # Welcome, safety, register, login, consent
└── (app)/                 # Protected: home, profile-setup
```

Future tabs: Home, Incidents, Contacts, Profile (citizen); Responder Home, Alerts, Availability, Documents (responder).

### Admin Website (`apps/admin`)

**Audience:** Platform administrators only.

**Responsibilities:**
- Admin-authenticated dashboard (Sprint 8)
- Incident monitoring map
- Responder document review
- User moderation
- Audit log viewing

**Auth model:** Same Supabase Auth; `profiles.is_admin = true` gates admin RLS policies. Admin frontend uses anon key + user JWT — never service role in browser.

**Current state (Sprint 1):** Placeholder landing page; full dashboard in Sprint 8.

---

## 5. Backend Architecture (Supabase)

### 5.1 Postgres + PostGIS

- All application data in `public` schema with RLS enabled
- Security helper functions in `private` schema (security definer)
- PostGIS `geography(Point, 4326)` for spatial columns
- GIST indexes on location columns

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full table list.

### 5.2 Row Level Security

Every table has RLS. Authorization uses:
- `auth.uid()` for current user
- `private.is_admin()`, `private.is_verified_responder()`, `private.is_incident_creator()`, `private.is_incident_responder()` helper functions

**Critical rule:** Citizens cannot SELECT from `responder_locations`. Matching runs server-side only.

### 5.3 Edge Functions (Deno)

Sensitive workflows bypass direct client DB writes:

| Function | Status | Auth |
|----------|--------|------|
| `create-incident` | Stub (Sprint 3) | User JWT + service role internally |
| `accept-incident` | Planned Sprint 7 | User JWT |
| `close-incident` | Planned Sprint 7 | User JWT |
| `update-responder-location` | Planned Sprint 5 | User JWT |
| `send-incident-notifications` | Planned Sprint 6 | Internal / service role |
| `verify-document-status` | Planned Sprint 4 | Admin JWT |

Pattern:
1. Client sends request with `Authorization: Bearer <user_jwt>`
2. Function validates user with anon client + JWT
3. Function performs privileged operations with service role client
4. Function returns typed JSON response

### 5.4 Storage

| Bucket | Access | Purpose |
|--------|--------|---------|
| `responder-documents` | Private | License/certificate uploads |
| `avatars` | Private (recommended) | Profile photos |

Storage RLS policies documented in migration comments; create buckets manually in Dashboard.

### 5.5 Realtime (Planned)

Subscribe to `incidents` and `incident_responders` for active incident updates. RLS applies to Realtime channels.

---

## 6. Authentication Flow

```
┌─────────────┐     signUp/signIn      ┌──────────────┐
│ Mobile App  │ ──────────────────────►│ Supabase Auth│
└─────────────┘                        └──────┬───────┘
       │                                      │
       │                              trigger: handle_new_user()
       │                                      ▼
       │                               ┌──────────────┐
       │◄──── session + JWT ────────────│ profiles row │
       │                               └──────────────┘
       │
       ▼
 Profile setup → Consent recording → Protected app shell
```

**Profile trigger:** `public.handle_new_user()` fires on `auth.users` INSERT. Extracts `full_name` from `raw_user_meta_data`, falls back to email prefix.

**Session storage (mobile):** `@supabase/supabase-js` with AsyncStorage adapter.

**Admin session:** `@supabase/ssr` cookie-based session (Sprint 8).

**Admin promotion:** Manual SQL update to `profiles.is_admin` — never via client self-update (RLS prevents this).

---

## 7. Data Flow: Incident Creation (Target — Sprint 3+)

```
Citizen App                    Edge Functions                    Database
     │                              │                              │
     │ POST create-incident         │                              │
     │ (JWT + payload)              │                              │
     ├─────────────────────────────►│ validate auth + consents     │
     │                              │ insert incidents             │
     │                              │ insert incident_locations    │
     │                              │ insert status_events         │
     │                              ├─────────────────────────────►│
     │                              │ invoke send-incident-notif.  │
     │                              │   PostGIS ST_DWithin query   │
     │                              │   insert incident_responders │
     │                              │   Expo push + notif logs     │
     │◄──── incident_id, status ────│                              │
```

---

## 8. Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | Public anon key |
| `NEXT_PUBLIC_SUPABASE_URL` | Admin | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Admin | Public anon key |
| `SUPABASE_URL` | Edge Functions | Project URL (secret) |
| `SUPABASE_ANON_KEY` | Edge Functions | Anon key (secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | **Server only** |
| `EXPO_ACCESS_TOKEN` | Edge Functions | Optional, for push |

**Never** embed service role key in mobile, admin frontend, or git.

---

## 9. Security Architecture Summary

| Threat | Mitigation |
|--------|------------|
| Unauthorized data access | RLS on all tables |
| Service role exposure | Edge Functions only |
| Responder location harvesting | No citizen SELECT on `responder_locations` |
| Health data leakage | RLS: accepted responder + active incident only |
| Admin self-promotion | RLS WITH CHECK on profile update |
| JWT metadata abuse | Admin check via `profiles.is_admin`, not `auth.jwt()` metadata |
| Push data leakage | Generic notification body, no GPS in push |

See [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md).

---

## 10. Deployment Targets

| Surface | Target |
|---------|--------|
| Mobile | Expo Go (dev), EAS Build (production — Sprint 10) |
| Admin | Vercel / self-hosted Node |
| Database | Supabase hosted Postgres |
| Edge Functions | Supabase Edge Functions (`supabase functions deploy`) |

---

## 11. Current Implementation Status (Sprint 1)

| Component | Status |
|-----------|--------|
| Monorepo scaffolding | ✅ |
| Shared package | ✅ |
| SQL migration `0001_initial_schema.sql` | ✅ |
| Mobile auth + profile + consent | ✅ |
| Admin placeholder | ✅ |
| Edge Function `create-incident` | Stub only |
| Other Edge Functions | Not yet created |
| Design system components | Partial (Button, ConsentCard, SafetyNotice, ScreenContainer) |
| Emergency flows | Sprint 2–3 |

---

## 12. Related Documents

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)
- [API_CONTRACTS.md](./API_CONTRACTS.md)
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)
