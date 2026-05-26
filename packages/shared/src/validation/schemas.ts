import { z } from 'zod';
import {
  CONSENT_TYPES,
  INCIDENT_TYPES,
  REPORTER_RELATIONS,
  RESPONDER_TYPES,
} from '../constants/emergency-types';

export const signUpSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin').optional(),
  role_intention: z.enum(['citizen', 'healthcare', 'first_aider']).default('citizen'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Şifre gerekli'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const profileSetupSchema = z.object({
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin'),
  city: z.string().optional(),
  date_of_birth: z.string().optional(),
  preferred_language: z.string().default('tr'),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;

export const consentRecordSchema = z.object({
  consent_type: z.enum(CONSENT_TYPES),
  version: z.string().default('1.0'),
  accepted: z.literal(true),
});

export const createIncidentSchema = z.object({
  incident_type: z.enum(INCIDENT_TYPES),
  reporter_relation: z.enum(REPORTER_RELATIONS).default('self'),
  affected_person_is_creator: z.boolean().default(true),
  status_112: z.enum(['called', 'not_called', 'unknown', 'unable_to_call']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().positive().optional(),
  description: z.string().max(1000).optional(),
  is_test: z.boolean().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const updateResponderLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().positive().optional(),
  availability_status: z.enum([
    'available',
    'unavailable',
    'busy',
    'on_incident',
    'suspended',
  ]),
});

export const acceptIncidentSchema = z.object({
  incident_id: z.string().uuid(),
});

export const closeIncidentSchema = z.object({
  incident_id: z.string().uuid(),
  closed_reason: z.string().min(1).max(500),
  status_112: z
    .enum(['called', 'not_called', 'unknown', 'unable_to_call'])
    .optional(),
});

export const responderProfileSchema = z.object({
  responder_type: z.enum(RESPONDER_TYPES),
  license_number: z.string().optional(),
  certificate_number: z.string().optional(),
  issuing_institution: z.string().min(2).optional(),
  workplace: z.string().optional(),
  bio: z.string().max(500).optional(),
  accepted_responder_terms: z.literal(true),
});

export type ResponderProfileInput = z.infer<typeof responderProfileSchema>;

export const verifyDocumentStatusSchema = z
  .object({
    document_id: z.string().uuid(),
    action: z.enum(['approve', 'reject']),
    rejection_reason: z.string().min(3).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'reject' && !data.rejection_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Red nedeni zorunludur',
        path: ['rejection_reason'],
      });
    }
  });

export type VerifyDocumentStatusInput = z.infer<typeof verifyDocumentStatusSchema>;
