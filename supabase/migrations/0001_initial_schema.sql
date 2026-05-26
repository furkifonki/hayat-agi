-- =============================================================================
-- Hayat Ağı — Initial Database Schema
-- Migration: 0001_initial_schema.sql
--
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- or via Supabase CLI: supabase db push
--
-- Prerequisites: Supabase project with Postgres 15+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "postgis" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- PRIVATE SCHEMA (security definer helpers — not exposed via Data API)
-- -----------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- -----------------------------------------------------------------------------
-- UTILITY FUNCTIONS
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function to auto-update updated_at timestamp on row modification.';

-- Sync geography column from lat/lng when both are provided
create or replace function public.sync_geography_from_lat_lng()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  user_type text not null default 'citizen'
    check (user_type in ('citizen', 'responder', 'citizen_and_responder', 'admin')),
  is_admin boolean not null default false,
  is_blocked boolean not null default false,
  preferred_language text not null default 'tr',
  city text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_user_type_idx on public.profiles (user_type);
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;
create index profiles_is_blocked_idx on public.profiles (is_blocked) where is_blocked = true;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- USER CONSENTS
-- -----------------------------------------------------------------------------

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null
    check (consent_type in (
      'kvkk_notice',
      'explicit_consent_location',
      'explicit_consent_health_data',
      'terms_of_use',
      'responder_terms',
      'push_notifications',
      'emergency_contact_permission'
    )),
  version text not null default '1.0',
  accepted boolean not null default false,
  accepted_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, consent_type, version)
);

create index user_consents_user_id_idx on public.user_consents (user_id);
create index user_consents_type_idx on public.user_consents (consent_type);

-- -----------------------------------------------------------------------------
-- EMERGENCY CONTACTS
-- -----------------------------------------------------------------------------

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  notify_on_incident boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emergency_contacts_user_id_idx on public.emergency_contacts (user_id);

create trigger emergency_contacts_set_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- EMERGENCY HEALTH CARDS
-- -----------------------------------------------------------------------------

