# Hayat Ağı — Admin Panel Flows

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Overview

The admin panel (`apps/admin`) is a **separate Next.js application** for platform operators. It shares Supabase Auth and `@hayat-agi/shared` types but provides a distinct operations-focused UX.

**Access requirement:** `profiles.is_admin = true AND is_blocked = false`

**Current state (Sprint 1):** Placeholder landing page. Full dashboard planned for Sprint 8; document review may begin in Sprint 4.

**Port:** 3001 (default)

---

## 2. Authentication Flow

```
Admin navigates to admin panel URL
  └─ Login page (email/password)
  └─ Supabase Auth session (SSR cookies via @supabase/ssr)
  └─ Fetch profile → verify is_admin
  └─ If not admin: show "Yetkisiz erişim" and sign out
  └─ If admin: redirect to dashboard
```

Admin promotion is manual via SQL (see SETUP_GUIDE.md). Never client-side.

---

## 3. Dashboard (Sprint 8)

### 3.1 Layout
- Left sidebar navigation (navy)
- Top bar: admin name, logout
- Main content area

### 3.2 Sidebar Sections
| Section | Route (planned) | Purpose |
|---------|-----------------|---------|
| Dashboard | `/` | KPI overview |
| Active Incidents | `/incidents` | Map + list |
| Incident Detail | `/incidents/[id]` | Timeline, responders, actions |
| Citizens | `/users/citizens` | Profile search |
| Responders | `/users/responders` | Verification queue |
| Documents | `/documents` | Review queue |
| Abuse Reports | `/abuse` | Moderation queue |
| Notifications | `/notifications` | Delivery logs |
| Audit Logs | `/audit` | System audit trail |
| Consents | `/consents` | Consent records (read-only) |
| Settings | `/settings` | system_settings editor |

### 3.3 Dashboard KPIs
- Active incidents count
- Incidents created today
- Pending document reviews
- Open abuse reports
- Available responders (aggregate, not map of individuals for privacy)

---

## 4. Incident Operations

### 4.1 Active Incidents Map
- PostGIS-backed incident pins from `incident_locations`
- Color by `severity_level` or `status`
- Click pin → incident detail drawer
- Filter: status, type, date range, test incidents

### 4.2 Incident Detail Page

**Sections:**
1. **Header:** ID, type, status, created_at, `status_112`
2. **Map:** Exact location (admin has full access via RLS)
3. **Timeline:** From `incident_status_events`
4. **Responders:** Table from `incident_responders` with status, timestamps
5. **Notifications:** Sent push log from `incident_notifications`
6. **Actions:**
   - Force close incident (admin)
   - Add admin note
   - Flag for abuse review

### 4.3 Admin Incident Actions
| Action | Effect |
|--------|--------|
| Force close | status → closed, closed_at set, notifications stop |
| Cancel | status → cancelled |
| Add note | Insert `admin_notes` |
| Mark test | is_test = true |

---

## 5. User Management

### 5.1 Citizen Profiles
- Search by email, phone, name
- View: profile fields, consent summary, incident count
- Actions: block/unblock, add admin note
- **Do not** display emergency contacts unless legally required and logged

### 5.2 Responder Profiles
- Filter by verification_status
- View: responder_type, documents, verification history
- Actions: approve, reject (with reason), suspend, expire

### 5.3 Block / Suspend
```
Block user:
  profiles.is_blocked = true
  → RLS denies all operations
  → Responder availability forced unavailable (Edge Function, Sprint 8)

Suspend responder:
  responder_profiles.verification_status = suspended
  suspended_reason recorded
```

---

## 6. Document Review Queue (Sprint 4/8)

### 6.1 Queue View
- Filter: status = pending
- Sort: oldest first
- Columns: user, document_type, uploaded_at, responder_type

### 6.2 Review Flow
```
Select document
  └─ View via signed Storage URL
  └─ Approve → status = approved
  └─ Reject → status = rejected, rejection_reason required
  └─ If all required docs approved → responder verification_status = approved
  └─ Audit log entry
  └─ Push: verification_approved | verification_rejected
```

**Edge Function:** `verify-document-status` (planned Sprint 4)

---

## 7. Abuse Reports

### 7.1 Queue
- Filter: status = open | reviewing
- Fields: reporter, reported user, incident, reason, description

### 7.2 Resolution
| Resolution | Action |
|------------|--------|
| Resolved | Block reported user, close incident if active |
| Dismissed | No action, log reason |
| Reviewing | Assign to admin |

---

## 8. Audit & Compliance

### 8.1 Audit Logs
- Read-only table from `audit_logs`
- Filter: action, actor, date range, target_table
- Export CSV (Sprint 9)

### 8.2 Consent Records
- Read-only view of `user_consents`
- Filter by user, consent_type, version
- For KVKK data subject request support

### 8.3 Notification Logs
- `incident_notifications` with delivery status
- Debug failed pushes

---

## 9. System Settings

Edit `system_settings` JSON values:

| Key | Fields |
|-----|--------|
| `incident_matching` | radii, wait times, max responders per phase |
| `mvp_simplified_matching` | enabled, radius_meters, max_responders |

Changes take effect on next incident creation. Admin action logged to audit_logs.

---

## 10. Organizations (Future)

Schema exists for:
- `organizations`, `organization_members`, `organization_locations`

Admin CRUD for institution accounts — post-MVP.

---

## 11. Security Considerations

| Rule | Detail |
|------|--------|
| No service role in browser | Admin uses anon key + admin JWT; RLS grants admin policies |
| Signed URLs for documents | Time-limited Storage URLs for review |
| Action logging | All moderation actions → audit_logs |
| Least privilege | Separate admin accounts; no shared credentials |

---

## 12. Implementation Roadmap

| Feature | Sprint |
|---------|--------|
| Placeholder page | 1 ✅ |
| Admin auth + layout | 8 |
| Incident map + detail | 8 |
| Document review | 4 (basic) / 8 (full) |
| User moderation | 8 |
| Audit viewer | 8 |
| Settings editor | 8 |

---

## 13. Related Documents

- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md)
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)
