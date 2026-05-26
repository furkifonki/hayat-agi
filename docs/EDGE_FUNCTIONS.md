# Hayat Ağı — Edge Functions

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Overview

Edge Functions are Deno-based serverless handlers running on Supabase infrastructure. They handle **privileged operations** that require service role access or must not run on client devices.

**Location:** `supabase/functions/`  
**Shared utilities:** `supabase/functions/_shared/`

---

## 2. Function Inventory

| Function | Sprint | Status | Auth | Service Role |
|----------|--------|--------|------|--------------|
| `create-incident` | 3 | Stub | User JWT | Yes |
| `update-responder-location` | 5 | Planned | User JWT | Yes |
| `send-incident-notifications` | 6 | Planned | Internal | Yes |
| `accept-incident` | 7 | Planned | User JWT | Yes |
| `update-incident-responder-status` | 7 | Planned | User JWT | Yes |
| `close-incident` | 7 | Planned | User JWT | Yes |
| `verify-document-status` | 4 | Planned | Admin JWT | Yes |

---

## 3. Function Details

### 3.1 `create-incident`

**Path:** `supabase/functions/create-incident/index.ts`

**Responsibilities:**
- Authenticate caller via Supabase Auth JWT
- Validate request body (Zod)
- Verify user not blocked and has required consents
- Insert incident record with `status_112`
- Insert incident location (PostGIS geography via trigger)
- Log initial status event
- Trigger responder matching/notifications
- Optionally notify emergency contacts

**Environment:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (for user validation)
- `SUPABASE_SERVICE_ROLE_KEY` (for inserts)

**Current state:** Returns stub response; full logic in Sprint 3.

---

### 3.2 `update-responder-location`

**Responsibilities:**
- Verify responder is approved (or pending for location setup)
- Upsert `responder_locations` row
- Log availability change to `responder_availability_logs`
- Reject if user blocked or suspended

**Why Edge Function:** Ensures consistent validation; future rate limiting.

---

### 3.3 `send-incident-notifications`

**Responsibilities:**
- Load incident and location from DB
- Query eligible responders using PostGIS `ST_DWithin`
- Filter: approved, available, fresh location (<15 min), not blocked, not on other active incident
- Apply matching config from `system_settings`
- Create `incident_responders` rows (status: notified)
- Create `incident_notifications` rows
- Send batch Expo push notifications
- Update notification delivery status
- Handle escalation phases (full) or MVP simplified matching

**Auth:** Called internally from `create-incident` or via service role. Not exposed to mobile clients directly.

**PostGIS query pattern:**
```sql
ST_DWithin(responder.location, incident.location, radius_meters)
ORDER BY ST_Distance(responder.location, incident.location)
LIMIT max_responders
```

---

### 3.4 `accept-incident`

**Responsibilities:**
- Verify responder was notified for this incident
- Check max_responders not exceeded
- Update `incident_responders.status` → accepted
- Increment `incidents.accepted_responder_count`
- Update incident status if first acceptance
- Return exact location (citizen privacy gate passed on accept)
- Trigger citizen notification

---

### 3.5 `update-incident-responder-status`

**Responsibilities:**
- Validate responder owns assignment
- Update status: on_the_way, arrived, completed, declined
- Set timestamp fields (on_the_way_at, arrived_at, etc.)
- Propagate incident status changes (e.g., first on_the_way → responder_on_the_way)
- Log status events
- Notify relevant parties

---

### 3.6 `close-incident`

**Responsibilities:**
- Validate creator or admin
- Set incident status closed/cancelled
- Set closed_at, closed_reason or cancel_reason
- Optional final `status_112` update
- Mark pending notifications expired
- Complete/cancel responder assignments
- Stop location sharing for incident

---

### 3.7 `verify-document-status`

**Responsibilities:**
- Validate admin JWT + `private.is_admin`
- Approve or reject `responder_documents`
- Check if all required documents approved → update `responder_profiles.verification_status`
- Send verification push notification
- Write audit log entry

---

## 4. Shared Patterns

### 4.1 Auth Validation

```typescript
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await supabaseUser.auth.getUser();
```

### 4.2 Privileged Operations

```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Use for inserts/updates that bypass RLS or cross-user queries
```

### 4.3 CORS

All functions handle `OPTIONS` preflight. Shared headers in `_shared/cors.ts` (expand Sprint 3+).

---

## 5. Deployment

```bash
# From project root (requires Supabase CLI)
supabase functions deploy create-incident
supabase functions deploy update-responder-location
# ... etc

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for full setup.

---

## 6. Security Rules

1. Never return service role key in responses
2. Validate all inputs with Zod before DB operations
3. Log sensitive actions to `audit_logs`
4. Rate limit incident creation (Sprint 9)
5. Internal functions (`send-incident-notifications`) not callable by anon clients without verification

---

## 7. Related Documents

- [API_CONTRACTS.md](./API_CONTRACTS.md)
- [PUSH_NOTIFICATION_LOGIC.md](./PUSH_NOTIFICATION_LOGIC.md)
- [LOCATION_LOGIC.md](./LOCATION_LOGIC.md)
