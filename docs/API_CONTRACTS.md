# Hayat Ağı — API Contracts (Edge Functions)

**Version:** 0.1.0  
**Last updated:** Sprint 1

All Edge Functions are Deno HTTP handlers deployed to Supabase. Base URL:

```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

**Authentication:** All user-facing endpoints require:

```
Authorization: Bearer <supabase_user_jwt>
Content-Type: application/json
```

**CORS:** Preflight `OPTIONS` returns `ok` with standard headers (see `supabase/functions/_shared/cors.ts`).

**Validation:** Request bodies validated with Zod. Shared schemas in `@hayat-agi/shared/validation/schemas.ts` where applicable.

**Error format:**

```json
{
  "error": "Human-readable message"
}
```

**Success responses:** JSON with `Content-Type: application/json`.

---

## 1. `create-incident`

**Status:** Stub (Sprint 3 full implementation)  
**Auth:** Authenticated citizen  
**Method:** `POST`

### Request

```typescript
{
  incident_type: IncidentType;           // e.g. "traffic_accident"
  reporter_relation?: ReporterRelation;  // default "self"
  affected_person_is_creator?: boolean;  // default true
  status_112: "called" | "not_called" | "unknown" | "unable_to_call";
  latitude: number;                      // -90 to 90
  longitude: number;                     // -180 to 180
  accuracy_meters?: number;
  description?: string;                  // max 1000 chars
  is_test?: boolean;
}
```

### Response (Target — Sprint 3)

```typescript
// 201 Created
{
  incident_id: string;       // uuid
  status: IncidentStatus;    // e.g. "notifying_responders"
  status_112: Status112;
  created_at: string;        // ISO 8601
  responders_notified: number;
}
```

### Current Stub Response (Sprint 1)

```json
{
  "message": "Stub — implement in Sprint 3",
  "user_id": "<uuid>",
  "payload": { /* echoed request */ }
}
```

### Errors

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid JWT |
| 403 | Blocked user or missing consents |
| 400 | Validation failure |
| 429 | Rate limit (planned Sprint 9) |

### Server Actions (Sprint 3)
1. Validate user not blocked
2. Validate `has_active_incident_consent`
3. Insert `incidents` row
4. Insert `incident_locations` row
5. Insert `incident_status_events`
6. Invoke `send-incident-notifications`
7. Notify emergency contacts if configured
8. Return incident summary

---

## 2. `update-responder-location`

**Status:** Planned Sprint 5  
**Auth:** Verified responder  
**Method:** `POST`

### Request

```typescript
{
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  availability_status: "available" | "unavailable" | "busy" | "on_incident" | "suspended";
}
```

### Response

```typescript
// 200 OK
{
  user_id: string;
  availability_status: AvailabilityStatus;
  updated_at: string;
  location_stale: boolean;  // true if > 15 min old after update (always false on fresh update)
}
```

### Server Actions
1. Upsert `responder_locations`
2. If status changed → insert `responder_availability_logs`
3. Sync PostGIS geography via trigger

### Errors

| Status | Condition |
|--------|-----------|
| 403 | Not verified responder or blocked |
| 400 | Invalid coordinates |

---

## 3. `send-incident-notifications`

**Status:** Planned Sprint 6  
**Auth:** Internal (service role or function-to-function)  
**Method:** `POST`

### Request

```typescript
{
  incident_id: string;       // uuid
  force_phase?: number;      // optional escalation override
}
```

### Response

```typescript
{
  incident_id: string;
  responders_notified: number;
  notification_ids: string[];
  phase_applied: number;
  radius_meters: number;
}
```

### Server Actions
1. Load incident location
2. PostGIS query eligible responders
3. Insert `incident_responders` (status: notified)
4. Insert `incident_notifications` (status: queued)
5. Send Expo push batch
6. Update notification statuses (sent/failed)
7. Update incident status → `notifying_responders`

---

## 4. `accept-incident`

**Status:** Planned Sprint 7  
**Auth:** Verified, notified responder  
**Method:** `POST`

### Request

```typescript
{
  incident_id: string;  // uuid
}
```

### Response

```typescript
{
  incident_id: string;
  responder_status: "accepted";
  incident: {
    incident_type: IncidentType;
    status: IncidentStatus;
    status_112: Status112;
    description: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy_meters: number | null;
  };
  accepted_responder_count: number;
  max_responders: number;
}
```

### Errors

| Status | Condition |
|--------|-----------|
| 403 | Not notified, not verified, or blocked |
| 409 | Max responders reached |
| 410 | Incident closed/cancelled/expired |

### Server Actions
1. Validate `incident_responders` row exists with status notified/viewed
2. Check `accepted_responder_count < max_responders`
3. Update status → accepted, set accepted_at
4. Increment `incidents.accepted_responder_count`
5. Update incident status if first accept
6. Notify citizen (responder_accepted)
7. Return exact location

---

## 5. `update-incident-responder-status`

**Status:** Planned Sprint 7  
**Auth:** Assigned responder  
**Method:** `POST`

### Request

```typescript
{
  incident_id: string;
  status: "on_the_way" | "arrived" | "completed" | "declined";
  decline_reason?: string;  // required if declined
}
```

### Response

```typescript
{
  incident_id: string;
  responder_status: string;
  incident_status: IncidentStatus;  // may update e.g. responder_on_the_way
  timestamp: string;
}
```

---

## 6. `close-incident`

**Status:** Planned Sprint 7  
**Auth:** Incident creator or admin  
**Method:** `POST`

### Request

```typescript
{
  incident_id: string;
  closed_reason: string;     // 1-500 chars
  status_112?: Status112;   // optional final 112 update
  cancel?: boolean;          // true → cancelled instead of closed
  cancel_reason?: string;    // if cancel=true
}
```

### Response

```typescript
{
  incident_id: string;
  status: "closed" | "cancelled";
  closed_at: string;
}
```

### Server Actions
1. Validate creator or admin
2. Set status, closed_at, closed_reason/cancel_reason
3. Insert status event
4. Cancel pending notifications
5. Set responder assignments to completed/cancelled_by_system

---

## 7. `verify-document-status`

**Status:** Planned Sprint 4  
**Auth:** Admin only  
**Method:** `POST`

### Request

```typescript
{
  document_id: string;
  action: "approve" | "reject";
  rejection_reason?: string;  // required if reject
}
```

### Response

```typescript
{
  document_id: string;
  status: "approved" | "rejected";
  responder_verification_status: VerificationStatus;
  all_required_approved: boolean;
}
```

---

## 8. Shared Types Reference

Import from `@hayat-agi/shared`:

- `CreateIncidentInput` — create-incident
- `UpdateResponderLocationInput` — update-responder-location (schema name: updateResponderLocationSchema)
- `AcceptIncidentInput` — accept-incident
- `CloseIncidentInput` — close-incident
- `Status112` — `'called' | 'not_called' | 'unknown' | 'unable_to_call'`

> Database column name: **`status_112`** (API uses same name for consistency).

---

## 9. Client Invocation Example (Mobile)

```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/create-incident`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      incident_type: 'traffic_accident',
      status_112: 'called',
      latitude: 41.0082,
      longitude: 28.9784,
      accuracy_meters: 12,
    }),
  },
);
```

Alternatively, use `supabase.functions.invoke('create-incident', { body })`.

---

## 10. Related Documents

- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)
- [INCIDENT_LIFECYCLE.md](./INCIDENT_LIFECYCLE.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
