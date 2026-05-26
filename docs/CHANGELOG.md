# Hayat Ağı — Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/). Sprint-based entries align with [SPRINT_PLAN.md](./SPRINT_PLAN.md).

---

## [Unreleased]

### Planned (Sprint 5+)
- Responder availability and live location
- Push notifications and incident matching
- Full admin operations dashboard (Sprint 8)

---

## Sprint 4 — Responder Onboarding & Verification (2026-05-26)

### Added
- **Mobile:** `responder/onboarding` — role selection, license fields, document upload, terms acceptance
- **Mobile:** `responder-service` — submit application, upload to `responder-documents`, consent recording
- **Edge Function:** `verify-document-status` — admin approve/reject, profile approval, audit log, notification queue
- **Admin:** `/login`, `/review` — pending document queue with approve/reject
- **Shared:** `DocumentType`, `getRequiredDocumentType`, `verifyDocumentStatusSchema`, `RESPONDER_TERMS_SHORT`

### Changed
- Profile and responder home screens link to onboarding; rejected users can re-apply
- Admin home links to document review flow

### Deploy notes
```bash
npx supabase functions deploy verify-document-status
```
Ensure `0002_storage_setup.sql` ran and admin user has `is_admin = true`.

---

## Sprint 2 — Design System & Mobile App Shell (2026-05-24)

### Added
- **Inter font** via `@expo-google-fonts/inter` with `textStyles` helper
- **UI components:** `EmergencyActionButton`, `ActionCard`, `StatusPill`, `Card`, `EmptyState`, `SkeletonCard`, `VerificationStatusCard`, `LocationPermissionCard`
- **Tab navigation:** Ana Sayfa, Olaylar, Kişiler, Profil
- **Citizen home:** premium layout, 112 safety card, press-and-hold emergency button (preview), action grid
- **Responder placeholder:** availability toggle UI, verification card, safety notice
- **Profile screen:** account info, responder status, logout confirm
- **Empty states** for incidents and contacts tabs
- `lib/responder-service.ts` — fetch responder profile
- Auth store extended with `responderProfile`

### Changed
- Auth redirect target: `/(app)/(tabs)` instead of `/home`
- `expo-router` aligned to SDK 56 (`56.2.6`)
- Root layout loads fonts before rendering

### Documentation
- Updated SPRINT_PLAN.md, DESIGN_SYSTEM.md, KNOWN_LIMITATIONS.md, README.md

### Security / Privacy
- No new data collection; UI shell only

### How to Test (Expo)
1. `npm run mobile`
2. Login → verify tab bar with 4 tabs
3. Home: hold emergency button 3s → preview alert
4. Profile: view account, logout
5. Responder screen accessible only if `responder_profiles` row exists

---

## Sprint 1 — Supabase Schema & Auth Foundation (2026-05-24)

### Added
- **Database migration** `supabase/migrations/0001_initial_schema.sql`:
  - 22 public tables with full constraints and indexes
  - PostGIS geography columns with GIST indexes and sync triggers
  - `status_112` column on `incidents` for 112 call tracking
  - Private schema helper functions (`is_admin`, `is_verified_responder`, etc.)
  - Comprehensive RLS policies on all tables
  - Auth trigger `handle_new_user()` for automatic profile creation
  - Default `system_settings` for incident matching configuration
- **Mobile app auth flow:**
  - Welcome, safety, register, login screens
  - Profile setup (full_name, phone required)
  - Consent screen with KVKK, terms, location, optional push
  - Protected route gate via `app/index.tsx`
  - Zustand auth store
- **Shared package** (`@hayat-agi/shared`):
  - Database types, Zod validation schemas
  - Emergency type constants and labels
  - Color design tokens
  - Legal copy short strings
  - Permission helpers (`canReceiveIncidentAlerts`, `isAdmin`, etc.)
- **Edge Function stub:** `create-incident` (auth validation + stub response)
- **UI components:** ScreenContainer, PrimaryButton, ConsentCard, SafetyNoticeCard
- **Documentation:** Full docs/ directory (18 files)

### Security
- RLS enabled on all public tables
- Citizens cannot query `responder_locations`
- Health card visible to accepted responders on active incidents only
- Profile self-promotion to admin blocked via RLS WITH CHECK
- Service role used only in Edge Function (not in client apps)

### Manual Steps Required
- Run SQL migration in Supabase SQL Editor
- Create `responder-documents` storage bucket
- Promote admin user via SQL after signup

---

## Sprint 0 — Project Foundation (2026-05-24)

### Added
- npm workspaces monorepo structure (`hayat-agi`)
- `apps/mobile` — Expo SDK 56, React Native 0.85, Expo Router 6
- `apps/admin` — Next.js 16, React 19, Tailwind CSS 4
- `packages/shared` — shared TypeScript package
- Environment examples:
  - `apps/mobile/.env.example`
  - `apps/admin/.env.local.example`
- Supabase client initialization (mobile AsyncStorage, admin SSR-ready)
- Root `package.json` scripts: `mobile`, `admin`, `shared:build`, `typecheck`
- Node.js >= 20 engine requirement
- Initial documentation structure and README

### Infrastructure
- `.npmrc` for workspace configuration
- TypeScript configured in all packages

---

## Related Documents

- [SPRINT_PLAN.md](./SPRINT_PLAN.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
