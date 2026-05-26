# Hayat Ağı — Mobile App Flows

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Navigation Architecture

Expo Router file-based routing with auth gate at `app/index.tsx`.

```
Unauthenticated → (auth)/
Authenticated, incomplete profile → (app)/profile-setup
Authenticated, missing consents → (auth)/consent
Authenticated, complete → (app)/home
```

**Future (Sprint 2+):** Tab navigator for Citizen (Home, Incidents, Contacts, Profile) and Responder (Home, Alerts, Availability, Documents) with role switcher.

---

## 2. Onboarding Flow

### 2.1 Welcome (`/(auth)/welcome`)
- **Title:** Hayat Ağı'na Hoş Geldiniz
- **Body:** "Ambulans gelene kadar geçen kritik dakikalarda, yakınınızdaki doğrulanmış gönüllü destek ağıyla bağlantı kurun."
- **Actions:** Hesap Oluştur → register | Giriş Yap → login

### 2.2 Safety Explanation (`/(auth)/safety`)
- **Body:** 112 disclaimer — Hayat Ağı resmi acil servisin yerine geçmez
- **Action:** Devam Et

### 2.3 Register (`/(auth)/register`)
- Fields: email, password, full_name, phone (optional), role_intention
- Role intention: citizen | healthcare professional | certified first aider
- Creates Supabase Auth user → triggers profile creation

### 2.4 Login (`/(auth)/login`)
- Fields: email, password
- Redirects based on profile/consent state

### 2.5 Consent (`/(auth)/consent`) — Sprint 1 ✅
- Required: KVKK Aydınlatma, Kullanım Şartları, Konum Açık Rızası
- Optional: Push bildirimleri
- Records to `user_consents` via `auth-service`
- Draft legal footer displayed

### 2.6 Profile Setup (`/(app)/profile-setup`) — Sprint 1 ✅
- Required: full_name, phone
- Optional: city, date_of_birth
- Updates `profiles` row

---

## 3. Citizen Flows

### 3.1 Home (`/(app)/home`)

**Current (Sprint 1):** Placeholder with sprint status.

**Target (Sprint 2–3):**
- Greeting + safety status card
- **ACİL YARDIM ÇAĞIR** — press-and-hold 3 seconds
- Secondary grid:
  - 112'yi Ara (tel:112 deep link)
  - Bir Kazayı Bildir
  - Acil Kişilerim
  - Sağlık Kartım

### 3.2 Emergency Creation Flow (Sprint 3)

```
Step 1: Emergency Type
  └─ Bottom sheet: 11 types + "Emin değilim"

Step 2: Location
  └─ Permission request
  └─ GPS capture OR manual pin
  └─ Copy: "Konumunuz yalnızca bu acil durum çağrısı için paylaşılacaktır."

Step 3: 112 Guidance
  └─ "Lütfen 112'yi arayın..."
  └─ Buttons: 112'yi Ara | 112 Arandı | Şu an arayamıyorum
  └─ Records status_112: called | not_called | unable_to_call

Step 4: Confirm & Create
  └─ POST create-incident Edge Function
  └─ Navigate to Active Incident screen
```

**Accidental trigger prevention:** Press-and-hold 3s OR slide-to-confirm. Haptic feedback on start/complete.

### 3.3 Report Accident Flow (Bystander — Sprint 3)

```
Entry: "Bir Kazayı Bildir"
  └─ Select observed type (traffic, unconscious, bleeding, fire, drowning, unknown)
  └─ 112 status question
  └─ Location capture
  └─ Create with:
       affected_person_is_creator = false
       reporter_relation = bystander
```

### 3.4 Active Incident Screen (Sprint 3+)

Displays:
- Incident status timeline
- Location map (own incident)
- `status_112` indicator
- Responders notified / accepted / on the way counts
- Safety instructions
- **Yanlış Alarm İptal** → reason picker (mistaken_tap, resolved, duplicate, other)
- **Olayı Kapat** (when resolved)

Realtime updates via Supabase subscription (Sprint 7).

### 3.5 Emergency Contacts (Sprint 4+)

CRUD on `emergency_contacts`. Optional notify on incident via Edge Function.

### 3.6 Health Card (Sprint 4+)

Optional form → `emergency_health_cards`. Requires `explicit_consent_health_data`. Disabled by default.

### 3.7 Incident History (Sprint 7)

List past incidents from `incidents` WHERE `created_by_user_id = auth.uid()`.

---

## 4. Responder Flows

### 4.1 Mode Switch

Approved responders see **"Yardımcı Moduna Geç"** on home. Pending/rejected see verification status card.

Access gated by `canAccessResponderMode()` and `canReceiveIncidentAlerts()` from `@hayat-agi/shared`.

### 4.2 Responder Onboarding (Sprint 4)

```
1. Select responder_type (doctor, nurse, paramedic, emt, first_aider, other)
2. Enter license/certificate details
3. Upload documents → responder-documents bucket
4. Accept responder_terms
5. Status → pending_review
6. Wait for admin approval
```

### 4.3 Availability Mode (Sprint 5)

```
Toggle: Müsaitim / Müsait Değilim
  └─ Show location consent explanation
  └─ Request foreground location permission
  └─ POST update-responder-location
  └─ availability_status = available | unavailable
```

Location updates on: toggle on, app foreground, incident accept.

### 4.4 Incoming Alert (Sprint 6)

Push notification → open app → Responder Alert list

**Pre-detail safety gate (Sprint 7):**
```
Safety Notice displayed
  └─ "Kendi güvenliğiniz önceliklidir..."
  └─ Anladım, Detayları Göster | Katılamam
```

After safety confirmation:
- Emergency type
- Approximate distance
- 112 status
- Accepted responder count
- **Kabul Et** | **Reddet**

### 4.5 Active Response (Sprint 7)

After accept → exact location + map + navigation

Status buttons:
- Yoldayım → `on_the_way`
- Olay Yerine Vardım → `arrived`
- Ambulans Geldi → triggers incident `ambulance_arrived`
- Müdahalemi Sonlandır → `completed`

### 4.6 Max Responders Reached

If `accepted_responder_count >= max_responders`:
- Show: "Bu çağrı için yeterli sayıda gönüllü yolda."
- If `status_112 != called`: encourage notifying citizen to call 112

---

## 5. Profile & Settings

- Edit profile (name, phone, city)
- Consent management (view recorded consents)
- Push notification settings
- Logout
- Delete account (future — requires data retention policy)

---

## 6. Error & Edge Cases

| Scenario | UX |
|----------|-----|
| Location denied | Explain + offer manual map pin |
| No network | Queue retry message; cannot create incident offline |
| Blocked user | Auth succeeds but app shows blocked message |
| Missing consents | Redirect to consent screen |
| Unverified responder taps alert | Show verification pending card |

---

## 7. Implementation Status

| Flow | Sprint | Status |
|------|--------|--------|
| Onboarding + auth | 1 | ✅ |
| Profile setup | 1 | ✅ |
| Consent | 1 | ✅ |
| Citizen home + emergency | 2–3 | ⏳ |
| Bystander report | 3 | ⏳ |
| Responder onboarding | 4 | ⏳ |
| Availability | 5 | ⏳ |
| Push alerts | 6 | ⏳ |
| Accept/respond lifecycle | 7 | ⏳ |

---

## 8. Related Documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [INCIDENT_LIFECYCLE.md](./INCIDENT_LIFECYCLE.md)
- [LOCATION_LOGIC.md](./LOCATION_LOGIC.md)
- [PUSH_NOTIFICATION_LOGIC.md](./PUSH_NOTIFICATION_LOGIC.md)
