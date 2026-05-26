# Hayat Ağı

**Volunteer emergency support coordination platform** — connecting citizens in medical emergencies with nearby verified healthcare professionals and certified first aiders during the critical minutes before ambulance arrival.

> **Hayat Ağı, 112 acil servisinin yerine geçmez.** Acil durumlarda her zaman 112'yi arayın.

---

## What Is This?

Hayat Ağı is an MVP foundation for a privacy-first emergency volunteer network:

- **Citizens** create emergency support requests with location
- **Verified responders** (doctors, nurses, paramedics, EMTs, first aiders) receive nearby alerts
- **Administrators** verify responders and monitor operations

Built as a TypeScript monorepo: Expo React Native mobile app + Next.js admin panel + Supabase backend.

**Current status:** Sprint 2 complete — polished app shell, tabs, citizen home, responder placeholder.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo 56, React Native, Expo Router, TypeScript |
| Admin | Next.js 16, Tailwind CSS 4, TypeScript |
| Backend | Supabase (Auth, Postgres, PostGIS, Storage, Edge Functions) |
| Shared | `@hayat-agi/shared` — types, Zod schemas, constants |

---

## Folder Structure

```
acil-destek/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── app/                # Expo Router screens
│   │   │   ├── (auth)/         # Welcome, login, register, consent
│   │   │   └── (app)/          # Protected: home, profile-setup
│   │   ├── components/ui/      # Design system components
│   │   ├── lib/                # Supabase client, auth, theme
│   │   └── stores/             # Zustand state
│   └── admin/                  # Next.js admin panel (port 3001)
│       └── src/app/            # App router pages
├── packages/
│   └── shared/                 # Shared types, validation, constants
│       └── src/
│           ├── constants/      # Colors, emergency types, legal copy
│           ├── types/          # Database interfaces
│           ├── validation/     # Zod schemas
│           └── permissions/    # Role helpers
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql   # Full DB schema + RLS
│   └── functions/
│       ├── create-incident/    # Edge Function (stub)
│       └── _shared/            # CORS utilities
└── docs/                       # Product & engineering documentation
    ├── PRODUCT_REQUIREMENTS.md
    ├── TECHNICAL_ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── SETUP_GUIDE.md          # ← Start here for Supabase setup
    ├── SPRINT_PLAN.md
    └── ... (18 docs total)
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Supabase account ([supabase.com](https://supabase.com))
- Expo Go app on your phone (or simulator)

### 1. Install

```bash
git clone <repository-url> acil-destek
cd acil-destek
npm install
```

### 2. Supabase Setup

Follow the detailed guide: **[docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)**

Summary:
1. Create Supabase project
2. Paste `supabase/migrations/0001_initial_schema.sql` into **SQL Editor → Run**
3. Create `responder-documents` storage bucket
4. Copy Project URL and anon key

### 3. Environment Variables

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.local.example apps/admin/.env.local
```

Fill in your Supabase URL and anon key in both files.

### 4. Run Mobile App

```bash
npm run mobile
```

Scan QR with Expo Go → Register → Profile setup → Consent → Home.

### 5. Run Admin Panel

```bash
npm run admin
```

Open [http://localhost:3001](http://localhost:3001) — placeholder until Sprint 8.

### 6. Make Yourself Admin

After signing up, run in Supabase SQL Editor:

```sql
UPDATE public.profiles
SET is_admin = true, user_type = 'admin'
WHERE email = 'your-email@example.com';
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) | Detailed Supabase + local dev setup |
| [PRODUCT_REQUIREMENTS.md](./docs/PRODUCT_REQUIREMENTS.md) | Full PRD |
| [TECHNICAL_ARCHITECTURE.md](./docs/TECHNICAL_ARCHITECTURE.md) | System architecture |
| [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | All tables, RLS, PostGIS |
| [SECURITY_AND_PRIVACY.md](./docs/SECURITY_AND_PRIVACY.md) | Privacy model |
| [KVKK_AND_LEGAL_DRAFTS.md](./docs/KVKK_AND_LEGAL_DRAFTS.md) | Turkish legal drafts |
| [SPRINT_PLAN.md](./docs/SPRINT_PLAN.md) | Sprints 0–10 roadmap |
| [CHANGELOG.md](./docs/CHANGELOG.md) | Sprint history |
| [KNOWN_LIMITATIONS.md](./docs/KNOWN_LIMITATIONS.md) | MVP limitations |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run mobile` | Start Expo dev server |
| `npm run admin` | Start Next.js admin on port 3001 |
| `npm run shared:build` | Build shared package |
| `npm run typecheck` | Typecheck all workspaces |

---

## Security Notes

- **Never** put `SUPABASE_SERVICE_ROLE_KEY` in mobile or admin env files
- Responder matching runs server-side via Edge Functions only
- RLS enabled on all tables — see [SECURITY_AND_PRIVACY.md](./docs/SECURITY_AND_PRIVACY.md)
- Legal texts in docs are **drafts** — require legal review before production

---

## Sprint Progress

| Sprint | Status | Deliverable |
|--------|--------|-------------|
| 0 — Foundation | ✅ | Monorepo runs locally |
| 1 — Schema & Auth | ✅ | Signup, profile, consent, full DB |
| 2 — Design System | ⏳ | App shell + components |
| 3 — Incident Creation | ⏳ | Emergency button + Edge Function |
| 4–10 | ⏳ | See [SPRINT_PLAN.md](./docs/SPRINT_PLAN.md) |

---

## License

Private — all rights reserved.
