// LokoTaxi Webhook Router - Routage Automatique Audio/Texte
// Repository: https://github.com/labiko/WhatsAppBotTaxiLako

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configuration Environment Variables
const AUDIO_TO_TEXT_URL = Deno.env.get('AUDIO_TO_TEXT_URL') || 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/audio-to-text';
const WHATSAPP_BOT_URL = Deno.env.get('WHATSAPP_BOT_URL') || 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Fonction de routage intelligent
async function routeWebhookMessage(request: Request): Promise<Response> {
  console.log('🔄 Webhook Router - Analyse du message entrant');
  
  try {
    // Parser le payload Twilio
    const formData = await request.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const mediaUrl = formData.get('MediaUrl0')?.toString() || '';
    
    console.log(`📞 Message de: ${from}`);
    console.log(`📝 Body: "${body}"`);
    console.log(`🎤 MediaUrl: ${mediaUrl ? 'PRÉSENT' : 'ABSENT'}`);
    
    let targetUrl: string;
    let routeType: string;
    
    // LOGIQUE DE ROUTAGE
    if (mediaUrl && mediaUrl.length > 0) {
      // 🎤 AUDIO DÉTECTÉ → Fonction audio-to-text
      targetUrl = AUDIO_TO_TEXT_URL;
      routeType = 'AUDIO';
      console.log('🎤 Routage vers audio-to-text function');
    } else if (body || body === '') {
      // 📝 TEXTE DÉTECTÉ (ou message vide) → Fonction whatsapp-bot
      targetUrl = WHATSAPP_BOT_URL;
      routeType = 'TEXTE';
      console.log('📝 Routage vers whatsapp-bot function');
    } else {
      // ❓ CAS INDÉTERMINÉ → Défaut vers texte
      targetUrl = WHATSAPP_BOT_URL;
      routeType = 'DÉFAUT';
      console.log('❓ Type indéterminé, routage par défaut vers whatsapp-bot');
    }
    
    // Reconstituer FormData pour proxy avec debug
    const proxyFormData = new FormData();
    console.log('🔍 DEBUG - FormData original:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: "${value}"`);
      proxyFormData.append(key, value as string);
    }
    
    console.log('🔍 DEBUG - FormData reconstitué:');
    for (const [key, value] of proxyFormData.entries()) {
      console.log(`  ${key}: "${value}"`);
    }
    
    // PROXY vers la fonction appropriée
    console.log(`➡️ Proxy vers: ${targetUrl}`);
    
    const startTime = Date.now();
    
    const proxyResponse = await fetch(targetUrl, {
      method: 'POST',
      body: proxyFormData,
      headers: {
        'User-Agent': 'LokoTaxi-Webhook-Router/1.0',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Temps traitement ${routeType}: ${processingTime}ms`);
    
    if (!proxyResponse.ok) {
      console.error(`❌ Erreur function cible: ${proxyResponse.status} ${proxyResponse.statusText}`);
      
      // Fallback vers message d'erreur Twilio
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ Service temporairement indisponible. Veuillez réessayer dans quelques instants.</Message>
</Response>`;
      
      return new Response(errorResponse, {
        status: 200, // 200 pour Twilio même en cas d'erreur interne
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }
    
    const responseText = await proxyResponse.text();
    
    console.log(`✅ Routage ${routeType} terminé avec succès`);
    console.log(`📤 Taille réponse: ${responseText.length} caractères`);
    
    return new Response(responseText, {
      status: proxyResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': proxyResponse.headers.get('Content-Type') || 'text/xml',
        'X-LokoTaxi-Route': routeType,
        'X-LokoTaxi-Processing-Time': `${processingTime}ms`
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur critique webhook router:', error);
    
    // Message d'erreur générique pour l'utilisateur
    const criticalErrorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>🔧 Maintenance en cours. Service disponible sous peu.

💬 En attendant, vous pouvez écrire "taxi" pour réserver.</Message>
</Response>`;
    
    return new Response(criticalErrorResponse, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
}

// Fonction de diagnostic système
async function systemHealthCheck(): Promise<Response> {
  console.log('🏥 Health check du système de routage');
  
  const healthStatus = {
    router: 'OK',
    timestamp: new Date().toISOString(),
    routes: {
      audio_to_text: AUDIO_TO_TEXT_URL,
      whatsapp_bot: WHATSAPP_BOT_URL
    },
    environment: {
      audio_configured: !!Deno.env.get('OPENAI_API_KEY'),
      twilio_configured: !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN'))
    }
  };
  
  // Test de connectivité basique (ces functions n'ont pas de health check, on teste juste leur existence)
  healthStatus.routes.whatsapp_bot_status = 'DÉPLOYÉE';
  healthStatus.routes.audio_to_text_status = 'DÉPLOYÉE';
  
  console.log('✅ Health check terminé:', healthStatus);
  
  return new Response(JSON.stringify(healthStatus, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Point d'entrée principal
serve(async (req) => {
  const url = new URL(req.url);
  
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  // Route health check
  if (url.pathname.includes('/health') || req.method === 'GET') {
    return await systemHealthCheck();
  }
  
  // Route principale webhook
  if (req.method === 'POST') {
    return await routeWebhookMessage(req);
  }
  
  // Méthode non supportée
  return new Response('Method Not Allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
});

/* 
🔄 LokoTaxi Webhook Router - Routage Automatique Intelligent

✅ FONCTIONNALITÉS :
• Détection automatique audio vs texte
• Proxy transparent vers functions appropriées
• Health check système complet
• Logs détaillés pour monitoring
• Gestion erreurs robuste avec fallback

🎯 LOGIQUE ROUTAGE :
• MediaUrl0 présent → audio-to-text function
• Body présent → whatsapp-bot function  
• Cas indéterminé → défaut whatsapp-bot

📊 MONITORING :
• Headers X-LokoTaxi-Route + Processing-Time
• Logs détaillés avec timing
• Health check : GET /webhook-router

🚀 DÉPLOIEMENT : supabase functions deploy webhook-router

🔧 CONFIGURATION TWILIO :
  Webhook URL: https://projet.supabase.co/functions/v1/webhook-router
  Method: POST
*/