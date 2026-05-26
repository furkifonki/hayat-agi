import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { z } from 'https://esm.sh/zod@3.24.2';
import { corsHeaders } from '../_shared/cors.ts';
import { queueVerificationNotification } from '../_shared/push-notification.ts';

const DOCUMENT_TYPES = [
  'identity_optional',
  'medical_license',
  'nurse_license',
  'paramedic_certificate',
  'first_aid_certificate',
  'other',
] as const;

const RESPONDER_TYPES = [
  'doctor',
  'nurse',
  'paramedic',
  'emt',
  'first_aider',
  'other_healthcare',
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];
type ResponderType = (typeof RESPONDER_TYPES)[number];

function getRequiredDocumentType(responderType: ResponderType): DocumentType {
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

const requestSchema = z
  .object({
    document_id: z.string().uuid(),
    action: z.enum(['approve', 'reject']),
    rejection_reason: z.string().min(3).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'reject' && !data.rejection_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rejection_reason required when rejecting',
        path: ['rejection_reason'],
      });
    }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, is_blocked')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !adminProfile?.is_admin || adminProfile.is_blocked) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = requestSchema.parse(await req.json());

    const { data: document, error: docError } = await supabaseAdmin
      .from('responder_documents')
      .select('*')
      .eq('id', body.document_id)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('responder_profiles')
      .select('id, user_id, responder_type, verification_status')
      .eq('id', document.responder_profile_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Responder profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    if (body.action === 'reject') {
      const reason = body.rejection_reason!.trim();

      const { error: docUpdateError } = await supabaseAdmin
        .from('responder_documents')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: now,
          rejection_reason: reason,
        })
        .eq('id', body.document_id);

      if (docUpdateError) throw docUpdateError;

      const { error: profileUpdateError } = await supabaseAdmin
        .from('responder_profiles')
        .update({
          verification_status: 'rejected',
          rejection_reason: reason,
          verified_at: null,
          verified_by: null,
        })
        .eq('id', profile.id);

      if (profileUpdateError) throw profileUpdateError;

      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: user.id,
        action: 'responder_document_rejected',
        target_table: 'responder_documents',
        target_id: body.document_id,
        metadata: { reason, responder_user_id: profile.user_id },
      });

      await queueVerificationNotification(
        supabaseAdmin,
        profile.user_id,
        'verification_rejected',
        { document_id: body.document_id, reason },
      );

      return new Response(
        JSON.stringify({
          document_id: body.document_id,
          status: 'rejected',
          responder_verification_status: 'rejected',
          all_required_approved: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: approveDocError } = await supabaseAdmin
      .from('responder_documents')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_reason: null,
      })
      .eq('id', body.document_id);

    if (approveDocError) throw approveDocError;

    const requiredType = getRequiredDocumentType(profile.responder_type);

    const { data: allDocs, error: allDocsError } = await supabaseAdmin
      .from('responder_documents')
      .select('id, document_type, status')
      .eq('responder_profile_id', profile.id);

    if (allDocsError) throw allDocsError;

    const allRequiredApproved = (allDocs ?? []).some(
      (doc) => doc.document_type === requiredType && doc.status === 'approved',
    );

    let responderVerificationStatus = profile.verification_status;

    if (allRequiredApproved) {
      const { error: profileApproveError } = await supabaseAdmin
        .from('responder_profiles')
        .update({
          verification_status: 'approved',
          rejection_reason: null,
          verified_at: now,
          verified_by: user.id,
        })
        .eq('id', profile.id);

      if (profileApproveError) throw profileApproveError;

      await supabaseAdmin
        .from('profiles')
        .update({ user_type: 'citizen_and_responder' })
        .eq('id', profile.user_id);

      responderVerificationStatus = 'approved';

      await queueVerificationNotification(
        supabaseAdmin,
        profile.user_id,
        'verification_approved',
        { document_id: body.document_id },
      );
    } else if (profile.verification_status !== 'approved') {
      await supabaseAdmin
        .from('responder_profiles')
        .update({ verification_status: 'pending_review', rejection_reason: null })
        .eq('id', profile.id);

      responderVerificationStatus = 'pending_review';
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'responder_document_approved',
      target_table: 'responder_documents',
      target_id: body.document_id,
      metadata: {
        responder_user_id: profile.user_id,
        all_required_approved: allRequiredApproved,
        required_document_type: requiredType,
      },
    });

    return new Response(
      JSON.stringify({
        document_id: body.document_id,
        status: 'approved',
        responder_verification_status: responderVerificationStatus,
        all_required_approved: allRequiredApproved,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
