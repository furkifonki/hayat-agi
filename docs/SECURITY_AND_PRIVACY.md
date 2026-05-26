# Hayat Ağı — Security and Privacy

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Security Philosophy

Hayat Ağı handles location data, optional health information, and professional credentials in emergency contexts. The architecture assumes:

1. **The Supabase anon key is public** — all protection is via RLS and Edge Functions
2. **The service role key bypasses RLS** — it must never ship in mobile or admin frontend
3. **Minimum necessary exposure** — users see only data required for their role and active incident state
4. **Server-side matching** — responder discovery never runs on the client

---

## 2. Row Level Security (RLS)

### 2.1 Universal Enablement

RLS is enabled on **all** public application tables (22 tables). No table is exposed without policies.

### 2.2 Authorization Model

| Mechanism | Usage |
|-----------|-------|
| `auth.uid()` | Current authenticated user |
| `private.is_admin()` | Admin operations; checks `profiles.is_admin AND NOT is_blocked` |
| `private.is_verified_responder()` | Responder-gated operations |
| `private.is_incident_creator()` | Incident owner checks |
| `private.is_incident_responder()` | Responder assignment checks with status threshold |
| `private.is_blocked()` | Deny blocked users |
| `private.has_active_incident_consent()` | Gate incident creation |

**Never use `auth.jwt() -> user_metadata` for authorization.** Admin status lives in `profiles.is_admin`, set only via admin SQL or admin panel.

### 2.3 Self-Promotion Prevention

`profiles_update_own` policy ensures users cannot change `is_admin` or `is_blocked` on their own row:

```sql
WITH CHECK (
  is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
  AND is_blocked = (SELECT p.is_blocked FROM profiles p WHERE p.id = auth.uid())
)
```

---

## 3. Service Role Key Policy

| Allowed | Forbidden |
|---------|-----------|
| Supabase Edge Functions (Deno env) | Expo mobile app |
| Server-side scripts (CI, migrations) | Next.js client bundle |
| Supabase Dashboard SQL | Git repositories |
| | `.env` files committed to git |

Edge Function pattern:
1. Validate user with anon client + user's JWT
2. Perform privileged writes with service role client
3. Return minimal response to client

---

## 4. Location Privacy

### 4.1 Citizen Location

| Rule | Implementation |
|------|----------------|
| Collected only at incident creation | Mobile requests permission in emergency flow |
| Not continuously tracked in MVP | No background location for citizens |
| Stored in `incident_locations` | RLS: creator + accepted responders + admin |
| Not in push notification body | Generic distance text only |

### 4.2 Responder Location

| Rule | Implementation |
|------|----------------|
| Collected when availability enabled | `update-responder-location` Edge Function |
| Stale after 15 minutes | Matching query filters `updated_at` |
| **Citizens cannot query** | No SELECT policy for other users on `responder_locations` |
| Matching server-side only | PostGIS in Edge Function with service_role |
| Stops when unavailable or incident closed | Client stops updates; status logged |

### 4.3 Location Disclosure Stages

| Stage | Who sees what |
|-------|---------------|
| Notification only | Responder sees push with approximate distance, no coordinates |
| App opened, pre-accept | Safety notice; approximate distance; no exact map pin |
| After accept | Exact location via `incident_locations` RLS (`accepted` status) |

---

## 5. Health Card Rules

Emergency health cards are **optional** and **disabled by default** (`is_enabled = false`).

### 5.1 Visibility

| Actor | Access |
|-------|--------|
| Owner | Full CRUD on own card |
| Responder (notified) | **No access** |
| Responder (accepted, active incident) | SELECT if `is_enabled = true` and incident not closed |
| Admin | SELECT for support/legal needs |
| Other citizens | **No access** |

### 5.2 RLS Policy

`health_cards_select_responder_accepted` joins `incidents` + `incident_responders` where responder status IN (`accepted`, `on_the_way`, `arrived`) and incident status NOT IN (`closed`, `cancelled`, `expired`).

### 5.3 Data Minimization

- Free-text fields (allergies, medications) — user-provided, optional
- No diagnostic data
- Not included in push notifications
- Consent type: `explicit_consent_health_data` required before enabling

---

## 6. Responder Document Security

| Rule | Detail |
|------|--------|
| Storage bucket | `responder-documents` — **private** |
| Path convention | `{user_id}/{document_type}/{filename}` |
| Client access | Owner upload/read own; admin read for review |
| Other users | No access |
| Public URLs | Never expose unsigned public URLs |

---

## 7. Push Notification Privacy

**Do NOT include in push payload:**
- Exact GPS coordinates
- Health card details
- Full incident description with PII
- Responder personal details

**Do include:**
- Generic incident type label
- Approximate distance (rounded)
- Safety-first language
- Deep link to app (incident ID in data payload only, not body)

---

## 8. Consent Architecture

Consents stored in `user_consents` with version tracking.

**Required before incident creation:**
- `kvkk_notice`
- `terms_of_use`
- `explicit_consent_location`

**Required before responder alerts:**
- Above + `responder_terms`

Enforced by:
- `private.has_active_incident_consent()` in RLS
- Edge Function validation (Sprint 3+)

---

## 9. Blocked User Handling

Blocked users (`profiles.is_blocked = true`):
- Cannot update profile (RLS)
- Cannot create incidents
- Cannot receive notifications (matching excludes)
- `private.is_blocked()` returns true → helper functions deny access

---

## 10. Audit Trail

| Table | Purpose |
|-------|---------|
| `incident_status_events` | Incident lifecycle audit |
| `responder_availability_logs` | Availability changes |
| `audit_logs` | Admin/system actions (service_role insert) |
| `user_consents` | Legal consent proof |
| `incident_notifications` | Push delivery audit |

---

## 11. Threat Model (MVP)

| Threat | Mitigation | Status |
|--------|------------|--------|
| Mass profile scraping | RLS: own profile only | ✅ |
| Responder location map | No citizen SELECT | ✅ |
| Health card exfiltration | RLS + incident scope | ✅ |
| Fake admin | RLS self-promotion block | ✅ |
| Service role in APK | Not bundled | ✅ |
| False incident spam | Rate limiting (planned Sprint 9) | ⏳ |
| Push spoofing | Expo server-side send only | ⏳ Sprint 6 |

---

## 12. Security Testing Checklist

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for full list. Key RLS tests:

```sql
-- As citizen: should return 0 rows
SELECT * FROM responder_locations;

-- As citizen: should not see others' health cards
SELECT * FROM emergency_health_cards WHERE user_id != auth.uid();

-- As blocked user: incident insert should fail
INSERT INTO incidents (created_by_user_id, incident_type, status_112)
VALUES (auth.uid(), 'unknown', 'unknown');
```

---

## 13. Related Documents

- [KVKK_AND_LEGAL_DRAFTS.md](./KVKK_AND_LEGAL_DRAFTS.md)
- [LOCATION_LOGIC.md](./LOCATION_LOGIC.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
