# Hayat Ağı — Design System

**Version:** 0.1.0  
**Last updated:** Sprint 1

---

## 1. Design Philosophy: Calm Urgency

Hayat Ağı operates in high-stress moments. The interface must be:

- **Trustworthy** — professional, not alarmist
- **Clear** — readable under stress, large touch targets
- **Calm** — warm neutrals, red only for true emergency actions
- **Fast** — minimal steps to critical actions
- **Human** — supportive language, safety-first copy

**Avoid:** cheap gradients, excessive red screens, panic language, cluttered forms, small buttons, fear-based visuals.

**Reference quality bar:** Apple Health clarity, Uber action flow, Airbnb card cleanliness, modern fintech trust.

---

## 2. Color Tokens

Defined in `packages/shared/src/constants/colors.ts`:

| Token | Hex | Usage |
|-------|-----|-------|
| `emergency` | `#E53935` | Emergency CTA only (press-and-hold button) |
| `navy` | `#102A43` | Headers, primary text accents, shadows |
| `trustBlue` | `#2563EB` | Links, info actions, system trust elements |
| `background` | `#F8FAFC` | Screen background (warm neutral) |
| `card` | `#FFFFFF` | Card surfaces |
| `textPrimary` | `#0F172A` | Body text, titles |
| `textSecondary` | `#64748B` | Captions, hints |
| `success` | `#16A34A` | Confirmed, arrived, approved |
| `warning` | `#F59E0B` | Pending, caution states |
| `critical` | `#DC2626` | Errors, destructive confirm (not general UI) |
| `border` | `#E2E8F0` | Dividers, input borders |
| `muted` | `#F1F5F9` | Subtle backgrounds, disabled states |

### Color Rules

1. **Red budget:** Use `emergency` / `critical` only for emergency button, destructive confirms, and critical alerts
2. **Status colors:** success/warning for pills and timeline states
3. **Never** full-screen red backgrounds
4. **Contrast:** WCAG AA minimum for all text pairs

---

## 3. Typography

Mobile theme in `apps/mobile/lib/theme.ts`. Prefer **Inter** via Expo Google Fonts (Sprint 2).

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `title` | 28 | 700 | 34 | Screen titles |
| `heading` | 22 | 600 | 28 | Section headers |
| `body` | 16 | 400 | 24 | Paragraph text |
| `bodyMedium` | 16 | 500 | 24 | Emphasized body |
| `caption` | 14 | 400 | 20 | Secondary info |
| `label` | 13 | 600 | 18 | Form labels, pills |

**Emergency screens:** minimum 16px body, 28px+ for critical instructions.

---

## 4. Spacing Scale

| Token | Value (px) |
|-------|------------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 48 |

**Layout:** Screen horizontal padding = `md` (16) or `lg` (24). Card internal padding = `md`–`lg`. Section gaps = `lg`.

---

## 5. Border Radius

| Token | Value (px) | Usage |
|-------|------------|-------|
| `sm` | 8 | Inputs, small chips |
| `md` | 12 | Buttons, small cards |
| `lg` | 16 | Standard cards |
| `xl` | 24 | Bottom sheets, hero cards |
| `full` | 9999 | Pills, avatars |

---

## 6. Elevation / Shadow

```typescript
shadow.card = {
  shadowColor: '#102A43',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
}
```

Use sparingly. Prefer border (`border` token) for flat admin tables.

---

## 7. Motion & Haptics

| Interaction | Behavior |
|-------------|----------|
| Emergency button press-and-hold | Progress ring animation, haptic on start + complete |
| Bottom sheet | Spring animation, 300ms |
| Status pill change | Subtle color fade, 200ms |
| Page transitions | Expo Router default, no flashy effects |
| Loading | Skeleton placeholders, not spinners on full screen |

**Rule:** Motion supports clarity, never delays critical actions.

---

## 8. Iconography

- Use `@expo/vector-icons` (Ionicons / MaterialCommunityIcons)
- 24px default, 20px inline, 32px for emergency secondary actions
- Outline style preferred over filled
- No clipart-style emergency icons

---

