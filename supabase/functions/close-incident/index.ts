import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { z } from 'https://esm.sh/zod@3.24.2';
import { corsHeaders } from '../_shared/cors.ts';

const schema = z.object({
  incident_id: z.string().uuid(),
  closed_reason: z.string().min(1),
  status_112: z.enum(['called', 'not_called', 'unknown', 'unable_to_call']).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = schema.parse(await req.json());
    // Sprint 7: validate creator/admin, close incident, stop notifications
    return new Response(JSON.stringify({ message: 'Stub — Sprint 7', payload: body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
