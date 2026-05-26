# Hayat Ağı — Push Notification Logic

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Overview

MVP uses **Expo Push Notifications** (`expo-notifications` + Expo Push API). Tokens stored in `push_tokens`; delivery logged in `incident_notifications`.

**Principle:** Notifications are informational and safety-first. Never pressure responders with aggressive language or expose sensitive data in notification body.

---

## 2. Token Registration Flow (Sprint 6)

```
User accepts push consent (optional at onboarding)
  └─ Request device notification permission (OS)
  └─ expo-notifications.getExpoPushTokenAsync()
  └─ Upsert push_tokens row:
       user_id, expo_push_token, platform, device_id, is_active=true
  └─ On logout: set is_active=false (do not delete immediately)
```

**Re-registration:** On app launch, verify token still valid; update if changed.

---

## 3. Notification Categories

| `notification_type` | Recipient | Trigger |
|---------------------|-----------|---------|
| `incident_nearby` | Verified available responder | New incident within radius |
| `incident_update` | Citizen or involved responder | Status change |
| `responder_accepted` | Citizen (incident creator) | Responder accepts |
| `responder_arrived` | Citizen | Responder marks arrived |
| `emergency_contact_alert` | Emergency contact (future) | Incident created, notify_on_incident=true |
| `verification_approved` | Responder | Admin approves documents |
| `verification_rejected` | Responder | Admin rejects with reason |

---

## 4. Copy Guidelines

### 4.1 Do NOT Say
- "Yakında kaza var, hemen git."
- "Acil müdahale gerekli, koş!"
- Include exact address or GPS in body
- Include health card details

### 4.2 Do Say

**Generic nearby alert:**
- **Title:** Yakınınızda acil destek çağrısı var
- **Body:** Yaklaşık 650 m mesafede bir acil durum bildirildi. Müsaitseniz ve güvenliyse detayları görüntüleyebilirsiniz.

**Traffic accident:**
- **Title:** Yakınınızda trafik kazası bildirildi
- **Body:** Güvenliğinizden emin olmadan olay yerine yaklaşmayın. Detayları görüntüleyebilmek için dokunun.

**Responder accepted (citizen):**
- **Title:** Gönüllü yola çıktı
- **Body:** Doğrulanmış bir gönüllü çağrınızı kabul etti. 112'yi aradığınızdan emin olun.

**Verification approved:**
- **Title:** Doğrulama tamamlandı
- **Body:** Yardımcı profiliniz onaylandı. Müsait modunu açarak yakındaki çağrıları alabilirsiniz.

---

## 5. Delivery Pipeline

```
Edge Function: send-incident-notifications
  │
  ├─ 1. Select eligible push_tokens (is_active=true)
  ├─ 2. Insert incident_notifications (status: queued)
  ├─ 3. Build Expo push messages
  ├─ 4. POST https://exp.host/--/api/v2/push/send
  ├─ 5. Update status: sent | failed
  └─ 6. Store error_message on failure
```

**Batching:** Expo supports batch send; chunk at 100 messages per request.

**Optional secret:** `EXPO_ACCESS_TOKEN` for higher rate limits.

---

## 6. Payload Structure

```typescript
{
  to: "ExponentPushToken[xxxx]",
  title: "Yakınınızda acil destek çağrısı var",
  body: "Yaklaşık 650 m mesafede...",
  data: {
    type: "incident_nearby",
    incident_id: "uuid",        // OK in data payload, NOT in body
    // NO latitude/longitude in data for pre-accept notifications
  },
  sound: "default",
  priority: "high",
  channelId: "emergency",       // Android channel
}
```

**Deep link:** Mobile app reads `data.incident_id` on notification tap → navigates to safety gate screen.

---

## 7. Responder Notification Eligibility

Push sent only if ALL true:
- `responder_profiles.verification_status = approved`
- `responder_profiles.accepted_responder_terms = true`
- `responder_locations.availability_status = available`
- Location updated within 15 minutes
- `profiles.is_blocked = false`
- User has active push token
- User consented to `push_notifications` (recommended check)
- Within matching radius
- Not already assigned to another active incident

---

## 8. Citizen Notifications

| Event | Push? |
|-------|-------|
| Responder accepted | Yes |
| Responder on the way | Yes |
| Responder arrived | Yes |
| No responders found (timeout) | Yes — include 112 reminder |
| Incident closed | Optional |

---

## 9. Failure Handling

| Failure | Action |
|---------|--------|
| Invalid token | Mark push_token is_active=false |
| Expo API error | Retry once; then status=failed |
| User disabled OS notifications | Log; no retry |
| Incident closed before send | status=expired |

---

## 10. Android Notification Channels

| Channel ID | Name | Importance |
|------------|------|------------|
| `emergency` | Acil Bildirimler | HIGH |
| `updates` | Olay Güncellemeleri | DEFAULT |
| `verification` | Doğrulama | DEFAULT |

---

## 11. Privacy Checklist

- [ ] No GPS coordinates in title/body
- [ ] No health data in any field
- [ ] No full name of citizen in responder push
- [ ] incident_id only in data payload
- [ ] Generic distance (rounded to nearest 50m)

---

## 12. Implementation Status

| Component | Sprint | Status |
|-----------|--------|--------|
| push_tokens table | 1 | ✅ |
| incident_notifications table | 1 | ✅ |
| Mobile token registration | 6 | ⏳ |
| send-incident-notifications | 6 | ⏳ |
| Notification tap handling | 6 | ⏳ |

---

## 13. Related Documents

- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)
- [API_CONTRACTS.md](./API_CONTRACTS.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
