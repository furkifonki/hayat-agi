import type { Profile, ResponderProfile } from '../types';

/** Required consents before creating an emergency incident */
export const REQUIRED_INCIDENT_CONSENTS = [
  'kvkk_notice',
  'terms_of_use',
  'explicit_consent_location',
] as const;

/** Required consents for responder onboarding */
export const REQUIRED_RESPONDER_CONSENTS = [
  'kvkk_notice',
  'terms_of_use',
  'responder_terms',
  'explicit_consent_location',
] as const;

export function canAccessResponderMode(profile: Profile, responder?: ResponderProfile | null): boolean {
  if (profile.is_blocked) return false;
  if (!responder) return false;
  return ['pending_review', 'approved', 'rejected'].includes(responder.verification_status);
}

export function canReceiveIncidentAlerts(responder?: ResponderProfile | null, profile?: Profile | null): boolean {
  if (!responder || !profile) return false;
  if (profile.is_blocked) return false;
  return responder.verification_status === 'approved' && responder.accepted_responder_terms;
}

export function isAdmin(profile?: Profile | null): boolean {
  return Boolean(profile?.is_admin && !profile?.is_blocked);
}

export function hasCompletedProfileSetup(profile?: Profile | null): boolean {
  return Boolean(profile?.full_name && profile?.phone);
}
