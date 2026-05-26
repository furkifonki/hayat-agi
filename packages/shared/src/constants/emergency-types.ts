export const INCIDENT_TYPES = [
  'traffic_accident',
  'fainting_unconscious',
  'breathing_problem',
  'suspected_heart_attack',
  'bleeding',
  'burn',
  'drowning',
  'seizure',
  'fall_injury',
  'fire_smoke',
  'unknown',
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  traffic_accident: 'Trafik kazası',
  fainting_unconscious: 'Bayılma / bilinç kaybı',
  breathing_problem: 'Solunum problemi',
  suspected_heart_attack: 'Kalp krizi şüphesi',
  bleeding: 'Kanama',
  burn: 'Yanık',
  drowning: 'Boğulma',
  seizure: 'Nöbet',
  fall_injury: 'Düşme / yaralanma',
  fire_smoke: 'Yangın / duman',
  unknown: 'Emin değilim',
};

export const REPORTER_RELATIONS = [
  'self',
  'bystander',
  'family',
  'coworker',
  'unknown',
] as const;

export type ReporterRelation = (typeof REPORTER_RELATIONS)[number];

export const RESPONDER_TYPES = [
  'doctor',
  'nurse',
  'paramedic',
  'emt',
  'first_aider',
  'other_healthcare',
] as const;

export type ResponderType = (typeof RESPONDER_TYPES)[number];

export const RESPONDER_TYPE_LABELS: Record<ResponderType, string> = {
  doctor: 'Doktor',
  nurse: 'Hemşire',
  paramedic: 'Paramedik',
  emt: 'Acil tıp teknisyeni',
  first_aider: 'Sertifikalı ilk yardımcı',
  other_healthcare: 'Diğer sağlık profesyoneli',
};

export const VERIFICATION_STATUSES = [
  'not_started',
  'pending_review',
  'approved',
  'rejected',
  'suspended',
  'expired',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const INCIDENT_STATUSES = [
  'created',
  'locating',
  'notifying_responders',
  'responder_assigned',
  'responder_on_the_way',
  'responder_arrived',
  'ambulance_arrived',
  'closed',
  'cancelled',
  'expired',
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const CONSENT_TYPES = [
  'kvkk_notice',
  'explicit_consent_location',
  'explicit_consent_health_data',
  'terms_of_use',
  'responder_terms',
  'push_notifications',
  'emergency_contact_permission',
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];
