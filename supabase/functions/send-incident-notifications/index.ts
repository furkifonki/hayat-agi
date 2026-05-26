/** Internal function — called by create-incident. Sprint 6 implementation. */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Uses service_role to query responder_locations with PostGIS ST_DWithin
  // Creates incident_responders + incident_notifications rows
  // Sends Expo push notifications
  return new Response(JSON.stringify({ message: 'Stub — Sprint 6 internal notification dispatcher' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
