/** Admin-only — Sprint 4 implementation */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  return new Response(JSON.stringify({ message: 'Stub — Sprint 4 admin document review' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
