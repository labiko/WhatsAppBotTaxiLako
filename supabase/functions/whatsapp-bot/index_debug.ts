import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

// Test des variables d'environnement
const AI_AUDIO_ENABLED = Deno.env.get('AI_AUDIO_ENABLED') === 'true';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🚀 DEBUG - Fonction démarrée');
    console.log('🔧 DEBUG ENV - AI_AUDIO_ENABLED:', AI_AUDIO_ENABLED);
    console.log('🔧 DEBUG ENV - OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
    console.log('🔧 DEBUG ENV - TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
    console.log('🔧 DEBUG ENV - TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');

    // Parse du FormData
    const contentType = req.headers.get('Content-Type') || '';
    let from = '';
    let body = '';
    let mediaUrl0 = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('From')?.toString() || '';
      body = formData.get('Body')?.toString()?.trim() || '';
      mediaUrl0 = formData.get('MediaUrl0')?.toString() || '';
      
      console.log('📥 FormData reçu:');
      console.log('   From:', from);
      console.log('   Body:', body);
      console.log('   MediaUrl0:', mediaUrl0);
    }

    // Réponse simple
    const responseMessage = `✅ DEBUG OK
    
🔧 Variables:
- AI_AUDIO: ${AI_AUDIO_ENABLED}
- OpenAI: ${OPENAI_API_KEY ? 'SET' : 'NOT SET'}
- Twilio SID: ${TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}
- Twilio Token: ${TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET'}

📥 Données reçues:
- From: ${from}
- Body: ${body}
- Media: ${mediaUrl0 ? 'OUI' : 'NON'}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

    console.log('✅ Réponse envoyée avec succès');

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    });

  } catch (error) {
    console.error('💥 ERREUR GLOBALE:', error);
    console.error('💥 Stack:', error.stack);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>💥 Erreur: ${error.message}</Message>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    });
  }
});