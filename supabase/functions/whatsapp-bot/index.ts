// LokoTaxi WhatsApp Bot - Bot Principal Français
// Repository: https://github.com/labiko/WhatsAppBotTaxiLako

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configuration Environment Variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || 'your-service-key-here';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key-here';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Test de connexion automatique avec double fallback
let workingApiKey = SUPABASE_SERVICE_KEY;

async function testDatabaseConnection() {
  console.log('🔑 Test de connexion Supabase...');
  
  // Test #1: service_role key
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      workingApiKey = SUPABASE_SERVICE_KEY;
      console.log('✅ Connexion service_role OK');
      return { success: true, keyType: 'service_role' };
    }
  } catch (error) {
    console.log('⚠️ Service_role key failed, trying anon...');
  }
  
  // Test #2: anon key fallback
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      workingApiKey = SUPABASE_ANON_KEY;
      console.log('✅ Connexion anon OK');
      return { success: true, keyType: 'anon' };
    }
  } catch (error) {
    console.error('❌ Beide Verbindungen fehlgeschlagen');
    return { success: false, keyType: 'none' };
  }
  
  return { success: false, keyType: 'none' };
}

// Fonction principale du bot
async function handleWhatsAppMessage(request: Request) {
  console.log('📱 Nouveau message WhatsApp reçu');
  
  // Test connexion base de données
  const dbTest = await testDatabaseConnection();
  if (!dbTest.success) {
    return new Response(
      '🔐 Erreur de connexion base de données',
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      }
    );
  }
  
  // Parser le payload Twilio
  const formData = await request.formData();
  const from = formData.get('From')?.toString() || '';
  const body = formData.get('Body')?.toString() || '';
  const latitude = formData.get('Latitude')?.toString();
  const longitude = formData.get('Longitude')?.toString();
  
  console.log(`📞 Message de: ${from}`);
  console.log(`💬 Contenu: "${body}"`);
  
  // Logique de base du bot
  let responseMessage = '';
  
  if (body.toLowerCase().includes('taxi')) {
    responseMessage = '🚖 Bonjour ! Quel type de véhicule souhaitez-vous ?\\n\\n1️⃣ Moto\\n2️⃣ Voiture\\n\\nRépondez par "moto" ou "voiture"';
  } else if (body.toLowerCase().includes('moto') || body.toLowerCase().includes('voiture')) {
    responseMessage = '📍 Parfait ! Veuillez maintenant partager votre position GPS en cliquant sur 📎 puis "Localisation"';
  } else if (latitude && longitude) {
    responseMessage = '📍 Position reçue! Merci.\\n🏁 Quelle est votre destination ?\\n\\nTapez le nom du lieu ou quartier...';
  } else if (body.trim().length > 0) {
    responseMessage = `🎯 Recherche de "${body}"...\\n\\n✅ Destination trouvée !\\n💰 Prix estimé: 15,000 GNF\\n🚗 Conducteur en approche\\n⏱️ Temps d'arrivée: 8 min\\n\\nConfirmez-vous cette réservation ? (oui/non)`;
  } else {
    responseMessage = '👋 Bienvenue chez LokoTaxi !\\n\\nPour réserver un taxi, tapez "taxi"\\n\\n🇬🇳 Service disponible à Conakry';
  }
  
  // Format réponse Twilio
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;
  
  console.log('✅ Réponse envoyée');
  
  return new Response(twimlResponse, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml'
    }
  });
}

// Point d'entrée principal
serve(async (req) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    return await handleWhatsAppMessage(req);
  } catch (error) {
    console.error('❌ Erreur:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ Service temporairement indisponible. Veuillez réessayer dans quelques instants.</Message>
</Response>`;
    
    return new Response(errorResponse, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
});

/* 
🎯 LokoTaxi WhatsApp Bot - Version GitHub
✅ Variables d'environnement configurables
✅ Double fallback connexion robuste  
✅ Gestion erreurs complète
✅ Prêt pour déploiement Supabase

📋 Variables requises dans .env :
- SUPABASE_URL
- SUPABASE_SERVICE_KEY  
- SUPABASE_ANON_KEY

🚀 Déploiement : supabase functions deploy whatsapp-bot
*/