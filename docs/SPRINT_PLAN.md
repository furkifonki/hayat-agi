# Hayat Ağı — Sprint Plan

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## Overview

Hayat Ağı is built in 11 sprints (0–10). Each sprint has a focused deliverable. Documentation is updated at the end of every sprint.

**Current progress:** Sprint 2 complete ✅

---

## Sprint 0: Project Foundation ✅

**Goal:** Monorepo scaffolding and local development environment.

### Tasks
- [x] Initialize npm workspaces monorepo
- [x] Create Expo mobile app (`apps/mobile`)
- [x] Create Next.js admin app (`apps/admin`)
- [x] Create shared package (`packages/shared`)
- [x] Environment variable examples (`.env.example`, `.env.local.example`)
- [x] Supabase client setup (mobile + admin)
- [x] Documentation structure (`docs/`)
- [x] Root README

### Deliverable
Project runs locally: `npm install`, `npm run mobile`, `npm run admin`.

### Documentation Updates
- README.md, all docs/ files (initial), CHANGELOG.md

---

## Sprint 1: Supabase Schema & Auth Foundation ✅

**Goal:** Full database schema and working authentication flow.

### Tasks
- [x] Complete SQL migration `0001_initial_schema.sql`
- [x] Extensions: uuid-ossp, postgis, pgcrypto
- [x] All tables, indexes, triggers, RLS policies
- [x] Private helper functions (is_admin, is_verified_responder, etc.)
- [x] Auth trigger `handle_new_user()` for profile creation
- [x] Mobile: register, login, welcome, safety screens
- [x] Mobile: profile setup
- [x] Mobile: consent recording to `user_consents`
- [x] Mobile: protected route gate
- [x] Shared validation schemas (Zod)
- [x] Edge Function stub: `create-incident`
- [x] Basic UI components (Button, ConsentCard, SafetyNotice, ScreenContainer)

### Deliverable
User can sign up, log in, complete profile, record consents, and reach home screen. Database fully migrated with RLS.

### Documentation Updates
- CHANGELOG.md (Sprint 0 + 1 entries)
- KNOWN_LIMITATIONS.md
- SETUP_GUIDE.md (detailed Supabase steps)

---

## Sprint 2: Design System & Mobile App Shell ✅

**Goal:** Polished app shell with design tokens and reusable components.

### Tasks
- [x] Inter font via Expo Google Fonts
- [x] Complete design token implementation
- [x] Reusable components: EmergencyActionButton, ActionCard, StatusPill, etc.
- [x] Citizen home screen layout (placeholder emergency button)
- [x] Responder mode placeholder / role switcher UI
- [x] Profile screen
- [x] Tab navigation structure
- [x] Empty states and loading skeletons

### Deliverable
Polished app shell that feels premium and calm; navigation structure in place.

---

## Sprint 3: Emergency Incident Creation

**Goal:** Citizen can create a real incident with location.

### Tasks
- [ ] Press-and-hold emergency button (3 seconds + haptics)
- [ ] Emergency type bottom sheet
- [ ] Location permission flow (expo-location)
- [ ] 112 guidance screen with status_112 capture
- [ ] Full `create-incident` Edge Function implementation
- [ ] Active incident status screen
- [ ] Report accident (bystander) flow
- [ ] Call 112 deep link
- [ ] False alarm cancel flow

### Deliverable
Citizen creates incident with location; incident visible in database and active incident screen.

---

## Sprint 4: Responder Onboarding & Verification

**Goal:** Responders can onboard; admins can verify.

### Tasks
- [ ] Responder profile form
- [ ] Document upload to `responder-documents` bucket
- [ ] Storage RLS policies
- [ ] Admin document review (basic UI)
- [ ] `verify-document-status` Edge Function
- [ ] Approve/reject with reasons
- [ ] Verification status push notifications

### Deliverable
Approved responder role works end-to-end.

---

## Sprint 5: Responder Availability & Location

**Goal:** Approved responders can go available with location.

### Tasks
- [ ] Availability toggle UI
- [ ] Location permission explanation
- [ ] expo-location foreground capture
- [ ] `update-responder-location` Edge Function
- [ ] Responder availability logs
- [ ] Responder home screen with status

### Deliverable
Approved responder enables availability; location stored and fresh.

---

## Sprint 6: Matching & Notifications

**Goal:** Incidents notify nearby approved responders.

### Tasks
- [ ] PostGIS matching in `send-incident-notifications`
- [ ] Push token registration (expo-notifications)
- [ ] Expo Push API integration
- [ ] incident_notifications logging
- [ ] Responder alert list UI
- [ ] MVP simplified matching (1 km, max 10)

### Deliverable
Creating incident triggers push to nearby available responders.

---

## Sprint 7: Incident Responder Lifecycle

**Goal:** Full incident flow from accept to close.

### Tasks
- [ ] Safety confirmation gate
- [ ] `accept-incident` Edge Function
- [ ] Exact location after accept + map/navigation
- [ ] `update-incident-responder-status` Edge Function
- [ ] On the way / arrived / completed buttons
- [ ] Ambulance arrived status
- [ ] `close-incident` Edge Function
- [ ] Realtime subscriptions for active incident
- [ ] Citizen + responder incident history

### Deliverable
Full incident lifecycle operable by citizen and responder.

---

## Sprint 8: Admin Operations Dashboard

**Goal:** Admin can monitor and moderate the platform.

### Tasks
- [ ] Admin auth gate (is_admin check)
- [ ] Dashboard layout with sidebar
- [ ] Active incidents map
- [ ] Incident detail + timeline
- [ ] User management (block/suspend)
- [ ] Document review queue (full)
- [ ] Abuse report management
- [ ] Audit log viewer
- [ ] Notification log viewer
- [ ] System settings editor

### Deliverable
Admin panel fully operational for day-to-day moderation.

---

## Sprint 9: Privacy, KVKK & Hardening

**Goal:** Privacy-reviewed MVP ready for legal review.

### Tasks
- [ ] Legal document versioning in `legal_documents`
- [ ] Consent re-acceptance on version change
- [ ] Retention policy implementation/documentation
- [ ] Full RLS audit and penetration-style tests
- [ ] Rate limiting on incident creation
- [ ] Security test suite completion
- [ ] Update KVKK drafts with legal review feedback
- [ ] Known limitations finalization

### Deliverable
Privacy-reviewed MVP with documented retention and security posture.

---

## Sprint 10: Expo Testing & Release Preparation

**Goal:** Testable MVP ready for demo and pilot.

### Tasks
- [ ] Expo Go full flow testing
- [ ] EAS development build (if needed for push)
- [ ] Push notification production configuration notes
- [ ] Complete QA checklist execution
- [ ] Seed data script for demo
- [ ] Demo script document
- [ ] App store preparation notes (optional)
- [ ] Performance profiling

### Deliverable
Testable MVP with demo data and release documentation.

---

## Sprint Documentation Protocol

After each sprint, update:
1. `README.md` — status and quick start changes
2. `docs/SPRINT_PLAN.md` — mark completed tasks
3. `docs/CHANGELOG.md` — sprint entry
4. `docs/KNOWN_LIMITATIONS.md` — new/changed limitations
5. Any architecture docs affected by the sprint
6. List: files changed, test steps, SQL changes, manual Dashboard steps, security impact

---

## Related Documents

- [CHANGELOG.md](./CHANGELOG.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
- [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md)
