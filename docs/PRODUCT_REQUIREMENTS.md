# Hayat Ağı — Product Requirements Document (PRD)

**Version:** 0.1.0 (MVP Foundation)  
**Last updated:** Sprint 1  
**Working name:** Hayat Ağı

---

## 1. Executive Summary

Hayat Ağı is a **volunteer emergency support coordination platform** built as a mobile-first product with a separate admin operations panel. It connects citizens in medical emergencies with nearby **verified** healthcare professionals and certified first aiders during the critical minutes before official ambulance services arrive.

**Hayat Ağı is NOT:**
- A replacement for 112 (Turkey's emergency number)
- A medical treatment or diagnosis provider
- An ambulance dispatch system
- A guarantee of responder arrival

**Hayat Ağı IS:**
- A privacy-first, consent-driven coordination layer
- A verified-responder matching network
- A safety-aware support tool for pre-hospital minutes

Every user-facing flow must reinforce: **Acil durumlarda her zaman 112'yi arayın.**

---

## 2. Problem Statement

In medical emergencies, the interval between incident occurrence and professional ambulance arrival can be life-critical. Nearby trained volunteers (doctors, nurses, paramedics, EMTs, first aiders) may be able to provide initial support — but there is no structured, verified, privacy-respecting channel to coordinate them today.

Hayat Ağı addresses this gap without competing with or replacing official emergency services.

---

## 3. Target Users

### 3.1 Citizens
Regular users who may need emergency help or report incidents as bystanders.

**Needs:**
- Fast, low-friction emergency request with location
- Clear 112 guidance at every step
- Visibility into responder status
- Optional health card and emergency contacts
- Privacy control over personal data

### 3.2 Responders
Verified healthcare professionals and certified first aiders who volunteer to receive nearby alerts.

**Needs:**
- Professional onboarding and document verification
- Availability mode with transparent location usage
- Safety-first incident details (approximate distance before accept, exact location after)
- Status updates (on the way, arrived, completed)
- Protection from dangerous scene pressure

### 3.3 Administrators
Operations staff who verify responders, monitor incidents, moderate abuse, and maintain platform integrity.

**Needs:**
- Real-time incident visibility
- Document review queue
- User moderation (block/suspend)
- Audit and consent visibility
- System configuration

### 3.4 Dual-role users
A user may be both citizen and responder. Every responder is also a citizen. Responder features remain locked until admin approval.

---

## 4. Core Product Principles

| # | Principle | Requirement |
|---|-----------|-------------|
| 1 | **Safety first** | Never pressure responders toward dangerous locations. Safety notices before every incident detail view. |
| 2 | **112 first** | Every emergency flow shows 112 call guidance. Track `status_112` on incidents. |
| 3 | **Permission-based location** | No hidden tracking. Citizen location only at incident creation. Responder location only when availability enabled or incident accepted. |
| 4 | **Verified responders only** | Document upload + admin approval required before public alerts. |
| 5 | **Role separation** | Citizen UX, responder UX, and admin panel are distinct experiences. |
| 6 | **Privacy by design** | Minimum data collection, RLS everywhere, Edge Functions for sensitive workflows, no service role in clients. |
| 7 | **Documentation first** | Architecture and legal decisions documented before and during implementation. |

---

## 5. Functional Requirements

### 5.1 Authentication & Onboarding (Sprint 1 — Done)

- Email/password registration via Supabase Auth
- Role intention at signup: citizen, healthcare professional, certified first aider
- Automatic profile creation via database trigger on `auth.users`
- Profile setup: full name, phone (required); city, date of birth (optional)
- Consent recording: KVKK notice, terms of use, location consent (required); push (optional)
- Protected routes: unauthenticated users cannot access app shell

### 5.2 Citizen Mode

| Feature | Priority | Sprint |
|---------|----------|--------|
| Emergency button (press-and-hold 3s) | P0 | 2–3 |
| Emergency type selector | P0 | 3 |
| Location capture with consent | P0 | 3 |
| 112 guidance and status capture | P0 | 3 |
| Active incident status screen | P0 | 3 |
| Report accident (bystander flow) | P1 | 3 |
| Emergency contacts CRUD | P1 | 4+ |
| Optional health card | P2 | 4+ |
| Incident history | P2 | 7 |
| Cancel false alarm | P0 | 3 |
| Call 112 deep link | P0 | 3 |

### 5.3 Responder Mode

| Feature | Priority | Sprint |
|---------|----------|--------|
| Responder profile onboarding | P0 | 4 |
| Document upload | P0 | 4 |
| Admin verification workflow | P0 | 4 |
| Availability toggle | P0 | 5 |
| Location upsert when available | P0 | 5 |
| Nearby incident alerts (push) | P0 | 6 |
| Safety notice before details | P0 | 7 |
| Accept / decline incident | P0 | 7 |
| Status updates (on the way, arrived, etc.) | P0 | 7 |
| Responder incident history | P2 | 7 |

### 5.4 Admin Panel

| Feature | Priority | Sprint |
|---------|----------|--------|
| Admin login | P0 | 8 |
| Active incidents map | P0 | 8 |
| Incident detail + timeline | P0 | 8 |
| Responder document review | P0 | 4/8 |
| User block/suspend | P0 | 8 |
| Abuse report review | P1 | 8 |
| Audit log viewer | P1 | 8 |
| Notification log viewer | P2 | 8 |
| System settings editor | P2 | 8 |

---

## 6. Non-Functional Requirements

### 6.1 Reliability
- Server-side incident creation and matching (Edge Functions)
- Idempotent notification sending with logging
- Graceful degradation when location unavailable

### 6.2 Security
- Row Level Security on all public tables
- Service role key only in Edge Functions
- Private storage for responder documents
- Health card visible to accepted responders only during active incidents

### 6.3 Privacy & Legal
- KVKK-compliant consent flows
- Draft legal texts (require legal review before production)
- Data minimization
- Retention policies documented (Sprint 9)

### 6.4 UX / Design
- Calm urgency: trustworthy, not panic-inducing
- Large touch targets, readable under stress
- Red reserved for true emergency CTAs only
- Accessibility: high contrast, clear hierarchy

### 6.5 Performance
- PostGIS spatial queries for responder matching
- Responder location stale threshold: 15 minutes
- MVP simplified matching: 1 km radius, max 10 notifications

---

## 7. Incident Data Model (Key Fields)

Incidents distinguish **who created** vs **who is affected**:

| Field | Purpose |
|-------|---------|
| `created_by_user_id` | User who initiated the request |
| `affected_person_is_creator` | Whether creator is the patient |
| `reporter_relation` | `self`, `bystander`, `family`, `coworker`, `unknown` |
| `status_112` | `called`, `not_called`, `unknown`, `unable_to_call` |
| `incident_type` | 11 predefined types + `unknown` |
| `status` | Lifecycle state (see INCIDENT_LIFECYCLE.md) |
| `max_responders` | Default 3 accepted responders per incident |

> **Note:** The database column is `status_112` (not `112_status`). This naming avoids SQL identifier issues with leading digits.

---

## 8. Matching & Notification Requirements

When an incident is created:
1. Edge Function `create-incident` validates auth, consents, and input
2. Inserts incident + location + status event
3. Invokes `send-incident-notifications` for PostGIS-based matching

**Eligible responders:**
- `verification_status = approved`
- `availability_status = available`
- Location updated within 15 minutes
- Not blocked or suspended
- Within configured radius
- Not already on another active incident
- Has accepted responder terms

**Escalation (documented, phased implementation):**
- Phase 1: 500 m, max 3 responders, wait 30 s
- Phase 2: 1 km, max 5 more, wait 60 s
- Phase 3: 3 km, max 10 more, wait 120 s

**MVP simplification:** 1 km radius, max 10 responders (configured in `system_settings`).

---

## 9. Out of Scope (MVP)

- Phone OTP / social auth
- Always-on background location tracking
- In-app messaging (table exists; feature may be disabled)
- Organization/institution accounts (schema ready)
- Direct FCM/APNs (Expo Push for MVP)
- Medical diagnosis or treatment guidance
- Integration with 112 dispatch systems
- Multi-language UI beyond Turkish primary

---

## 10. Success Metrics (Post-MVP)

- Time from incident creation to first responder acceptance
- Percentage of incidents with `status_112 = called`
- Responder verification turnaround time
- False alarm rate and abuse report resolution time
- Push notification delivery success rate

---

## 11. Related Documents

| Document | Content |
|----------|---------|
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) | Stack, monorepo, auth flow |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Full table reference |
| [MOBILE_APP_FLOWS.md](./MOBILE_APP_FLOWS.md) | Screen-by-screen flows |
| [ADMIN_PANEL_FLOWS.md](./ADMIN_PANEL_FLOWS.md) | Admin features |
| [SPRINT_PLAN.md](./SPRINT_PLAN.md) | Delivery timeline |
| [KVKK_AND_LEGAL_DRAFTS.md](./KVKK_AND_LEGAL_DRAFTS.md) | Legal draft texts |
