import type {
  ConsentType,
  IncidentStatus,
  IncidentType,
  ReporterRelation,
  ResponderType,
  VerificationStatus,
} from '../constants/emergency-types';

export type UserType = 'citizen' | 'responder' | 'citizen_and_responder' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  user_type: UserType;
  is_admin: boolean;
  is_blocked: boolean;
  preferred_language: string;
  city: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  version: string;
  accepted: boolean;
  accepted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ResponderProfile {
  id: string;
  user_id: string;
  responder_type: ResponderType;
  verification_status: VerificationStatus;
  license_number: string | null;
  certificate_number: string | null;
  issuing_institution: string | null;
  workplace: string | null;
  bio: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  accepted_responder_terms: boolean;
  created_at: string;
  updated_at: string;
}

export type Status112 = 'called' | 'not_called' | 'unknown' | 'unable_to_call';

export interface Incident {
  id: string;
  created_by_user_id: string;
  affected_person_is_creator: boolean;
  reporter_relation: ReporterRelation;
  incident_type: IncidentType;
  severity_level: 'red' | 'orange' | 'yellow' | 'unknown';
  status: IncidentStatus;
  description: string | null;
  status_112: Status112;
  max_responders: number;
  accepted_responder_count: number;
  is_public_alert: boolean;
  is_test: boolean;
  cancel_reason: string | null;
  closed_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface IncidentLocation {
  id: string;
  incident_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  source: 'gps' | 'manual' | 'map_pin' | 'last_known';
  created_at: string;
}

export type AvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'busy'
  | 'on_incident'
  | 'suspended';

export interface ResponderLocation {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  availability_status: AvailabilityStatus;
  permission_scope: 'foreground' | 'background' | 'none';
  updated_at: string;
}
