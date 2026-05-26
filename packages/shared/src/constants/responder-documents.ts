import type { ResponderType } from './emergency-types';

export const DOCUMENT_TYPES = [
  'identity_optional',
  'medical_license',
  'nurse_license',
  'paramedic_certificate',
  'first_aid_certificate',
  'other',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  identity_optional: 'Kimlik (isteğe bağlı)',
  medical_license: 'Tıp hekimliği belgesi',
  nurse_license: 'Hemşirelik belgesi',
  paramedic_certificate: 'Paramedik sertifikası',
  first_aid_certificate: 'İlk yardım sertifikası',
  other: 'Diğer mesleki belge',
};

/** Primary document required per responder type for MVP verification */
export function getRequiredDocumentType(responderType: ResponderType): DocumentType {
  switch (responderType) {
    case 'doctor':
      return 'medical_license';
    case 'nurse':
      return 'nurse_license';
    case 'paramedic':
    case 'emt':
      return 'paramedic_certificate';
    case 'first_aider':
      return 'first_aid_certificate';
    default:
      return 'other';
  }
}