create table public.emergency_health_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  blood_type text,
  allergies text,
  chronic_conditions text,
  medications text,
  notes text,
  is_enabled boolean not null default false,
  visibility_mode text not null default 'incident_only'
    check (visibility_mode in ('incident_only', 'never', 'responder_accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger emergency_health_cards_set_updated_at
  before update on public.emergency_health_cards
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RESPONDER PROFILES
-- -----------------------------------------------------------------------------

create table public.responder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  responder_type text not null
    check (responder_type in (
      'doctor', 'nurse', 'paramedic', 'emt', 'first_aider', 'other_healthcare'
    )),
  verification_status text not null default 'not_started'
    check (verification_status in (
      'not_started', 'pending_review', 'approved', 'rejected', 'suspended', 'expired'
    )),
  license_number text,
  certificate_number text,
  issuing_institution text,
  workplace text,
  bio text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  rejection_reason text,
  suspended_reason text,
  document_expiry_date date,
  accepted_responder_terms boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index responder_profiles_user_id_idx on public.responder_profiles (user_id);
create index responder_profiles_verification_status_idx on public.responder_profiles (verification_status);

create trigger responder_profiles_set_updated_at
  before update on public.responder_profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RESPONDER DOCUMENTS
-- -----------------------------------------------------------------------------

create table public.responder_documents (
  id uuid primary key default gen_random_uuid(),
  responder_profile_id uuid not null references public.responder_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null
    check (document_type in (
      'identity_optional', 'medical_license', 'nurse_license',
      'paramedic_certificate', 'first_aid_certificate', 'other'
    )),
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index responder_documents_profile_id_idx on public.responder_documents (responder_profile_id);
create index responder_documents_user_id_idx on public.responder_documents (user_id);
create index responder_documents_status_idx on public.responder_documents (status);

create trigger responder_documents_set_updated_at
  before update on public.responder_documents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RESPONDER LOCATIONS (PostGIS)
-- Citizens and unauthenticated users MUST NOT query this table directly.
-- Matching happens server-side via Edge Functions with service_role.
-- -----------------------------------------------------------------------------

create table public.responder_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  location extensions.geography(point, 4326),
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  availability_status text not null default 'unavailable'
    check (availability_status in ('available', 'unavailable', 'busy', 'on_incident', 'suspended')),
  permission_scope text not null default 'foreground'
    check (permission_scope in ('foreground', 'background', 'none')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index responder_locations_user_id_idx on public.responder_locations (user_id);
create index responder_locations_availability_idx on public.responder_locations (availability_status);
create index responder_locations_updated_at_idx on public.responder_locations (updated_at);
create index responder_locations_geo_idx on public.responder_locations using gist (location);

create trigger responder_locations_sync_geo
  before insert or update on public.responder_locations
  for each row execute function public.sync_geography_from_lat_lng();

-- -----------------------------------------------------------------------------
-- RESPONDER AVAILABILITY LOGS
-- -----------------------------------------------------------------------------

create table public.responder_availability_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_status text,
  new_status text not null,
  location extensions.geography(point, 4326),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index responder_availability_logs_user_id_idx on public.responder_availability_logs (user_id);
create index responder_availability_logs_created_at_idx on public.responder_availability_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- INCIDENTS
-- Direct INSERT from mobile client is restricted; prefer create-incident Edge Function.
-- -----------------------------------------------------------------------------

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles(id),
  affected_person_is_creator boolean not null default true,
  reporter_relation text not null default 'self'
    check (reporter_relation in ('self', 'bystander', 'family', 'coworker', 'unknown')),
  incident_type text not null
    check (incident_type in (
      'traffic_accident', 'fainting_unconscious', 'breathing_problem',
      'suspected_heart_attack', 'bleeding', 'burn', 'drowning', 'seizure',
      'fall_injury', 'fire_smoke', 'unknown'
    )),
  severity_level text not null default 'unknown'
    check (severity_level in ('red', 'orange', 'yellow', 'unknown')),
  status text not null default 'created'
    check (status in (
      'created', 'locating', 'notifying_responders', 'responder_assigned',
      'responder_on_the_way', 'responder_arrived', 'ambulance_arrived',
      'closed', 'cancelled', 'expired'
    )),
  description text,
  status_112 text not null default 'unknown'
    check (status_112 in ('called', 'not_called', 'unknown', 'unable_to_call')),
  max_responders int not null default 3 check (max_responders > 0 and max_responders <= 10),
  accepted_responder_count int not null default 0 check (accepted_responder_count >= 0),
  is_public_alert boolean not null default true,
  is_test boolean not null default false,
  cancel_reason text,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index incidents_created_by_idx on public.incidents (created_by_user_id);
create index incidents_status_idx on public.incidents (status);
create index incidents_created_at_idx on public.incidents (created_at desc);
create index incidents_active_idx on public.incidents (status)
  where status not in ('closed', 'cancelled', 'expired');

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- INCIDENT LOCATIONS
-- -----------------------------------------------------------------------------

create table public.incident_locations (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  location extensions.geography(point, 4326),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  source text not null default 'gps'
    check (source in ('gps', 'manual', 'map_pin', 'last_known')),
  created_at timestamptz not null default now()
);

create index incident_locations_incident_id_idx on public.incident_locations (incident_id);
create index incident_locations_geo_idx on public.incident_locations using gist (location);

create trigger incident_locations_sync_geo
  before insert or update on public.incident_locations
  for each row execute function public.sync_geography_from_lat_lng();

-- -----------------------------------------------------------------------------
-- INCIDENT RESPONDERS
-- -----------------------------------------------------------------------------

create table public.incident_responders (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  responder_user_id uuid not null references public.profiles(id),
  status text not null default 'notified'
    check (status in (
      'notified', 'viewed', 'accepted', 'declined',
      'on_the_way', 'arrived', 'completed', 'cancelled_by_system'
    )),
  distance_meters double precision,
  notified_at timestamptz,
  accepted_at timestamptz,
  on_the_way_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (incident_id, responder_user_id)
);

create index incident_responders_incident_id_idx on public.incident_responders (incident_id);
create index incident_responders_responder_id_idx on public.incident_responders (responder_user_id);
create index incident_responders_status_idx on public.incident_responders (status);

create trigger incident_responders_set_updated_at
  before update on public.incident_responders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- INCIDENT STATUS EVENTS
-- -----------------------------------------------------------------------------

create table public.incident_status_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_type text not null,
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index incident_status_events_incident_id_idx on public.incident_status_events (incident_id);
create index incident_status_events_created_at_idx on public.incident_status_events (created_at desc);

-- -----------------------------------------------------------------------------
-- PUSH TOKENS
-- -----------------------------------------------------------------------------

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  device_id text,
  platform text check (platform in ('ios', 'android', 'web')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);
create index push_tokens_active_idx on public.push_tokens (is_active) where is_active = true;

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- INCIDENT NOTIFICATIONS
-- -----------------------------------------------------------------------------

create table public.incident_notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  recipient_user_id uuid not null references public.profiles(id),
  push_token_id uuid references public.push_tokens(id) on delete set null,
  notification_type text not null
    check (notification_type in (
      'incident_nearby', 'incident_update', 'responder_accepted',
      'responder_arrived', 'emergency_contact_alert',
      'verification_approved', 'verification_rejected'
    )),
  title text not null,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'opened', 'expired')),
  sent_at timestamptz,
  opened_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index incident_notifications_recipient_idx on public.incident_notifications (recipient_user_id);
create index incident_notifications_incident_idx on public.incident_notifications (incident_id);
create index incident_notifications_status_idx on public.incident_notifications (status);

-- -----------------------------------------------------------------------------
-- INCIDENT MESSAGES (MVP: table exists, messaging may be disabled in app)
-- -----------------------------------------------------------------------------

create table public.incident_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id),
  message text not null check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index incident_messages_incident_id_idx on public.incident_messages (incident_id);

-- -----------------------------------------------------------------------------
-- ABUSE REPORTS
-- -----------------------------------------------------------------------------

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id),
  reported_user_id uuid references public.profiles(id),
  incident_id uuid references public.incidents(id),
  reason text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index abuse_reports_status_idx on public.abuse_reports (status);

