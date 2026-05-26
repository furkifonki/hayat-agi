# Hayat Ağı — Known Limitations (MVP)

**Version:** 0.1.0  
**Last updated:** Sprint 2

This document tracks intentional MVP limitations and incomplete features. Review before pilot deployment.

---

## 1. Product Limitations

| Limitation | Detail | Target Sprint |
|------------|--------|---------------|
| Not a 112 replacement | App cannot dispatch ambulances or guarantee responder arrival | Permanent |
| No medical diagnosis | Platform coordinates volunteers only | Permanent |
| Turkish primary UI | Multi-language support not implemented | Post-MVP |
| Email/password auth only | No phone OTP or social login | Post-MVP |
| No in-app messaging | `incident_messages` table exists; UI disabled | TBD |
| No organization accounts | Schema ready; admin UI not built | Post-MVP |

---

## 2. Feature Gaps (By Sprint)

### Not Yet Implemented

| Feature | Current State | Sprint |
|---------|---------------|--------|
| Emergency button & incident creation | Hold UX works; no real incident yet | 3 |
| create-incident full logic | Stub response | 3 |
| Responder onboarding | Not started | 4 |
| Document upload & review | Not started | 4 |
| Availability toggle & location | Not started | 5 |
| Push notifications | Not started | 6 |
| Responder matching (PostGIS) | Not started | 6 |
| Accept/respond lifecycle | Not started | 7 |
| Admin dashboard | Placeholder page | 8 |
| Legal document DB versioning | Table exists; no UI | 9 |
| Rate limiting on incidents | Not implemented | 9 |
| Incident expiration timeout | Not implemented | 7+ |

---

## 3. Technical Limitations

### 3.1 Location
- **Foreground only:** No background location tracking for responders in MVP
- **15-minute staleness:** Responder location older than 15 minutes excluded from matching
- **No continuous citizen tracking:** Location captured once at incident creation
- **Manual pin fallback:** UI not built until Sprint 3

### 3.2 Matching
- **MVP simplified matching:** Single phase 1 km / max 10 responders (escalation phases documented but not active)
- **No ML-based matching:** Pure distance-based PostGIS query
- **No responder skill matching:** All approved responders treated equally by type

### 3.3 Notifications
- **Expo Push only:** No direct FCM/APNs integration
- **No SMS fallback:** Emergency contacts not notified via SMS in MVP
- **Push requires physical device:** Expo Go push limitations on simulators

### 3.4 Edge Functions
- Only `create-incident` exists (stub)
- Remaining 6 functions documented but not deployed
- No function-to-function auth hardening beyond service role

### 3.5 Realtime
- No Realtime subscriptions implemented yet
- Active incident updates require manual refresh until Sprint 7

---

## 4. Security & Privacy Limitations

| Limitation | Risk | Mitigation Plan |
|------------|------|-----------------|
| Direct incident INSERT allowed via RLS | Client could bypass Edge Function | Prefer Edge Function in Sprint 3; tighten RLS in Sprint 9 |
| No rate limiting | False alarm spam | Sprint 9 |
| Legal texts are drafts | Legal compliance | Legal review before production |
| No automated retention deletion | Data accumulation | Sprint 9 retention jobs |
| Storage RLS not in migration | Bucket access misconfiguration | Manual setup + verify in Sprint 4 |
| Audit log insert client-side blocked | Good — but limited server logging until Edge Functions complete | Sprint 3+ |

---

## 5. Database Notes

- **`status_112` naming:** Column is `status_112` (not `112_status`) — intentional for SQL compatibility
- **Organizations tables:** Created but unused in MVP
- **Admin notes:** Created but no admin UI
- **system_settings:** Readable by all authenticated users (matching config visible)

---

## 6. Admin Panel Limitations

- Placeholder landing page only
- No authentication gate yet
- No map, review queue, or moderation tools
- Admin must use Supabase Dashboard for all operations

---

## 7. Mobile UI Limitations

- No tab navigation yet
- No Inter font loaded yet (system font fallback)
- Emergency button not implemented
- No maps integration
- No offline support
- No deep linking for notification taps

---

## 8. Testing Limitations

- No automated test suite (unit/integration/e2e)
- Manual testing checklist only
- No CI/CD pipeline configured
- No staging environment documented

---

## 9. Deployment Limitations

- No EAS build configuration
- Edge Functions not deployed by default
- No production environment variable management documented beyond examples
- No monitoring/alerting (Sentry, etc.)

---

## 10. Assumptions

1. Users have internet connectivity for incident creation
2. Responders use modern smartphones with GPS
3. Expo Push tokens valid for MVP scale
4. Supabase free/pro tier sufficient for pilot
5. Admin users are trusted and manually vetted

---

## 11. Related Documents

- [SPRINT_PLAN.md](./SPRINT_PLAN.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
