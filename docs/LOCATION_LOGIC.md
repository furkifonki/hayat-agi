# Hayat Ağı — Location Logic

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Principles

1. **No hidden tracking** — location collected only with explicit consent and clear purpose
2. **No always-on background tracking in MVP** — foreground updates only
3. **Citizens:** location at incident creation only
4. **Responders:** location when availability mode enabled or incident accepted
5. **Server-side matching** — PostGIS queries in Edge Functions, never on client
6. **Stale location rejected** — 15-minute freshness threshold for matching

---

## 2. Data Model

### 2.1 Tables

| Table | Who | When |
|-------|-----|------|
| `incident_locations` | Citizen/bystander | Incident creation (+ optional updates while active) |
| `responder_locations` | Verified responder | Availability toggle, app foreground, incident accept |
| `responder_availability_logs` | Responder | Status change snapshots |

### 2.2 Fields

```
latitude: double precision
longitude: double precision
accuracy_meters: double precision (GPS accuracy)
location: geography(Point, 4326)  -- auto-synced via trigger
updated_at / created_at: timestamptz
permission_scope: foreground | background | none  (responders only)
source: gps | manual | map_pin | last_known  (incidents only)
```

### 2.3 PostGIS Sync Trigger

`sync_geography_from_lat_lng()` runs BEFORE INSERT/UPDATE:

```sql
ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
```

GIST indexes on all geography columns for efficient spatial queries.

---

## 3. Citizen Location Flow

### 3.1 When Collected
- Emergency button flow (Step 2: Location)
- Report accident flow
- Optional: manual map pin if GPS denied

### 3.2 When NOT Collected
- App idle / home screen
- Background (MVP)
- After incident closed

### 3.3 Permission UX
```
Show LocationPermissionCard:
  "Konumunuz yalnızca bu acil durum çağrısı için paylaşılacaktır.
   Sürekli takip yapılmaz."

Request: expo-location foreground permission
  └─ Granted → getCurrentPositionAsync()
  └─ Denied → offer manual pin on map
```

### 3.4 Storage
Insert into `incident_locations` via `create-incident` Edge Function:
- `source = 'gps'` or `'manual'` or `'map_pin'`
- Single row at creation; optional additional rows if user re-confirms location

### 3.5 Visibility (RLS)
| Actor | Access |
|-------|--------|
| Creator | Full read |
| Notified responder | **No exact location** |
| Accepted responder | Full read |
| Admin | Full read |

Approximate distance shown to notified responders (computed server-side, not raw coordinates).

---

## 4. Responder Location Flow

### 4.1 When Collected
- Availability toggle ON
- App returns to foreground while available
- Incident accept action
- Periodic refresh while available (foreground only, MVP: on app open)

### 4.2 When NOT Collected
- Availability OFF
- User blocked or suspended
- Verification not approved
- After disabling availability

### 4.3 Permission UX
```
"Yardımcı Modu açıkken konumunuz yakınınızdaki acil çağrıları
 alabilmeniz için kullanılacaktır. Sürekli takip yapılmaz."
```

Request foreground location permission only (MVP).

### 4.4 Update Mechanism
Mobile → `update-responder-location` Edge Function → upsert `responder_locations`

Also logs to `responder_availability_logs` when `availability_status` changes.

### 4.5 Staleness Rule

```typescript
const STALE_MINUTES = 15;
const isStale = (updatedAt: Date) =>
  Date.now() - updatedAt.getTime() > STALE_MINUTES * 60 * 1000;
```

Stale locations excluded from matching query. Configurable via `system_settings.incident_matching.location_stale_minutes`.

---

## 5. Matching Query (Edge Function)

```sql
-- Pseudocode for send-incident-notifications
WITH incident_point AS (
  SELECT location FROM incident_locations
  WHERE incident_id = $1
  ORDER BY created_at DESC LIMIT 1
)
SELECT
  rl.user_id,
  ST_Distance(rl.location, ip.location) AS distance_meters
FROM responder_locations rl
JOIN responder_profiles rp ON rp.user_id = rl.user_id
JOIN profiles p ON p.id = rl.user_id
CROSS JOIN incident_point ip
WHERE rp.verification_status = 'approved'
  AND rp.accepted_responder_terms = true
  AND rl.availability_status = 'available'
  AND rl.location IS NOT NULL
  AND rl.updated_at > now() - interval '15 minutes'
  AND p.is_blocked = false
  AND ST_DWithin(rl.location, ip.location, $radius_meters)
  AND NOT EXISTS (
    SELECT 1 FROM incident_responders ir
    JOIN incidents i ON i.id = ir.incident_id
    WHERE ir.responder_user_id = rl.user_id
      AND ir.status IN ('accepted','on_the_way','arrived')
      AND i.status NOT IN ('closed','cancelled','expired')
  )
ORDER BY distance_meters ASC
LIMIT $max_responders;
```

---

## 6. Distance Display

| Context | Precision |
|---------|-----------|
| Push notification body | Rounded to nearest 50m ("Yaklaşık 650 m") |
| Responder alert card (pre-accept) | Same rounded distance |
| Responder detail (post-accept) | Exact map pin |
| Citizen view | Own location exact |

Distance stored in `incident_responders.distance_meters` at notification time.

---

## 7. Escalation Radii

From `system_settings.incident_matching`:

| Phase | Radius | Max Responders | Wait |
|-------|--------|----------------|------|
| 1 | 500 m | 3 | 30 s |
| 2 | 1000 m | 5 | 60 s |
| 3 | 3000 m | 10 | 120 s |

**MVP simplified:** `mvp_simplified_matching.enabled = true` → single phase 1000 m, max 10.

---

## 8. Location After Incident Close

| Data | Retention |
|------|-----------|
| incident_locations | Retained per policy (see KVKK drafts) |
| responder_locations | Continues updating if availability ON |
| Active sharing | Stops for closed incident context |

Responders set `availability_status = available` again after completing involvement (or `on_incident` during active response).

---

## 9. Fallback: Haversine

If PostGIS unavailable (should not happen — extension required in migration), Edge Function can compute Haversine distance in TypeScript. **PostGIS is the preferred and implemented approach.**

---

## 10. Security Summary

- Citizens **cannot** SELECT from `responder_locations` (RLS)
- Matching runs with service_role in Edge Function only
- Exact incident coordinates hidden from notified-but-not-accepted responders
- No coordinates in push notifications

---

## 11. Related Documents

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)