-- -----------------------------------------------------------------------------
-- AUDIT LOGS (insert via Edge Functions / service_role only)
-- -----------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id);

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS (future-ready)
-- -----------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in (
    'school', 'mall', 'factory', 'residential_site', 'hotel',
    'office', 'event_venue', 'training_center', 'municipality', 'other'
  )),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active'
    check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  location extensions.geography(point, 4326),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organization_locations_sync_geo
  before insert or update on public.organization_locations
  for each row execute function public.sync_geography_from_lat_lng();

create trigger organization_locations_set_updated_at
  before update on public.organization_locations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- LEGAL DOCUMENTS & ACCEPTANCES
-- -----------------------------------------------------------------------------

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null
    check (document_type in (
      'kvkk_notice', 'terms_of_use', 'explicit_consent_location',
      'explicit_consent_health_data', 'responder_terms', 'privacy_policy'
    )),
  version text not null,
  title text not null,
  content_md text not null,
  is_active boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_type, version)
);

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents(id),
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, legal_document_id)
);

-- -----------------------------------------------------------------------------
-- SYSTEM SETTINGS
-- -----------------------------------------------------------------------------

create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

-- Default matching settings (MVP: simplified 1km / 10 responders)
insert into public.system_settings (key, value) values
  ('incident_matching', '{
    "initial_radius_meters": 1000,
    "max_responders_per_phase": 10,
    "location_stale_minutes": 15,
    "default_max_responders": 3,
    "escalation_phases": [
      {"radius_meters": 500, "max_responders": 3, "wait_seconds": 30},
      {"radius_meters": 1000, "max_responders": 5, "wait_seconds": 60},
      {"radius_meters": 3000, "max_responders": 10, "wait_seconds": 120}
    ]
  }'::jsonb),
  ('mvp_simplified_matching', '{"enabled": true, "radius_meters": 1000, "max_responders": 10}'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- ADMIN NOTES
-- -----------------------------------------------------------------------------

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  incident_id uuid references public.incidents(id),
  note text not null,
  created_at timestamptz not null default now()
);

create index admin_notes_target_user_idx on public.admin_notes (target_user_id);
create index admin_notes_incident_idx on public.admin_notes (incident_id);

-- -----------------------------------------------------------------------------
-- PRIVATE HELPER FUNCTIONS (SECURITY DEFINER — after all tables exist)
-- Never use auth.jwt() user_metadata for authorization.
-- is_admin is stored in profiles.is_admin (server-controlled via admin only).
-- -----------------------------------------------------------------------------

create or replace function private.get_profile(p_user_id uuid)
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = p_user_id limit 1;
$$;

create or replace function private.is_blocked(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_blocked from public.profiles where id = p_user_id),
    true
  );
