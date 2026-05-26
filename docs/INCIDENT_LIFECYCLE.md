# Hayat Ağı — Incident Lifecycle

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Overview

An **incident** represents a single emergency support request. Its lifecycle is tracked in `incidents.status` with a full audit trail in `incident_status_events` and participant state in `incident_responders`.

**Key fields:**
- `status` — incident lifecycle state
- `status_112` — whether 112 was called (`called`, `not_called`, `unknown`, `unable_to_call`)
- `accepted_responder_count` / `max_responders` — capacity control (default max: 3)

---

## 2. Status State Machine

```
                    ┌─────────────┐
                    │   created   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  locating   │ (optional transient)
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  notifying_responders   │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │  responder_assigned     │ (≥1 accepted)
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │ responder_on_the_way    │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   responder_arrived     │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   ambulance_arrived     │ (optional)
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │   closed    │   │  cancelled  │   │   expired   │
  └─────────────┘   └─────────────┘   └─────────────┘
```

### 2.1 Status Definitions

| Status | Meaning | Typical Trigger |
|--------|---------|-----------------|
| `created` | Incident record inserted | create-incident |
| `locating` | Acquiring/refining location | Optional transient state |
| `notifying_responders` | Matching and push in progress | send-incident-notifications |
| `responder_assigned` | At least one responder accepted | accept-incident |
| `responder_on_the_way` | Responder marked en route | update-incident-responder-status |
| `responder_arrived` | Responder at scene | update-incident-responder-status |
| `ambulance_arrived` | Official help arrived | Creator or responder update |
| `closed` | Incident resolved normally | close-incident |
| `cancelled` | False alarm or user cancel | close-incident (cancel=true) |
| `expired` | No response within timeout | System job (planned) |

---

## 3. Responder Assignment Lifecycle

Separate state machine in `incident_responders.status`:

```
notified → viewed → accepted → on_the_way → arrived → completed
                 ↘ declined
                 ↘ cancelled_by_system (incident closed/expired)
```

| Status | Meaning |
|--------|---------|
| `notified` | Push sent, row created by matching |
| `viewed` | Responder opened detail (optional tracking) |
| `accepted` | Responder committed after safety gate |
| `declined` | Responder chose not to participate |
| `on_the_way` | En route to scene |
| `arrived` | At scene |
| `completed` | Responder finished involvement |
| `cancelled_by_system` | Incident closed while notified/accepted |

---

## 4. Creation Flow

```
Citizen completes emergency flow
  └─ create-incident Edge Function
       ├─ INSERT incidents (status: created → notifying_responders)
       ├─ INSERT incident_locations
       ├─ INSERT incident_status_events
       ├─ SET status_112 from user input
       └─ INVOKE send-incident-notifications
```

**Bystander variant:**
- `affected_person_is_creator = false`
- `reporter_relation = bystander`

**Test incidents:**
- `is_test = true` — excluded from production metrics; visible to admins

---

## 5. 112 Status Tracking

Column: **`status_112`** (not `112_status`)

| Value | Set When |
|-------|----------|
| `called` | User taps "112 Arandı" |
| `not_called` | User skips or selects not called |
| `unknown` | Default / user selects "Emin değilim" |
| `unable_to_call` | User selects "Şu an arayamıyorum" |

Can be updated at close time via `close-incident` optional `status_112` field.

**UX requirement:** If `status_112 != called`, show persistent 112 reminder on active incident screen.

---

## 6. Responder Capacity

- `max_responders` default: **3** (configurable per incident, max 10)
- `accepted_responder_count` incremented on each accept
- When count >= max: new responders see capacity message; accept-incident returns 409

**Message:** "Bu çağrı için yeterli sayıda gönüllü yolda. Yine de 112 aranmamışsa bildirim sahibini yönlendirin."

---

## 7. Cancellation (False Alarm)

```
User taps "Yanlış Alarm İptal"
  └─ Select reason:
       mistaken_tap | situation_resolved | duplicate | other
  └─ close-incident (cancel=true, cancel_reason)
  └─ status → cancelled
  └─ Notify assigned responders
  └─ Log to incident_status_events + audit
```

Repeated cancellations may trigger abuse review (see KVKK_AND_LEGAL_DRAFTS.md).

---

## 8. Normal Closure

```
Creator taps "Olayı Kapat"
  └─ Enter closed_reason
  └─ Optional final status_112 update
  └─ status → closed, closed_at = now()
  └─ All active responder assignments → completed
  └─ Pending notifications → expired
```

Admin can force-close via admin panel (Sprint 8).

---

## 9. Expiration (Planned)

If no responder accepts within configured timeout (e.g., 30 minutes):
- status → `expired`
- Citizen notified with 112 emphasis
- Logged as system event

Not implemented in Sprint 1.

---

## 10. Timeline UI Mapping

Mobile Active Incident screen displays:

| Step | Status Trigger |
|------|----------------|
| Oluşturuldu | created |
| Konum paylaşıldı | incident_locations inserted |
| Gönüllüler bilgilendirildi | notifying_responders |
| Gönüllü kabul etti | responder_assigned |
| Yolda | responder_on_the_way |
| Olay yerine varıldı | responder_arrived |
| Ambulans geldi | ambulance_arrived |
| Kapatıldı | closed / cancelled |

Data source: `incident_status_events` ordered by `created_at`.

---

## 11. Realtime Updates (Sprint 7)

Subscribe to:
- `incidents` WHERE id = active_incident_id
- `incident_responders` WHERE incident_id = active_incident_id

RLS ensures only involved parties receive updates.

---

## 12. Admin Visibility

Admins can view all incidents and transitions regardless of involvement (RLS `incidents_select_admin`).

---

## 13. Related Documents

- [API_CONTRACTS.md](./API_CONTRACTS.md)
- [MOBILE_APP_FLOWS.md](./MOBILE_APP_FLOWS.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