## 9. Component Library

### 9.1 Implemented (Sprint 1)

| Component | Path | Purpose |
|-----------|------|---------|
| `ScreenContainer` | `components/ui/ScreenContainer.tsx` | Safe area + background |
| `PrimaryButton` | `components/ui/Button.tsx` | Primary actions |
| `ConsentCard` | `components/ui/ConsentCard.tsx` | Consent checkbox group |
| `ConsentCheckbox` | `components/ui/ConsentCard.tsx` | Individual consent item |
| `SafetyNoticeCard` | `components/ui/SafetyNotice.tsx` | 112 / safety info banners |

### 9.2 Planned (Sprint 2+)

| Component | Purpose |
|-----------|---------|
| `EmergencyActionButton` | Press-and-hold 3s emergency CTA |
| `ActionCard` | Secondary home grid actions |
| `StatusPill` | Incident/responder status badge |
| `IncidentStatusCard` | Active incident summary |
| `IncidentTimeline` | Vertical lifecycle steps |
| `LocationPermissionCard` | Pre-permission explanation |
| `EmergencyTypeSelector` | Bottom sheet type picker |
| `MapPreviewCard` | Location confirmation |
| `ResponderAvailabilityToggle` | Müsaitim / Müsait Değilim |
| `ResponderAlertCard` | Incoming incident card |
| `VerificationStatusCard` | Responder verification state |
| `DocumentUploadCard` | File picker + upload progress |
| `SecondaryButton` | Outlined actions |
| `DangerButton` | Destructive actions |
| `TimelineStep` | Single timeline node |
| `EmptyState` | No data illustrations |
| `SkeletonCard` | Loading placeholder |

### 9.3 Admin Components (Sprint 8)

| Component | Purpose |
|-----------|---------|
| `AdminMetricCard` | KPI display |
| `AdminIncidentMap` | Map with incident pins |
| `AdminReviewPanel` | Document review split view |
| `AuditLogTable` | Filterable audit table |
| `DataTable` | Generic admin table with filters |

---

## 10. Screen Patterns

### Citizen Home
- Warm `background` fill
- Greeting header (navy title)
- Safety status card (trustBlue info tone)
- Large emergency card with `EmergencyActionButton`
- Secondary 2×2 action grid (112, Report, Contacts, Health)
- Bottom sheet for emergency type selection

### Active Incident
- Timeline component (vertical)
- Status pills for responders
- Sticky 112 call button
- Cancel false alarm (secondary, not hidden)

### Responder Home
- Availability pill (top)
- Map preview (muted, non-alarming)
- Verification card if not approved
- Alert cards with distance + safety label

### Admin Dashboard
- Left sidebar navigation (navy)
- White content area
- Data-dense tables, no playful elements
- Map occupies primary viewport for incidents

---

## 11. Accessibility

- Minimum touch target: 44×44 pt
- Support Dynamic Type / font scaling
- Color not sole indicator of state (add text/icon)
- Screen reader labels on all interactive elements
- High contrast mode: verify `textPrimary` on `background` and `card`

---

## 12. Empty, Error, Loading States

| State | Pattern |
|-------|---------|
| Empty incidents | Illustration + "Henüz acil çağrınız yok" + calm copy |
| Location denied | Explanation card + manual pin option (Sprint 3) |
| Network error | Retry button, no blame language |
| Loading profile | Skeleton cards, 2–3 placeholders |
| Verification pending | Amber status pill + estimated wait copy |

---

## 13. Confirmation Dialogs

Destructive actions require explicit confirmation:
- Cancel false alarm → reason picker
- Decline incident → optional reason
- Delete emergency contact → confirm dialog
- Logout → standard confirm

Use `DangerButton` only inside confirmed dialogs.

---

## 14. Admin Design Rules

- No rounded playful UI
- Sidebar: navy background, white text
- Tables: zebra optional, strong column headers
- Status badges: same color tokens as mobile
- Maps: professional, muted base map style

---

## 15. Related Documents

- [MOBILE_APP_FLOWS.md](./MOBILE_APP_FLOWS.md)
- [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md)
