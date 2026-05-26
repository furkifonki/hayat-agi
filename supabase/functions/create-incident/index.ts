import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { z } from 'https://esm.sh/zod@3.24.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const createIncidentSchema = z.object({
  incident_type: z.enum([
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
  ]),
  reporter_relation: z.enum(['self', 'bystander', 'family', 'coworker', 'unknown']).default('self'),
  affected_person_is_creator: z.boolean().default(true),
  status_112: z.enum(['called', 'not_called', 'unknown', 'unable_to_call']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().positive().optional(),
  description: z.string().optional(),
  is_test: z.boolean().optional(),
});

const requiredConsentTypes = ['kvkk_notice', 'terms_of_use', 'explicit_consent_location'] as const;

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

    const body = createIncidentSchema.parse(await req.json());

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_blocked')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.is_blocked) {
      return new Response(JSON.stringify({ error: 'User is blocked' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: consents, error: consentError } = await supabaseAdmin
      .from('user_consents')
      .select('consent_type, accepted')
      .eq('user_id', user.id)
      .in('consent_type', [...requiredConsentTypes])
      .eq('accepted', true);

    if (consentError) throw consentError;

    const consentSet = new Set(
      ((consents ?? []) as Array<{ consent_type: string }>).map((c) => c.consent_type),
    );
    const missing = requiredConsentTypes.filter((type) => !consentSet.has(type));

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Required consents are missing',
          missing_consents: missing,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('incidents')
      .insert({
        created_by_user_id: user.id,
        affected_person_is_creator: body.affected_person_is_creator,
        reporter_relation: body.reporter_relation,
        incident_type: body.incident_type,
        status_112: body.status_112,
        description: body.description ?? null,
        status: 'created',
        is_test: body.is_test ?? false,
      })
      .select('*')
      .single();

    if (incidentError) throw incidentError;

    const { data: incidentLocation, error: locationError } = await supabaseAdmin
      .from('incident_locations')
      .insert({
        incident_id: incident.id,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy_meters: body.accuracy_meters ?? null,
        source: 'gps',
      })
      .select('*')
      .single();

    if (locationError) throw locationError;

    const { error: eventError } = await supabaseAdmin
      .from('incident_status_events')
      .insert({
        incident_id: incident.id,
        actor_user_id: user.id,
        event_type: 'incident_created',
        old_status: null,
        new_status: 'created',
        metadata: {
          status_112: body.status_112,
          reporter_relation: body.reporter_relation,
          affected_person_is_creator: body.affected_person_is_creator,
        },
      });

    if (eventError) throw eventError;

    // Sprint 6'da gerçek eşleştirme/notify; şimdilik lifecycle adımı için event ekleniyor.
    await supabaseAdmin
      .from('incident_status_events')
      .insert({
        incident_id: incident.id,
        actor_user_id: user.id,
        event_type: 'notification_pipeline_queued',
        old_status: 'created',
        new_status: 'notifying_responders',
        metadata: { queued: true, strategy: 'sprint3_stub' },
      });

    return new Response(
      JSON.stringify({
        incident_id: incident.id,
        incident,
        incident_location: incidentLocation,
        status: incident.status,
        next_step: 'send-incident-notifications (Sprint 6)',
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