$$;

create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and is_admin = true
      and is_blocked = false
  );
$$;

create or replace function private.is_verified_responder(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.responder_profiles rp
    join public.profiles p on p.id = rp.user_id
    where rp.user_id = p_user_id
      and rp.verification_status = 'approved'
      and p.is_blocked = false
  );
$$;

create or replace function private.is_incident_creator(p_user_id uuid, p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.incidents
    where id = p_incident_id
      and created_by_user_id = p_user_id
  );
$$;

create or replace function private.is_incident_responder(
  p_user_id uuid,
  p_incident_id uuid,
  p_min_status text default 'notified'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.incident_responders ir
    where ir.incident_id = p_incident_id
      and ir.responder_user_id = p_user_id
      and ir.status = any (
        case p_min_status
          when 'accepted' then array['accepted','on_the_way','arrived','completed']
          when 'notified' then array['notified','viewed','accepted','on_the_way','arrived','completed']
          else array[p_min_status]
        end
      )
  );
$$;

create or replace function private.has_active_incident_consent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_consents
    where user_id = p_user_id
      and consent_type in ('kvkk_notice', 'terms_of_use', 'explicit_consent_location')
      and accepted = true
  );
$$;

grant usage on schema private to postgres, service_role, authenticated;
grant execute on all functions in schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- AUTH: AUTO-CREATE PROFILE ON SIGNUP
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1),
    'Kullanıcı'
  );

  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    v_full_name,
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_consents enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.emergency_health_cards enable row level security;
alter table public.responder_profiles enable row level security;
alter table public.responder_documents enable row level security;
alter table public.responder_locations enable row level security;
alter table public.responder_availability_logs enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_locations enable row level security;
alter table public.incident_responders enable row level security;
alter table public.incident_status_events enable row level security;
alter table public.incident_notifications enable row level security;
alter table public.incident_messages enable row level security;
alter table public.push_tokens enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_locations enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.system_settings enable row level security;
alter table public.admin_notes enable row level security;

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PROFILES
-- -----------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() and not private.is_blocked(auth.uid()));

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (private.is_admin(auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and not private.is_blocked(auth.uid()))
  with check (
    id = auth.uid()
    and not private.is_blocked(auth.uid())
    -- Users cannot self-promote to admin or unblock themselves
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
    and is_blocked = (select p.is_blocked from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: USER CONSENTS
-- -----------------------------------------------------------------------------

create policy "user_consents_select_own"
  on public.user_consents for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_consents_insert_own"
  on public.user_consents for insert
  to authenticated
  with check (user_id = auth.uid() and accepted = true);

create policy "user_consents_select_admin"
  on public.user_consents for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: EMERGENCY CONTACTS
-- -----------------------------------------------------------------------------

create policy "emergency_contacts_all_own"
  on public.emergency_contacts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "emergency_contacts_select_admin"
  on public.emergency_contacts for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: EMERGENCY HEALTH CARDS
-- -----------------------------------------------------------------------------

create policy "health_cards_all_own"
  on public.emergency_health_cards for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "health_cards_select_responder_accepted"
  on public.emergency_health_cards for select
  to authenticated
  using (
    is_enabled = true
    and exists (
      select 1
      from public.incidents i
      join public.incident_responders ir on ir.incident_id = i.id
      where i.created_by_user_id = emergency_health_cards.user_id
        and ir.responder_user_id = auth.uid()
        and ir.status in ('accepted', 'on_the_way', 'arrived')
        and i.status not in ('closed', 'cancelled', 'expired')
    )
  );

create policy "health_cards_select_admin"
  on public.emergency_health_cards for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: RESPONDER PROFILES
-- -----------------------------------------------------------------------------

create policy "responder_profiles_select_own"
  on public.responder_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "responder_profiles_insert_own"
  on public.responder_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "responder_profiles_update_own"
  on public.responder_profiles for update
  to authenticated
  using (user_id = auth.uid() and verification_status in ('not_started', 'pending_review', 'rejected'))
  with check (user_id = auth.uid());

create policy "responder_profiles_select_admin"
  on public.responder_profiles for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: RESPONDER DOCUMENTS
-- -----------------------------------------------------------------------------

create policy "responder_documents_select_own"
  on public.responder_documents for select
  to authenticated
  using (user_id = auth.uid());

create policy "responder_documents_insert_own"
  on public.responder_documents for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "responder_documents_update_own"
  on public.responder_documents for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid());

create policy "responder_documents_admin"
  on public.responder_documents for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: RESPONDER LOCATIONS
-- CRITICAL: No policy allows citizens to read all responder locations.
-- Responders can only read/update their own row.
-- -----------------------------------------------------------------------------

create policy "responder_locations_select_own"
  on public.responder_locations for select
  to authenticated
  using (user_id = auth.uid());

create policy "responder_locations_insert_own"
  on public.responder_locations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and private.is_verified_responder(auth.uid())
  );

create policy "responder_locations_update_own"
  on public.responder_locations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "responder_locations_select_admin"
  on public.responder_locations for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- No SELECT policy for other users — matching is Edge Function only (service_role)

-- -----------------------------------------------------------------------------
-- RLS POLICIES: RESPONDER AVAILABILITY LOGS
-- -----------------------------------------------------------------------------

create policy "availability_logs_select_own"
  on public.responder_availability_logs for select
  to authenticated
  using (user_id = auth.uid());

create policy "availability_logs_insert_own"
  on public.responder_availability_logs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "availability_logs_select_admin"
  on public.responder_availability_logs for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENTS
-- -----------------------------------------------------------------------------

create policy "incidents_select_own"
  on public.incidents for select
  to authenticated
  using (created_by_user_id = auth.uid());

create policy "incidents_select_responder"
  on public.incidents for select
  to authenticated
  using (
    private.is_incident_responder(auth.uid(), id, 'notified')
    or private.is_incident_responder(auth.uid(), id, 'accepted')
  );

create policy "incidents_select_admin"
  on public.incidents for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- Restrict direct insert: only via Edge Function (service_role) in production.
-- MVP allows authenticated insert for testing if consents exist and user not blocked.
create policy "incidents_insert_own_restricted"
  on public.incidents for insert
  to authenticated
  with check (
    created_by_user_id = auth.uid()
    and not private.is_blocked(auth.uid())
    and private.has_active_incident_consent(auth.uid())
  );

create policy "incidents_update_own"
  on public.incidents for update
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENT LOCATIONS
-- -----------------------------------------------------------------------------

create policy "incident_locations_select_creator"
  on public.incident_locations for select
  to authenticated
  using (private.is_incident_creator(auth.uid(), incident_id));

create policy "incident_locations_select_accepted_responder"
  on public.incident_locations for select
  to authenticated
  using (private.is_incident_responder(auth.uid(), incident_id, 'accepted'));

create policy "incident_locations_select_admin"
  on public.incident_locations for select
  to authenticated
  using (private.is_admin(auth.uid()));

create policy "incident_locations_insert_creator"
  on public.incident_locations for insert
  to authenticated
  with check (private.is_incident_creator(auth.uid(), incident_id));

-- Notified but not accepted responders do NOT get exact location via RLS

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENT RESPONDERS
-- -----------------------------------------------------------------------------

create policy "incident_responders_select_own"
  on public.incident_responders for select
  to authenticated
  using (responder_user_id = auth.uid());

create policy "incident_responders_select_creator_limited"
  on public.incident_responders for select
  to authenticated
  using (private.is_incident_creator(auth.uid(), incident_id));

create policy "incident_responders_update_own"
  on public.incident_responders for update
  to authenticated
  using (responder_user_id = auth.uid())
  with check (responder_user_id = auth.uid());

create policy "incident_responders_admin"
  on public.incident_responders for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENT STATUS EVENTS
-- -----------------------------------------------------------------------------

create policy "incident_status_events_select_involved"
  on public.incident_status_events for select
  to authenticated
  using (
    private.is_incident_creator(auth.uid(), incident_id)
    or private.is_incident_responder(auth.uid(), incident_id, 'notified')
    or private.is_admin(auth.uid())
  );

-- Insert via Edge Functions (service_role) primarily
create policy "incident_status_events_insert_involved"
  on public.incident_status_events for insert
  to authenticated
  with check (
    actor_user_id = auth.uid()
    and (
      private.is_incident_creator(auth.uid(), incident_id)
      or private.is_incident_responder(auth.uid(), incident_id, 'accepted')
      or private.is_admin(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENT NOTIFICATIONS
-- -----------------------------------------------------------------------------

create policy "incident_notifications_select_own"
  on public.incident_notifications for select
  to authenticated
  using (recipient_user_id = auth.uid());

create policy "incident_notifications_select_admin"
  on public.incident_notifications for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- Insert via Edge Functions only (no insert policy for authenticated)

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INCIDENT MESSAGES
-- -----------------------------------------------------------------------------

create policy "incident_messages_select_involved"
  on public.incident_messages for select
  to authenticated
  using (
    private.is_incident_creator(auth.uid(), incident_id)
    or private.is_incident_responder(auth.uid(), incident_id, 'accepted')
    or private.is_admin(auth.uid())
  );

create policy "incident_messages_insert_involved"
  on public.incident_messages for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and (
      private.is_incident_creator(auth.uid(), incident_id)
      or private.is_incident_responder(auth.uid(), incident_id, 'accepted')
    )
  );

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PUSH TOKENS
-- -----------------------------------------------------------------------------

create policy "push_tokens_all_own"
  on public.push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_select_admin"
  on public.push_tokens for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: ABUSE REPORTS
-- -----------------------------------------------------------------------------

create policy "abuse_reports_insert_own"
  on public.abuse_reports for insert
  to authenticated
  with check (reporter_user_id = auth.uid());

create policy "abuse_reports_select_own"
  on public.abuse_reports for select
  to authenticated
  using (reporter_user_id = auth.uid());

create policy "abuse_reports_admin"
  on public.abuse_reports for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: AUDIT LOGS (admin read only; insert via service_role)
-- -----------------------------------------------------------------------------

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: ORGANIZATIONS (admin only for MVP)
-- -----------------------------------------------------------------------------

create policy "organizations_admin"
  on public.organizations for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

create policy "organization_members_admin"
  on public.organization_members for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

create policy "organization_locations_admin"
  on public.organization_locations for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: LEGAL DOCUMENTS
-- -----------------------------------------------------------------------------

create policy "legal_documents_select_active"
  on public.legal_documents for select
  to authenticated
  using (is_active = true);

create policy "legal_documents_admin"
  on public.legal_documents for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

create policy "legal_acceptances_all_own"
  on public.legal_acceptances for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "legal_acceptances_select_admin"
  on public.legal_acceptances for select
  to authenticated
  using (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: SYSTEM SETTINGS
-- -----------------------------------------------------------------------------

create policy "system_settings_select_authenticated"
  on public.system_settings for select
  to authenticated
  using (true);

create policy "system_settings_admin_write"
  on public.system_settings for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: ADMIN NOTES
-- -----------------------------------------------------------------------------

create policy "admin_notes_admin"
  on public.admin_notes for all
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- STORAGE BUCKET SETUP (run separately in Dashboard or via SQL below)
-- -----------------------------------------------------------------------------
--
-- Dashboard: Storage → New bucket
--
-- 1. responder-documents
--    - Name: responder-documents
--    - Public: OFF (private)
--    - File size limit: 10MB
--    - Allowed MIME: image/jpeg, image/png, application/pdf
--
-- 2. avatars (optional MVP)
--    - Name: avatars
--    - Public: OFF recommended (use signed URLs)
--
-- Storage RLS policies (run after bucket creation):
--
-- create policy "responder_docs_upload_own"
--   on storage.objects for insert to authenticated
--   with check (
--     bucket_id = 'responder-documents'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "responder_docs_read_own"
--   on storage.objects for select to authenticated
--   using (
--     bucket_id = 'responder-documents'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "responder_docs_admin_read"
--   on storage.objects for select to authenticated
--   using (
--     bucket_id = 'responder-documents'
--     and private.is_admin(auth.uid())
--   );
--
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- SEED ADMIN INSTRUCTION (manual — do NOT hardcode admin in migration)
-- -----------------------------------------------------------------------------
--
-- After you sign up via the app:
--
-- update public.profiles
-- set is_admin = true, user_type = 'admin'
-- where email = 'your-admin-email@example.com';
--
-- Verify:
-- select id, email, is_admin, user_type from public.profiles where is_admin = true;
--
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- POST-MIGRATION VERIFICATION QUERIES
-- -----------------------------------------------------------------------------
--
-- select tablename from pg_tables where schemaname = 'public' order by tablename;
-- select * from pg_extension where extname in ('postgis', 'pgcrypto');
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
--
-- -----------------------------------------------------------------------------
