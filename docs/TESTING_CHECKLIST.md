# Hayat Ağı — Testing Checklist

**Version:** 0.1.0  
**Last updated:** Sprint 1

Use this checklist for manual QA during and after each sprint. Mark items with sprint when they become testable.

---

## 1. Environment Prerequisites

- [ ] Supabase project created and migration applied
- [ ] Mobile `.env` configured with URL + anon key
- [ ] Admin `.env.local` configured
- [ ] At least one admin user promoted via SQL
- [ ] Expo Go or simulator available

---

## 2. Mobile — Authentication (Sprint 1)

- [ ] Welcome screen displays correctly
- [ ] Safety screen shows 112 disclaimer
- [ ] Register with valid email/password creates account
- [ ] Profile auto-created in `profiles` table (trigger)
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Logout clears session and returns to welcome
- [ ] Protected routes redirect unauthenticated users

---

## 3. Mobile — Profile & Consent (Sprint 1)

- [ ] Profile setup requires full_name and phone
- [ ] Profile updates persist in database
- [ ] Consent screen blocks continue without required checkboxes
- [ ] Required consents recorded in `user_consents`:
  - [ ] kvkk_notice
  - [ ] terms_of_use
  - [ ] explicit_consent_location
- [ ] Optional push consent recorded when checked
- [ ] After consent, user reaches home screen
- [ ] Re-login skips consent if already recorded

---

## 4. Mobile — Emergency Flows (Sprint 3+)

- [ ] Emergency button requires press-and-hold (no accidental tap)
- [ ] Emergency type selector shows all 11 types
- [ ] Location permission explanation displayed before request
- [ ] GPS location captured when permission granted
- [ ] Manual pin fallback when permission denied
- [ ] 112 guidance screen shown with three options
- [ ] `status_112` saved correctly for each option
- [ ] create-incident returns incident_id
- [ ] Active incident screen shows status timeline
- [ ] Call 112 button opens phone dialer (tel:112)
- [ ] False alarm cancel records cancel_reason
- [ ] Bystander flow sets reporter_relation = bystander

---

## 5. Mobile — Responder (Sprint 4–7)

- [ ] Responder onboarding form validates required fields
- [ ] Document upload to private bucket succeeds
- [ ] Unapproved responder cannot enable availability
- [ ] Unapproved responder does not receive push alerts
- [ ] Availability toggle updates responder_locations
- [ ] Location consent explanation shown before enabling
- [ ] Push notification received for nearby incident
- [ ] Safety notice shown before incident details
- [ ] Approximate distance shown pre-accept (no exact pin)
- [ ] Accept shows exact location on map
- [ ] Status buttons update incident_responders timestamps
- [ ] Max responders message when capacity reached
- [ ] Decline records decline_reason

---

## 6. Admin Panel (Sprint 8)

- [ ] Non-admin user cannot access dashboard
- [ ] Admin login succeeds
- [ ] Active incidents appear on map
- [ ] Incident detail shows timeline and responders
- [ ] Document review queue lists pending uploads
- [ ] Approve document updates verification_status
- [ ] Reject requires rejection_reason
- [ ] Block user prevents incident creation
- [ ] Abuse reports manageable
- [ ] Audit logs visible and filterable

---

## 7. Database & RLS Tests

Run with Supabase SQL Editor impersonating users or via client SDK.

### 7.1 Citizen Isolation
- [ ] Citizen can read own profile only
- [ ] Citizen cannot read other profiles
- [ ] Citizen cannot SELECT from responder_locations
- [ ] Citizen cannot read others' emergency_health_cards
- [ ] Citizen cannot read responder_documents

### 7.2 Incident Access
- [ ] Creator can read own incidents
- [ ] Creator cannot read unrelated incidents
- [ ] Notified responder can read incident (limited)
- [ ] Notified responder cannot read exact incident_locations (RLS)
- [ ] Accepted responder can read incident_locations
- [ ] Blocked user cannot INSERT incidents

### 7.3 Health Card
- [ ] Owner can CRUD own health card
- [ ] Notified (not accepted) responder cannot read health card
- [ ] Accepted responder can read during active incident if is_enabled
- [ ] Health card not readable after incident closed

### 7.4 Admin
- [ ] Admin can read all profiles
- [ ] Admin can read all incidents
- [ ] Admin can read responder_documents
- [ ] Non-admin cannot read audit_logs

### 7.5 Verification Queries
```sql
-- RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- status_112 column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'incidents' AND column_name = 'status_112';

-- PostGIS active
SELECT extname FROM pg_extension WHERE extname = 'postgis';
```

---

## 8. Security Tests

- [ ] Service role key NOT present in mobile bundle (grep build output)
- [ ] Service role key NOT in admin client code
- [ ] Push notification body contains no GPS coordinates
- [ ] Push notification body contains no health data
- [ ] User cannot self-set is_admin via profile update
- [ ] Responder documents bucket is private (no public URL access)
- [ ] create-incident rejects unauthenticated requests (401)

---

## 9. Edge Function Tests (Sprint 3+)

- [ ] create-incident: valid payload returns incident_id
- [ ] create-incident: missing consent returns 403
- [ ] create-incident: invalid lat/lng returns 400
- [ ] update-responder-location: unverified user returns 403
- [ ] accept-incident: max responders returns 409
- [ ] close-incident: non-creator non-admin returns 403

---

## 10. Push Notification Tests (Sprint 6+)

- [ ] Token registered in push_tokens on consent + permission
- [ ] Token marked inactive on invalid Expo response
- [ ] incident_notifications row created with status queued → sent
- [ ] Notification tap navigates to correct incident
- [ ] Failed delivery logged with error_message

---

## 11. Location Tests (Sprint 5+)

- [ ] Responder location older than 15 min excluded from matching
- [ ] Availability OFF stops location updates
- [ ] PostGIS geography synced from lat/lng trigger
- [ ] ST_DWithin query returns expected responders in test data

---

## 12. Regression — Sprint 1 Smoke Test

Quick validation after any change:

1. `npm install` from root succeeds
2. `npm run mobile` starts Expo
3. Register → profile setup → consent → home
4. Verify profile row in Supabase Dashboard
5. Verify user_consents rows exist
6. `npm run admin` starts on port 3001

---

## 13. Related Documents

- [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
