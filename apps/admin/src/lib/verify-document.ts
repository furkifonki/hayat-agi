import { verifyDocumentStatusSchema, type VerifyDocumentStatusInput } from '@hayat-agi/shared';
import { createClient } from './supabase/client';

export interface VerifyDocumentResponse {
  document_id: string;
  status: 'approved' | 'rejected';
  responder_verification_status: string;
  all_required_approved: boolean;
}

export async function verifyDocument(
  input: VerifyDocumentStatusInput,
): Promise<VerifyDocumentResponse> {
  const parsed = verifyDocumentStatusSchema.parse(input);
  const supabase = createClient();

  const { data, error } = await supabase.functions.invoke('verify-document-status', {
    body: parsed,
  });

  if (error) {
    throw new Error(error.message || 'Belge durumu güncellenemedi');
  }

  return data as VerifyDocumentResponse;
}
