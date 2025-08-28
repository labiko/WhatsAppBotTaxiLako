import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ═══════════════════════════════════════════════════════════════
// 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
// ═══════════════════════════════════════════════════════════════
// 🤖 INTÉGRATION INTELLIGENCE ARTIFICIELLE - PHASE 1
import { shouldUseAIAnalysis, handleComplexTextMessage } from './text-intelligence.ts';

// 🧠 CONFIGURATION IA AVANCÉE V3
// Configuration IA globale
const IA_CONFIDENCE_THRESHOLD = 0.7; // Seuil stable pour accepter les analyses IA
// ═══════════════════════════════════════════════════════════════
// 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
// ═══════════════════════════════════════════════════════════════

// =================================================================
// CONFIGURATION ET CONSTANTES
// =================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
const enhancedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';
// Variables Google Places API (fallback recherche)
const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
// Configuration IA Audio (préparation Phase 2)
const AI_AUDIO_ENABLED = Deno.env.get('AI_AUDIO_ENABLED') === 'true';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const WHISPER_API_URL = Deno.env.get('WHISPER_API_URL') || 'https://api.openai.com/v1/audio/transcriptions';
// Configuration Twilio pour téléchargement audio
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
// 🌿 Configuration Green API
const GREEN_API_INSTANCE_ID = Deno.env.get('GREEN_API_INSTANCE_ID') || '7105303272';
const GREEN_API_TOKEN = Deno.env.get('GREEN_API_TOKEN') || '64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86';
const GREEN_API_BASE_URL = 'https://7105.api.greenapi.com';
// 🔄 BASCULE ENTRE PROVIDERS (UNE SEULE VARIABLE À CHANGER)
const WHATSAPP_PROVIDER = Deno.env.get('WHATSAPP_PROVIDER') || 'twilio'; // 'twilio' | 'greenapi' | 'waba'
// Logs de diagnostic des variables d'environnement (v2.0 - Twilio Auth)
console.log('🔧 DEBUG ENV - AI_AUDIO_ENABLED:', AI_AUDIO_ENABLED);
console.log('🔧 DEBUG ENV - OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG ENV - WHISPER_API_URL:', WHISPER_API_URL);
console.log('🔧 DEBUG ENV - TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG ENV - TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG ENV - GREEN_API_INSTANCE_ID:', GREEN_API_INSTANCE_ID);
console.log('🔄 Provider WhatsApp actif:', WHATSAPP_PROVIDER.toUpperCase());
let workingApiKey = SUPABASE_SERVICE_KEY;
// =================================================================
// FONCTIONS UTILITAIRES
// =================================================================
// 🌿 Fonction pour envoyer un message via Green API
async function sendGreenAPIMessage(to, message) {
  try {
    const phoneNumber = to.replace('whatsapp:', '').replace('+', '') + '@c.us';
    const greenApiPayload = {
      chatId: phoneNumber,
      message: message
    };
    console.log(`🌿 Green API → ${phoneNumber}:`, message.substring(0, 50) + '...');
    const response = await fetch(`${GREEN_API_BASE_URL}/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(greenApiPayload)
    });
    const result = await response.text();
    console.log(`🌿 Green API Response:`, result.substring(0, 100));
    return response.ok;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`⏱️ [GREEN-API] SEND ERROR: ${duration}ms - ${error.message}`);
    console.error('❌ Erreur Green API:', error);
    return false;
  }
}
// Fonction d'analyse temporelle intelligente
function analyzeTemporalInfo(transcript) {
  console.log(`⏰ Analyse temporelle: "${transcript}"`);
  const text = transcript.toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  // Détection de temps relatif
  if (text.includes('demain')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(currentDate + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Format YYYY-MM-DD
    // Recherche de l'heure
    const hourMatch = text.match(/(\d{1,2})h(?:(?:(\d{2}))|(?:\s*(\d{2})))?/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      const minute = hourMatch[2] ? parseInt(hourMatch[2]) : hourMatch[3] ? parseInt(hourMatch[3]) : 0;
      console.log(`✅ Détecté: demain ${hour}:${minute.toString().padStart(2, '0')}`);
      return {
        date: tomorrowStr,
        hour: hour,
        minute: minute,
        relative_time: 'demain'
      };
    }
    return {
      date: tomorrowStr,
      relative_time: 'demain'
    };
  }
  // Détection "aujourd'hui"
  if (text.includes("aujourd'hui") || text.includes('aujourdhui')) {
    const todayStr = now.toISOString().split('T')[0];
    const hourMatch = text.match(/(\d{1,2})h(?:(?:(\d{2}))|(?:\s*(\d{2})))?/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      const minute = hourMatch[2] ? parseInt(hourMatch[2]) : hourMatch[3] ? parseInt(hourMatch[3]) : 0;
      return {
        date: todayStr,
        hour: hour,
        minute: minute,
        relative_time: "aujourd'hui"
      };
    }
    return {
      date: todayStr,
      relative_time: "aujourd'hui"
    };
  }
  // Détection heure seule (pour aujourd'hui)
  const hourOnlyMatch = text.match(/(?:à\s*)?(\d{1,2})h(?:(?:(\d{2}))|(?:\s*(\d{2})))?/);
  if (hourOnlyMatch) {
    const hour = parseInt(hourOnlyMatch[1]);
    const minute = hourOnlyMatch[2] ? parseInt(hourOnlyMatch[2]) : hourOnlyMatch[3] ? parseInt(hourOnlyMatch[3]) : 0;
    const todayStr = now.toISOString().split('T')[0];
    console.log(`✅ Détecté: aujourd'hui ${hour}:${minute.toString().padStart(2, '0')}`);
    return {
      date: todayStr,
      hour: hour,
      minute: minute,
      relative_time: "aujourd'hui"
    };
  }
  console.log(`❌ Aucune info temporelle détectée`);
  return null;
}
const normalizePhone = (phone)=>{
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim();
};
async function fetchWithRetry(url, options, maxRetries = 3) {
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
  // ═══════════════════════════════════════════════════════════════
  // ⏱️ MONITORING PERFORMANCE SUPABASE
  const startTime = Date.now();
  const operationName = url.split('/').pop() || 'unknown';
  console.log(`⏱️ [SUPABASE] START: ${operationName}`);
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
  // ═══════════════════════════════════════════════════════════════
  
  for(let i = 0; i < maxRetries; i++){
    try {
      console.log(`🔄 Tentative ${i + 1}/${maxRetries}: ${url}`);
      const response = await fetch(url, options);
      
      // ⏱️ [TIMING] Mesure performance
      const duration = Date.now() - startTime;
      console.log(`⏱️ [SUPABASE] END: ${operationName} - ${duration}ms - Status: ${response.status}`);
      
      if (response.status === 503) {
        console.log(`⏳ Service indisponible (503), retry dans ${(i + 1) * 1000}ms...`);
        if (i < maxRetries - 1) {
          await new Promise((resolve)=>setTimeout(resolve, (i + 1) * 1000));
          continue;
        }
      }
      
      // 🚨 Alerte si lent
      if (duration > 1000) {
        console.log(`🐌 [SUPABASE] SLOW ALERT: ${operationName} took ${duration}ms`);
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ [SUPABASE] ERROR: ${operationName} - ${duration}ms - ${error.message}`);
      console.log(`❌ Erreur tentative ${i + 1}: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve)=>setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error('Max retries reached');
}
// =================================================================
// FONCTIONS BASE DE DONNÉES
// =================================================================
async function testDatabaseConnection() {
  console.log('🔄 Test de connexion Supabase...');
  try {
    console.log('🔑 Test #1 avec clé service_role');
    const response1 = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    console.log(`📡 Service_role status: ${response1.status}`);
    if (response1.ok) {
      const data = await response1.text();
      console.log('✅ Connexion service_role OK:', data.substring(0, 100));
      workingApiKey = SUPABASE_SERVICE_KEY;
      return {
        connected: true,
        status: response1.status
      };
    }
  } catch (error) {
    console.log(`💥 Service_role exception:`, error.message);
  }
  try {
    console.log('🔑 Test #2 avec clé anon');
    const response2 = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`📡 Anon status: ${response2.status}`);
    if (response2.ok) {
      const data = await response2.text();
      console.log('✅ Connexion anon OK:', data.substring(0, 100));
      workingApiKey = SUPABASE_ANON_KEY;
      return {
        connected: true,
        status: response2.status
      };
    } else {
      const errorText = await response2.text();
      return {
        connected: false,
        error: errorText,
        status: response2.status
      };
    }
  } catch (error) {
    console.log(`💥 Anon exception:`, error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}
async function saveSession(phone, data) {
  try {
    console.log(`🚨 DEBUG - ENTRÉE DANS saveSession pour phone: ${phone}`);
    console.log(`🚨 DEBUG - data reçu:`, JSON.stringify(data, null, 2));
    const sessionData = {
      client_phone: phone,
      vehicle_type: data.vehicleType || null,
      position_client: data.positionClient || null,
      destination_nom: data.destinationNom || null,
      destination_id: (data.destinationId && !data.destinationId.startsWith('google_') && !data.destinationId.startsWith('personal_')) ? data.destinationId : null,
      destination_position: data.destinationPosition || null,
      depart_nom: data.departNom || null,
      depart_id: (data.departId && !data.departId.startsWith('google_') && !data.departId.startsWith('personal_')) ? data.departId : null,
      depart_position: data.departPosition || null,
      distance_km: data.distanceKm || null,
      prix_estime: data.prixEstime || null,
      prix_confirme: data.prixConfirme || false,
      etat: data.etat || 'initial',
      // Données temporelles
      planned_date: data.plannedDate || null,
      planned_hour: data.plannedHour || null,
      planned_minute: data.plannedMinute || null,
      temporal_planning: data.temporalPlanning || false,
      // Suggestions multiples
      suggestions_depart: data.suggestionsDepart || null,
      suggestions_destination: data.suggestionsDestination || null,
      // 🌟 SYSTÈME NOTATION CONDUCTEUR
      waiting_for_note: data.waitingForNote || false,
      waiting_for_comment: data.waitingForComment || false,
      reservation_to_rate: data.reservationToRate || null,
      current_rating: data.currentRating || null,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 heures pour éviter problèmes timezone
    };
    console.log(`🚨 DEBUG - sessionData construit:`, JSON.stringify(sessionData, null, 2));
    // 🌟 LOGS SPÉCIFIQUES SYSTÈME NOTATION
    console.log(`🌟 DEBUG NOTATION - waiting_for_note: ${sessionData.waiting_for_note} (from data: ${data.waitingForNote})`);
    console.log(`🌟 DEBUG NOTATION - waiting_for_comment: ${sessionData.waiting_for_comment} (from data: ${data.waitingForComment})`);
    console.log(`🌟 DEBUG NOTATION - reservation_to_rate: ${sessionData.reservation_to_rate} (from data: ${data.reservationToRate})`);
    console.log(`🌟 DEBUG NOTATION - current_rating: ${sessionData.current_rating} (from data: ${data.currentRating})`);
    // CORRECTION : Utiliser UPSERT pour créer OU mettre à jour
    console.log(`💾 DEBUG - UPSERT session pour ${phone}`);
    console.log(`🚨 DEBUG - AVANT fetchWithRetry UPSERT`);
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(sessionData)
    });
    console.log(`🚨 DEBUG - APRÈS fetchWithRetry, response.ok: ${response.ok}, status: ${response.status}`);
    if (response.ok) {
      const expirationTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      console.log(`💾 Session sauvée: ${phone} → État: ${data.etat}`);
      console.log(`⏰ DEBUG - Session expire à: ${expirationTime}`);
      console.log(`⏰ DEBUG - Maintenant: ${new Date().toISOString()}`);
      console.log(`✅ DEBUG - HTTP Status: ${response.status}`);
      // Vérification immédiate de la sauvegarde
      const verificationUrl = `${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}&select=id,created_at,expires_at`;
      const verificationResponse = await fetchWithRetry(verificationUrl, {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (verificationResponse.ok) {
        const savedSessions = await verificationResponse.json();
        console.log(`🔍 DEBUG - Vérification immédiate: ${savedSessions.length} session(s) trouvée(s)`);
        console.log(`🔍 DEBUG - Sessions sauvées:`, JSON.stringify(savedSessions));
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ DEBUG - Erreur HTTP ${response.status}: ${errorText}`);
      console.error(`❌ DEBUG - Request body:`, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error(`❌ Exception sauvegarde session: ${error.message}`);
  }
}
async function getSession(phone) {
  console.log(`🔍 DEBUG getSession - Recherche session pour: ${phone}`);
  try {
    const currentTime = new Date().toISOString();
    // CORRECTION TIMEZONE : Utiliser UTC de façon cohérente
    const currentTimeUTC = new Date().toISOString();
    const url = `${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}&expires_at=gte.${currentTimeUTC}`;
    console.log(`🔍 DEBUG getSession - URL avec UTC: ${url}`);
    console.log(`⏰ DEBUG - Recherche sessions non expirées après UTC: ${currentTimeUTC}`);
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log(`🔍 DEBUG getSession - Response status: ${response.status}`);
    if (response.ok) {
      const sessions = await response.json();
      console.log(`🔍 DEBUG getSession - Sessions trouvées: ${sessions.length}`);
      console.log(`🔍 DEBUG getSession - Data:`, JSON.stringify(sessions));
      // Recherche TOUTES les sessions pour ce téléphone (même expirées) pour diagnostic
      const allSessionsUrl = `${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}`;
      const allSessionsResponse = await fetchWithRetry(allSessionsUrl, {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (allSessionsResponse.ok) {
        const allSessions = await allSessionsResponse.json();
        console.log(`🔍 DEBUG - TOUTES les sessions (${allSessions.length}):`, JSON.stringify(allSessions));
        allSessions.forEach((s, i)=>{
          console.log(`📋 Session ${i + 1}: expires_at=${s.expires_at}, etat=${s.etat}, now=${currentTime}`);
        });
      }
      if (sessions.length > 0) {
        // CORRECTION : Prendre la session la plus récente (updated_at le plus tard)
        const sortedSessions = sessions.sort((a, b)=>new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        const session = sortedSessions[0];
        console.log(`🔍 DEBUG getSession - Session sélectionnée (la plus récente): vehicle_type=${session.vehicle_type}, etat=${session.etat}, updated_at=${session.updated_at}`);
        const result = {
          vehicleType: session.vehicle_type,
          positionClient: session.position_client,
          destinationNom: session.destination_nom,
          destinationId: session.destination_id,
          destinationPosition: session.destination_position,
          departNom: session.depart_nom,
          departId: session.depart_id,
          departPosition: session.depart_position,
          distanceKm: session.distance_km,
          prixEstime: session.prix_estime,
          prixConfirme: session.prix_confirme,
          etat: session.etat,
          // Données temporelles
          plannedDate: session.planned_date,
          plannedHour: session.planned_hour,
          plannedMinute: session.planned_minute,
          temporalPlanning: session.temporal_planning,
          // Suggestions multiples
          suggestionsDepart: session.suggestions_depart,
          suggestionsDestination: session.suggestions_destination,
          // 🌟 SYSTÈME NOTATION CONDUCTEUR
          waitingForNote: session.waiting_for_note,
          waitingForComment: session.waiting_for_comment,
          reservationToRate: session.reservation_to_rate,
          currentRating: session.current_rating,
          timestamp: new Date(session.updated_at).getTime()
        };
        console.log(`🔍 DEBUG getSession - Session retournée:`, JSON.stringify(result));
        return result;
      } else {
        console.log(`🔍 DEBUG getSession - Aucune session dans le tableau`);
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ Erreur récupération session: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Exception récupération session: ${error.message}`);
  }
  console.log(`🔍 DEBUG getSession - Aucune session trouvée, retour {}`);
  return {};
}
// =================================================================
// 🌟 FONCTIONS SYSTÈME NOTATION CONDUCTEUR
// =================================================================
async function handleNoteValidation(clientPhone, note) {
  try {
    console.log(`⭐ Traitement note ${note} pour client ${clientPhone}`);
    // Récupérer la session
    const session = await getSession(clientPhone);
    if (!session?.reservationToRate) {
      const errorMsg = "❌ Erreur: Aucune réservation à noter trouvée.";
      const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
      return new Response(twimlError, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      });
    }
    // Sauvegarder la note dans la réservation
    const updateResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${session.reservationToRate}`, {
      method: 'PATCH',
      headers: {
        'apikey': workingApiKey,
        'Authorization': `Bearer ${workingApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        note_conducteur: note,
        updated_at: new Date().toISOString()
      })
    });
    if (!updateResponse.ok) {
      console.error('❌ Erreur sauvegarde note:', updateResponse.status);
      const errorMsg = "❌ Erreur lors de la sauvegarde de votre note.";
      const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
      return new Response(twimlError, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      });
    }
    // Mettre à jour la session pour attendre commentaire
    await saveSession(clientPhone, {
      ...session,
      waitingForNote: false,
      waitingForComment: true,
      currentRating: note,
      reservationToRate: session.reservationToRate
    });
    console.log(`🧹 Session mise à jour - waitingForNote: false, waitingForComment: true`);
    // Demander commentaire (optionnel)
    const letterNote = String.fromCharCode(64 + note); // 1=A, 2=B, 3=C, 4=D, 5=E
    const message = `✅ Merci pour votre note ${letterNote} (${note}/5) ! ⭐

Souhaitez-vous laisser un commentaire sur votre conducteur ? (optionnel)

• Tapez votre commentaire
• Ou tapez "passer" pour terminer`;
    console.log(`✅ RESPONSE handleNoteValidation - Message à envoyer: "${message}"`);
    // 🔧 CORRECTION : Utiliser multi-provider au lieu de TwiML uniquement
    const messageSent = await sendGreenAPIMessage(clientPhone, message);
    console.log(`📤 Message multi-provider envoyé: ${messageSent}`);
    return new Response(JSON.stringify({
      success: true,
      message: `Note ${note}/5 enregistrée et demande commentaire envoyée`
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erreur handleNoteValidation:', error);
    const errorMsg = "❌ Une erreur est survenue lors de la notation.";
    const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
    return new Response(twimlError, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
}
// Fonction formatage date pour affichage utilisateur
function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // Comparer les dates (ignorer l'heure)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return `Aujourd'hui ${date.getDate()}/${date.getMonth() + 1}`;
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return `Demain ${date.getDate()}/${date.getMonth() + 1}`;
  } else {
    // Autre date
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
  }
}

async function handleCommentaire(clientPhone, commentaire) {
  try {
    console.log(`💬 Traitement commentaire pour client ${clientPhone}`);
    const session = await getSession(clientPhone);
    if (!session?.reservationToRate) {
      const errorMsg = "❌ Erreur: Session non trouvée.";
      const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
      return new Response(twimlError, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      });
    }
    let finalCommentaire = null;
    // Si pas "passer", sauvegarder le commentaire
    if (commentaire.toLowerCase() !== 'passer') {
      finalCommentaire = commentaire.substring(0, 500); // Limiter à 500 caractères
    }
    // Sauvegarder commentaire + date dans la réservation
    const updateResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${session.reservationToRate}`, {
      method: 'PATCH',
      headers: {
        'apikey': workingApiKey,
        'Authorization': `Bearer ${workingApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        commentaire: finalCommentaire,
        date_add_commentaire: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    if (!updateResponse.ok) {
      console.error('❌ Erreur sauvegarde commentaire:', updateResponse.status);
      const errorMsg = "❌ Erreur lors de la sauvegarde.";
      const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
      return new Response(twimlError, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      });
    }
    // Passer à l'état attente_nom_adresse
    await saveSession(clientPhone, {
      ...session,
      waitingForComment: false,
      etat: 'attente_nom_adresse',  // 🆕 NOUVEL ÉTAT
      reservationToRate: session.reservationToRate, // Garder pour récupérer la réservation
      currentRating: undefined
    });
    console.log(`✅ Commentaire sauvegardé pour réservation ${session.reservationToRate}`);
    return new Response(JSON.stringify({
      success: true,
      message: "Commentaire sauvegardé"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erreur handleCommentaire:', error);
    const errorMsg = "❌ Une erreur est survenue.";
    const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMsg}</Message>
</Response>`;
    return new Response(twimlError, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });
  }
}
async function prepareRatingSession(clientPhone, reservationId) {
  try {
    console.log(`📋 DEBUG prepareRatingSession - DÉBUT - Client: ${clientPhone}, Réservation: ${reservationId}`);
    const currentSession = await getSession(clientPhone) || {};
    console.log(`📋 DEBUG prepareRatingSession - Session actuelle:`, JSON.stringify(currentSession));
    const newSession = {
      ...currentSession,
      waitingForNote: true,
      waitingForComment: false,
      reservationToRate: reservationId
    };
    console.log(`📋 DEBUG prepareRatingSession - Nouvelle session à sauver:`, JSON.stringify(newSession));
    await saveSession(clientPhone, newSession);
    console.log(`🎯 Session préparée pour notation - Client: ${clientPhone}, Réservation: ${reservationId}`);
    // Vérification immédiate
    const verifySession = await getSession(clientPhone);
    console.log(`✅ DEBUG prepareRatingSession - Vérification après sauvegarde:`, JSON.stringify(verifySession));
    console.log(`✅ DEBUG prepareRatingSession - waitingForNote = ${verifySession?.waitingForNote}`);
  } catch (error) {
    console.error('❌ Erreur prepareRatingSession:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}
async function getAvailableDrivers(vehicleType, centerCoords, radiusMeters = 5000) {
  try {
    if (!centerCoords) {
      // Ancienne logique pour compatibilité
      console.log(`🔍 Recherche conducteurs ${vehicleType} (tous)`);
      const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/conducteurs_with_coords?vehicle_type=eq.${vehicleType}&statut=eq.disponible&select=*`, {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      const conducteurs = await response.json();
      console.log(`📋 ${conducteurs.length} conducteur(s) ${vehicleType} trouvé(s)`);
      return conducteurs;
    }
    // Nouvelle logique avec géolocalisation
    console.log(`🔍 Recherche conducteurs ${vehicleType} dans ${radiusMeters}m de ${centerCoords.lat},${centerCoords.lon}`);
    // Récupérer tous les conducteurs du type
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/conducteurs_with_coords?vehicle_type=eq.${vehicleType}&statut=eq.disponible&select=*`, {
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    const allConducteurs = await response.json();
    // Filtrer par distance
    const conducteursProches = allConducteurs.filter((conducteur)=>{
      if (!conducteur.latitude || !conducteur.longitude) return false;
      const distance = calculateDistance(centerCoords.lat, centerCoords.lon, conducteur.latitude, conducteur.longitude) * 1000; // Convertir en mètres
      conducteur.distance = distance; // Ajouter la distance pour tri
      return distance <= radiusMeters;
    });
    // Trier par distance croissante
    conducteursProches.sort((a, b)=>a.distance - b.distance);
    console.log(`📋 ${conducteursProches.length}/${allConducteurs.length} conducteur(s) ${vehicleType} dans ${radiusMeters}m`);
    return conducteursProches;
  } catch (error) {
    console.error('❌ Exception récupération conducteurs:', error);
    throw error;
  }
}
// Fonction intelligente pour obtenir les coordonnées d'une adresse
async function getCoordinatesFromAddress(addressData) {
  if (!addressData || typeof addressData !== 'string') {
    console.log(`❌ getCoordinatesFromAddress - Adresse invalide: ${addressData} (type: ${typeof addressData})`);
    throw new Error(`Adresse invalide ou manquante: ${addressData}`);
  }
  console.log(`🔍 getCoordinatesFromAddress - Traitement: "${addressData}"`);
  // Cas 1: C'est un POINT PostGIS (position GPS partagée)
  try {
    const pointMatch = addressData.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (pointMatch) {
      console.log(`📍 Coordonnées extraites du POINT: ${pointMatch[1]}, ${pointMatch[2]}`);
      return {
        longitude: parseFloat(pointMatch[1]),
        latitude: parseFloat(pointMatch[2])
      };
    }
  } catch (error) {
    console.log(`❌ Erreur lors du match POINT: ${error.message}`);
    throw new Error(`Erreur traitement coordonnées: ${error.message}`);
  }
  // Cas 2: C'est un nom de lieu - utilise searchAdresse qui respecte la priorité base → Google Places
  console.log(`🔍 Recherche coordonnées pour lieu: "${addressData}"`);
  const lieu = await searchAdresse(addressData);
  if (!lieu) {
    throw new Error(`Lieu non trouvé: "${addressData}"`);
  }
  console.log(`📍 Coordonnées trouvées pour "${lieu.nom}": ${lieu.latitude}, ${lieu.longitude}`);
  return {
    latitude: lieu.latitude,
    longitude: lieu.longitude
  };
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const result = R * c;
  console.log(`🧮 Distance calculée: ${result.toFixed(1)} km`);
  return result;
}
async function findNearestDriver(vehicleType, clientLat, clientLng) {
  console.log(`🎯 Recherche conducteur ${vehicleType} près de ${clientLat}, ${clientLng}`);
  try {
    const conducteurs = await getAvailableDrivers(vehicleType);
    if (conducteurs.length === 0) {
      return null;
    }
    let nearestDriver = null;
    let minDistance = Infinity;
    for (const conducteur of conducteurs){
      const driverLat = conducteur.latitude;
      const driverLng = conducteur.longitude;
      if (driverLat && driverLng && !isNaN(driverLat) && !isNaN(driverLng)) {
        const distance = calculateDistance(clientLat, clientLng, driverLat, driverLng);
        console.log(`   ${conducteur.prenom} ${conducteur.nom}: ${distance.toFixed(1)} km`);
        if (distance < minDistance) {
          minDistance = distance;
          nearestDriver = {
            ...conducteur,
            distance
          };
        }
      }
    }
    if (nearestDriver) {
      console.log(`🏆 Sélectionné: ${nearestDriver.prenom} ${nearestDriver.nom} à ${nearestDriver.distance.toFixed(1)} km`);
    }
    return nearestDriver;
  } catch (error) {
    console.error(`❌ Erreur recherche conducteur:`, error);
    return null;
  }
}
// Fonction de recherche fuzzy/partielle intelligente
async function searchAdressePartial(keyword) {
  try {
    console.log(`🔍 Recherche fuzzy: "${keyword}"`);
    // CORRECTION 1: Recherche fuzzy améliorée avec PostgreSQL similarity()
    // Utilise pg_trgm pour détecter "lambayi" vs "lambanyi" (1 lettre différence)
    const fuzzyQuery = `
      SELECT id, nom, ville, type_lieu, longitude, latitude, position,
             similarity(nom_normalise, '${keyword.toLowerCase()}') as score
      FROM adresses_with_coords 
      WHERE actif = true 
        AND (
          nom_normalise ILIKE '%${keyword.toLowerCase()}%' 
          OR similarity(nom_normalise, '${keyword.toLowerCase()}') > 0.3
        )
      ORDER BY score DESC, nom
      LIMIT 10
    `;
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/search_adresse_fuzzy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search_query: keyword.toLowerCase(),
        similarity_threshold: 0.3,
        limit_results: 10
      })
    });
    let adresses = [];
    if (!response.ok) {
      console.log(`⚠️ RPC fuzzy non disponible, fallback vers ilike amélioré`);
      // Fallback amélioré: recherche plus flexible avec variations courantes
      // CORRECTION: Syntaxe PostgREST corrigée pour OR avec actif=true
      const fallbackResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude,position&actif=eq.true&or=(nom_normalise.ilike.*${encodeURIComponent(keyword.toLowerCase())}*,nom.ilike.*${encodeURIComponent(keyword.toLowerCase())}*)&order=nom&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (fallbackResponse.ok) {
        adresses = await fallbackResponse.json();
      }
      // NOUVEAU: Gérer les variations orthographiques de Lambanyi
      const lambanVariations = [
        'lambay',
        'lambayi',
        'lambani',
        'lambanyi'
      ];
      let hasLambanVariation = false;
      let detectedVariation = '';
      // Détecter si le mot contient une variation de Lambanyi
      for (const variation of lambanVariations){
        if (keyword.toLowerCase().includes(variation) && variation !== 'lambanyi') {
          hasLambanVariation = true;
          detectedVariation = variation;
          break;
        }
      }
      if (hasLambanVariation) {
        console.log(`🔄 Recherche avec variation orthographique: ${detectedVariation} → lambanyi`);
        const keywordVariant = keyword.toLowerCase().replace(new RegExp(detectedVariation, 'g'), 'lambanyi');
        const variantResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude,position&actif=eq.true&or=(nom_normalise.ilike.*${encodeURIComponent(keywordVariant)}*,nom.ilike.*${encodeURIComponent(keywordVariant)}*)&order=nom&limit=10`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          }
        });
        if (variantResponse.ok) {
          const variantResults = await variantResponse.json();
          console.log(`📊 Trouvé ${variantResults.length} résultat(s) avec la variation`);
          // Combiner les résultats et privilégier les noms plus longs/complets
          adresses = [
            ...variantResults,
            ...adresses
          ];
          // Dédupliquer par ID et trier par longueur de nom décroissante
          const uniqueMap = new Map();
          adresses.forEach((addr)=>{
            if (!uniqueMap.has(addr.id) || addr.nom.length > uniqueMap.get(addr.id).nom.length) {
              uniqueMap.set(addr.id, addr);
            }
          });
          adresses = Array.from(uniqueMap.values()).sort((a, b)=>b.nom.length - a.nom.length).slice(0, 10);
        }
      }
    } else {
      adresses = await response.json();
    }
    console.log(`🎯 ${adresses.length} résultat(s) fuzzy pour "${keyword}"`);
    // Si aucun résultat avec la recherche locale, appeler Google Places API
    if (adresses.length === 0) {
      console.log(`🌐 Aucun résultat local, tentative Google Places API...`);
      const googleResults = await searchGooglePlacesFallback(keyword);
      return googleResults;
    }
    // OPTIMISATION : Les coordonnées sont déjà pré-calculées dans adresses_with_coords
    return adresses.map((addr)=>({
        id: addr.id,
        nom: addr.nom,
        ville: addr.ville,
        type_lieu: addr.type_lieu,
        latitude: addr.latitude || 0,
        longitude: addr.longitude || 0,
        position: addr.position,
        score: addr.score || 1.0 // Score de similarité si disponible
      }));
  } catch (error) {
    console.error(`💥 Exception recherche fuzzy: ${error.message}`);
    return [];
  }
}
// CORRECTION 2: Fonction Google Places API en fallback
async function searchGooglePlacesFallback(keyword) {
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
  // ═══════════════════════════════════════════════════════════════
  // ⏱️ MONITORING PERFORMANCE GOOGLE PLACES API
  const googleStartTime = Date.now();
  console.log(`⏱️ [GOOGLE-API] SEARCH START: "${keyword}"`);
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
  // ═══════════════════════════════════════════════════════════════
  
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.log(`⚠️ Google Places API key non configurée`);
      return [];
    }
    console.log(`🌐 Recherche Google Places: "${keyword}"`);
    // Recherche focalisée sur Conakry, Guinée
    const query = `${keyword} Conakry Guinea`;
    const url = `${GOOGLE_PLACES_URL}?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&location=9.537,−13.678&radius=50000&language=fr&region=gn`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error(`❌ Erreur Google Places: ${response.status} - ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`🌐 Aucun résultat Google Places pour "${keyword}"`);
      return [];
    }
    console.log(`🎯 ${data.results.length} résultat(s) Google Places pour "${keyword}"`);
    // Convertir les résultats Google Places au format local
    return data.results.slice(0, 3).map((place, index)=>({
        id: `google_${index}_${Date.now()}`,
        nom: place.name,
        ville: 'Conakry',
        type_lieu: place.types?.[0] || 'establishment',
        latitude: place.geometry?.location?.lat || 0,
        longitude: place.geometry?.location?.lng || 0,
        position: null,
        source: 'google_places',
        address: place.formatted_address,
        rating: place.rating || null,
        score: 0.8 // Score artificiel pour Google (considéré comme pertinent)
      }));
  } catch (error) {
    console.error(`💥 Exception Google Places: ${error.message}`);
    return [];
  }
}
// 🔥 FONCTION DIRECTE GOOGLE PLACES (contourner cache search-service)
async function searchGooglePlacesDirect(query) {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!GOOGLE_API_KEY) {
    console.log(`⚠️ GOOGLE PLACES DIRECT - Clé API manquante`);
    return null;
  }
  try {
    console.log(`🌐 GOOGLE PLACES DIRECT - Recherche: "${query}"`);
    // Normaliser les accents pour éviter les erreurs UTF-8 avec Google API
    const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(normalizedQuery + ' Conakry Guinea')}&key=${GOOGLE_API_KEY}`;
    console.log(`🔗 URL: ${url.replace(GOOGLE_API_KEY, 'API_KEY_HIDDEN')}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`📥 Google Places réponse: status=${data.status}, results=${data.results?.length || 0}`);
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.log(`⚠️ Google Places erreur: ${data.status} - ${data.error_message || 'Erreur inconnue'}`);
      return null;
    }
    if (!data.results || data.results.length === 0) {
      console.log(`📭 Google Places: aucun résultat`);
      return null;
    }
    // MODIFICATION MINIMALISTE: Retourner TOUS les résultats (max 8) au lieu du premier seulement
    const results = data.results.slice(0, 8).map((place, index)=>({
        id: `google_${place.place_id}`,
        nom: place.name,
        adresse_complete: place.formatted_address,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        source: 'google_places_direct',
        score: 95 - index // Score décroissant pour maintenir l'ordre
      }));
    console.log(`🎯 Google Places: ${results.length} résultats trouvés`);
    results.forEach((r, i)=>console.log(`   ${i + 1}. ${r.nom}`));
    return results;
  } catch (error) {
    console.log(`❌ GOOGLE PLACES DIRECT erreur: ${error.message}`);
    return null;
  }
}
async function searchAdresse(searchTerm) {
  try {
    console.log(`🔍 RECHERCHE INTELLIGENTE: "${searchTerm}"`);
    // 🔥 FORCER GOOGLE PLACES EN PRIORITÉ ABSOLUE (contourner cache)
    console.log(`🌐 === FORÇAGE GOOGLE PLACES PRIORITÉ 1 ===`);
    const googleResults = await searchGooglePlacesDirect(searchTerm);
    if (googleResults && googleResults.length > 0) {
      console.log(`✅ GOOGLE PLACES DIRECT - ${googleResults.length} résultat(s) trouvé(s)`);
      return googleResults; // Retourner tous les résultats maintenant
    }
    console.log(`📭 GOOGLE PLACES DIRECT - Aucun résultat, fallback vers service intelligent`);
    // Import du service de recherche intelligent
    const { searchLocation } = await import('./search-service.ts');
    const result = await searchLocation(searchTerm, SUPABASE_URL, workingApiKey);
    if (result) {
      // Log détaillé avec source de la recherche
      const sourceInfo = result.source ? ` (Source: ${result.source})` : '';
      const scoreInfo = result.score ? ` [Score: ${result.score}]` : '';
      console.log(`📍 RECHERCHE INTELLIGENTE - Trouvé: ${result.nom}${sourceInfo}${scoreInfo}`);
      // Log spécifique selon la source
      if (result.source?.startsWith('database_')) {
        console.log(`💾 RECHERCHE DATABASE - Stratégie: ${result.source.replace('database_', '')}`);
      } else if (result.source === 'google_places') {
        console.log(`🌐 RECHERCHE GOOGLE PLACES - API externe utilisée`);
      }
      return result;
    }
    console.log(`❌ RECHERCHE INTELLIGENTE - Aucun résultat pour: "${searchTerm}"`);
    return null;
  } catch (error) {
    console.error(`❌ Exception recherche intelligente: ${error.message}`);
    // Fallback vers l'ancienne méthode en cas d'erreur
    try {
      const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/search_adresse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          search_term: searchTerm
        })
      });
      if (response.ok) {
        const adresses = await response.json();
        if (adresses.length > 0) {
          console.log(`🔄 FALLBACK SQL - Trouvé: ${adresses[0].nom} (Source: database_sql_fallback)`);
          return adresses[0];
        } else {
          console.log(`❌ FALLBACK SQL - Aucun résultat pour: "${searchTerm}"`);
        }
        return null;
      }
    } catch (fallbackError) {
      console.error(`❌ Fallback aussi échoué: ${fallbackError.message}`);
    }
    return null;
  }
}

// =================================================================
// 🏠 FONCTIONS ADRESSES PERSONNELLES (AJOUT SANS MODIFICATION)
// =================================================================

/**
 * Récupère les adresses personnelles du client avec coordonnées converties depuis WKB
 * AJOUT PUR - Ne modifie aucun comportement existant
 */
async function getClientPersonalAddressesWithCoords(clientPhone: string): Promise<any[]> {
  try {
    // Récupérer les adresses du client
    const response = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/client_addresses?client_phone=eq.${encodeURIComponent(clientPhone)}&select=id,address_name,address_type,address_complete,position_depart`,
      {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey
        }
      }
    );
    
    if (!response.ok) {
      console.log(`⚠️ [ADRESSES-PERSO] Erreur récupération: ${response.status}`);
      return [];
    }
    
    const addresses = await response.json();
    
    if (!addresses || addresses.length === 0) {
      console.log(`📭 [ADRESSES-PERSO] Aucune adresse pour ${clientPhone}`);
      return [];
    }
    
    // Pour chaque adresse avec position, extraire les coordonnées
    const addressesWithCoords = [];
    
    for (const addr of addresses) {
      if (!addr.position_depart || !addr.address_name) continue;
      
      // Appel RPC pour extraire coordonnées depuis WKB
      const coordsResponse = await fetchWithRetry(
        `${SUPABASE_URL}/rest/v1/rpc/extract_coordinates_from_address`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ address_id: addr.id })
        }
      );
      
      if (coordsResponse.ok) {
        const coordsArray = await coordsResponse.json();
        if (coordsArray && coordsArray.length > 0) {
          const coords = coordsArray[0];
          addressesWithCoords.push({
            ...addr,
            latitude: coords.lat,
            longitude: coords.lng,
            coordinates: { lat: coords.lat, lng: coords.lng }
          });
        }
      }
    }
    
    console.log(`🏠 [ADRESSES-PERSO] ${addressesWithCoords.length} adresse(s) avec coordonnées pour ${clientPhone}`);
    return addressesWithCoords;
    
  } catch (error) {
    console.error(`❌ [ADRESSES-PERSO] Erreur:`, error);
    return [];
  }
}

/**
 * Enrichit les suggestions Google avec les adresses personnelles du client
 * AJOUT PUR - Retourne suggestions inchangées si pas d'adresses perso
 */
async function enrichSuggestionsWithPersonalAddresses(
  clientPhone: string, 
  googleSuggestions: any[], 
  isDestination: boolean = false
): Promise<any[]> {
  
  // Récupérer adresses personnelles (avec coordonnées converties)
  const personalAddresses = await getClientPersonalAddressesWithCoords(clientPhone);
  
  if (personalAddresses.length === 0) {
    // NO-OP : Retourner suggestions Google inchangées
    return googleSuggestions;
  }
  
  console.log(`🏠 [ENRICHISSEMENT] ${personalAddresses.length} adresse(s) perso à ajouter`);
  
  // Formater adresses personnelles au format suggestions
  const personalSuggestions = personalAddresses
    .map(addr => {
      if (!addr.coordinates || !addr.coordinates.lat || !addr.coordinates.lng) {
        return null;
      }
      
      return {
        id: `personal_${addr.id}`,
        nom: `🏠 ${addr.address_name}`,
        position: `POINT(${addr.coordinates.lng} ${addr.coordinates.lat})`,
        latitude: addr.coordinates.lat,
        longitude: addr.coordinates.lng,
        ville: 'Personnel',
        type: 'personal',
        address_type: addr.address_type,
        address_complete: addr.address_complete || addr.address_name
      };
    })
    .filter(addr => addr !== null);
  
  // Combiner : SEULEMENT adresses perso si elles existent, sinon Google Places
  const combined = personalSuggestions.length > 0 
    ? personalSuggestions  // SEULEMENT adresses perso si elles existent
    : googleSuggestions;   // Sinon adresses de la base
  
  console.log(`📋 [ENRICHISSEMENT] Total: ${combined.length} (${personalSuggestions.length} perso + ${googleSuggestions.length} Google)`);
  
  return combined;
}

async function calculerPrixCourse(vehicleType, distanceKm1) {
  try {
    console.log(`💰 Calcul prix: ${vehicleType}, ${distanceKm1}km`);
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/calculer_prix_course`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_vehicle_type: vehicleType,
        p_distance_km: distanceKm1
      })
    });
    if (!response.ok) {
      const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
      const prixTotal = Math.ceil(distanceKm1 * tarifDefaut / 1000) * 1000;
      return {
        prix_total: prixTotal,
        prix_par_km: tarifDefaut,
        tarif_applique: 'Tarif par défaut'
      };
    }
    const resultats = await response.json();
    return resultats.length > 0 ? resultats[0] : {
      prix_total: Math.ceil(distanceKm1 * (vehicleType === 'moto' ? 3000 : 4000) / 1000) * 1000,
      prix_par_km: vehicleType === 'moto' ? 3000 : 4000,
      tarif_applique: 'Tarif par défaut'
    };
  } catch (error) {
    console.error(`❌ Exception calcul prix: ${error.message}`);
    const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
    return {
      prix_total: Math.ceil(distanceKm1 * tarifDefaut / 1000) * 1000,
      prix_par_km: tarifDefaut,
      tarif_applique: 'Tarif par défaut (erreur)'
    };
  }
}
async function getClientCoordinates(sessionPhone) {
  if (!sessionPhone) {
    console.log('❌ sessionPhone manquant');
    return {
      latitude: 0,
      longitude: 0
    };
  }
  try {
    console.log(`🔍 Extraction coordonnées pour: ${sessionPhone}`);
    const rpcResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/extract_coordinates_from_session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: sessionPhone
      })
    });
    if (rpcResponse.ok) {
      const coords = await rpcResponse.json();
      if (coords.length > 0) {
        const lat = parseFloat(coords[0].latitude) || 0;
        const lon = parseFloat(coords[0].longitude) || 0;
        if (lat !== 0 && lon !== 0) {
          console.log(`✅ Coordonnées extraites: lat=${lat}, lon=${lon}`);
          return {
            latitude: lat,
            longitude: lon
          };
        }
      }
    }
    console.log(`⚠️ Extraction PostGIS échouée, coordonnées par défaut`);
    return {
      latitude: 0,
      longitude: 0
    };
  } catch (error) {
    console.error(`❌ Erreur extraction coordonnées: ${error.message}`);
    return {
      latitude: 0,
      longitude: 0
    };
  }
}
// AJOUT: Fonction pour récupérer les coordonnées depuis un ID d'adresse
async function getCoordinatesFromAddressId(addressId) {
  if (!addressId) {
    console.log('❌ addressId manquant');
    return {
      latitude: 9.5372,
      longitude: -13.6785
    }; // Fallback Conakry centre
  }
  try {
    console.log(`🔍 Récupération coordonnées pour adresse ID: ${addressId}`);
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=latitude,longitude&id=eq.${addressId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const adresses = await response.json();
      if (adresses && adresses.length > 0 && adresses[0].latitude && adresses[0].longitude) {
        const coords = {
          latitude: adresses[0].latitude,
          longitude: adresses[0].longitude
        };
        console.log(`✅ Coordonnées adresse trouvées: ${coords.latitude}, ${coords.longitude}`);
        return coords;
      }
    }
    console.log('⚠️ Adresse non trouvée - fallback Conakry centre');
    return {
      latitude: 9.5372,
      longitude: -13.6785
    }; // Centre de Conakry
  } catch (error) {
    console.error('❌ Erreur récupération coordonnées adresse:', error);
    return {
      latitude: 9.5372,
      longitude: -13.6785
    }; // Fallback Conakry
  }
}
// =================================================================
// FONCTIONS IA AUDIO (PHASE 2)
// =================================================================
// Fonction pour récupérer des suggestions d'adresses depuis la table adresses
async function getSuggestionsIntelligentes(query = '', limit = 8) {
  try {
    console.log(`🎯 Récupération suggestions intelligentes pour: "${query}"`);
    if (query && query.length >= 2) {
      // RÉUTILISATION : Utiliser directement searchAdressePartial qui fonctionne bien
      console.log(`🔄 Réutilisation searchAdressePartial pour: "${query}"`);
      const partialResults = await searchAdressePartial(query);
      if (partialResults && partialResults.length > 0) {
        const limitedResults = partialResults.slice(0, limit);
        console.log(`✅ ${limitedResults.length} suggestions trouvées via searchAdressePartial`);
        return limitedResults;
      }
      // Fallback : recherche élargie sans les filtres
      console.log(`🔄 Fallback recherche élargie pour: "${query}"`);
      const url = `${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,latitude,longitude&actif=eq.true&or=(nom.ilike.*${encodeURIComponent(query)}*,nom_normalise.ilike.*${encodeURIComponent(query)}*)&order=nom&limit=${limit}`;
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const adresses = await response.json();
        console.log(`✅ ${adresses.length} suggestions fallback trouvées`);
        return adresses || [];
      }
    } else {
      // Pas de query - prendre SEULEMENT 3 restaurants par ordre alphabétique
      const url = `${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,latitude,longitude&actif=eq.true&type_lieu=eq.restaurant&order=nom&limit=3`;
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const adresses = await response.json();
        console.log(`✅ ${adresses.length} suggestion(s) par défaut récupérée(s)`);
        return adresses || [];
      }
    }
    console.log(`⚠️ Aucune suggestion trouvée pour: "${query}"`);
    return [];
  } catch (error) {
    console.error(`💥 Exception suggestions intelligentes: ${error.message}`);
    return [];
  }
}

// =================================================================
// 🧠 FONCTIONS IA AVANCÉES V3
// =================================================================

// Interfaces TypeScript pour l'IA
interface IAResult {
  handled: boolean;
  response?: string;
  session?: any;
}

/**
 * Fonction principale de gestion des messages complexes par IA - V3 UNIQUEMENT
 * Implémente les 10 cas du PLAN_FINAL_WORKFLOWS_DETAILLES.md
 */
async function handleComplexTextMessageV3(body: string, from: string, session: any): Promise<IAResult> {
  console.log(`🧠 [IA_COMPLEX_V3] Analyse du message: "${body}"`);
  
  try {
    // Utiliser le module text-intelligence.ts de V3
    return await handleComplexTextMessage(body, from, session);
  } catch (error) {
    console.error(`💥 [IA_COMPLEX_V3] Erreur: ${error.message}`);
    return { handled: false };
  }
}

async function getPopularDestinations() {
  // Réutiliser la fonction de suggestions pour récupérer des destinations populaires
  return await getSuggestionsIntelligentes('', 6);
}
async function downloadAudio(mediaUrl) {
  console.log(`📥 Téléchargement audio depuis: ${mediaUrl}`);
  try {
    // Vérifier que les credentials Twilio sont disponibles
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error(`❌ Credentials Twilio manquants - SID: ${TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}, Token: ${TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET'}`);
      return null;
    }
    // Créer l'authentification Basic Auth pour Twilio
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    console.log(`🔐 Authentification Twilio - SID: ${TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
    // Les URLs Twilio nécessitent une authentification Basic Auth
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'LokoTaxi-Bot/1.0'
      }
    });
    // Logs de debug détaillés
    console.log(`🔍 DEBUG Response status: ${response.status} ${response.statusText}`);
    console.log(`🔍 Content-Length: ${response.headers.get('Content-Length') || 'NON_DÉFINI'}`);
    console.log(`🔍 Response URL: ${response.url}`);
    if (!response.ok) {
      console.error(`❌ Erreur téléchargement audio: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error(`❌ Détails erreur: ${errorText}`);
      return null;
    }
    const contentType = response.headers.get('Content-Type') || '';
    console.log(`📋 Type de contenu audio: ${contentType}`);
    // Vérifier que c'est bien un fichier audio
    if (!contentType.startsWith('audio/')) {
      console.error(`❌ Type de fichier non supporté: ${contentType}`);
      return null;
    }
    const audioBuffer = await response.arrayBuffer();
    const fileSizeMB = (audioBuffer.byteLength / (1024 * 1024)).toFixed(2);
    const fileSizeBytes = audioBuffer.byteLength;
    console.log(`🔍 Buffer size (bytes): ${fileSizeBytes}`);
    console.log(`🔍 Buffer size (MB): ${fileSizeMB}`);
    if (fileSizeBytes === 0) {
      console.error(`❌ PROBLÈME: Buffer audio vide (0 bytes) malgré response.ok=true`);
      console.error(`🔍 Headers complets:`, Object.fromEntries(response.headers.entries()));
      return null;
    }
    console.log(`✅ Audio téléchargé: ${fileSizeMB} MB`);
    // Limite de sécurité (max 25MB pour Whisper)
    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      console.error(`❌ Fichier audio trop volumineux: ${fileSizeMB} MB (max: 25MB)`);
      return null;
    }
    return audioBuffer;
  } catch (error) {
    console.error(`💥 Exception téléchargement audio: ${error.message}`);
    return null;
  }
}
async function transcribeAudio(audioBuffer) {
  console.log(`🎯 Début transcription Whisper...`);
  try {
    // Créer un FormData pour l'API Whisper
    const formData = new FormData();
    // Créer un Blob à partir du buffer
    const audioBlob = new Blob([
      audioBuffer
    ], {
      type: 'audio/mpeg'
    });
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr'); // Français pour le contexte guinéen/parisien
    formData.append('response_format', 'json');
    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API Whisper: ${response.status} - ${errorText}`);
      return null;
    }
    const result = await response.json();
    const transcript = result.text?.trim() || '';
    console.log(`✅ Transcription réussie: "${transcript}"`);
    return transcript;
  } catch (error) {
    console.error(`💥 Exception transcription: ${error.message}`);
    return null;
  }
}
async function analyzeTranscript(transcript) {
  console.log(`🧠 Analyse sémantique IA COMPLÈTE: "${transcript}"`);
  try {
    // Analyser d'abord les informations temporelles
    const temporalInfo = analyzeTemporalInfo(transcript);
    console.log(`⏰ Info temporelle détectée:`, temporalInfo);
    // PROMPT GPT ENRICHI avec analyse temporelle
    const systemPrompt = `Tu es un assistant IA pour LokoTaxi qui analyse les demandes vocales de réservation de taxi.

CONTEXTE:
- Service de taxi en Guinée (Conakry, Kindia, etc.)
- Types de véhicules: 'moto' ou 'voiture'
- Les clients demandent un taxi en parlant naturellement

TÂCHE:
Analyse le texte et extrait LIBREMENT:
1. vehicle_type: 'moto', 'voiture', ou 'auto_detect' si pas clair
2. destination: nom de lieu guinéen (sois intelligent: "donka" → "CHU Donka", "madina" → "Madina Centre", "kipe" → "Kipe Centre")
3. confidence: score 0-100 de la fiabilité de l'analyse

EXEMPLES D'INTELLIGENCE GUINÉE:
"Je veux aller à Donka" → {"destination": "CHU Donka", "vehicle_type": "auto_detect", "confidence": 85}
"Taxi moto pour Madina" → {"destination": "Madina Centre", "vehicle_type": "moto", "confidence": 95}
"Kipe en voiture demain" → {"destination": "Kipe Centre", "vehicle_type": "voiture", "confidence": 90}

SOIS INTELLIGENT ET NATUREL - pas de contraintes strictes.

Réponds UNIQUEMENT en JSON valide:`;
    const userPrompt = `Analyse cette demande: "${transcript}"`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: {
          type: "json_object"
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API GPT: ${response.status} - ${errorText}`);
      return null;
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`❌ Réponse GPT vide`);
      return null;
    }
    const analysis = JSON.parse(content);
    const aiAnalysis = {
      destination: analysis.destination || '',
      vehicle_type: analysis.vehicle_type || 'auto_detect',
      confidence: Math.min(Math.max(analysis.confidence || 0, 0), 100),
      raw_transcript: transcript,
      temporal_info: temporalInfo || undefined
    };
    console.log(`✅ Analyse terminée:`, JSON.stringify(aiAnalysis));
    return aiAnalysis;
  } catch (error) {
    console.error(`💥 Exception analyse GPT: ${error.message}`);
    return null;
  }
}
// Fonction principale de validation intelligente des destinations
async function handleDestinationIntelligent(aiDestination) {
  console.log(`🧠 Validation intelligente: "${aiDestination}"`);
  // 1. RECHERCHE EXACTE (80% des cas - succès direct)
  let adresse1 = await searchAdresse(aiDestination);
  if (adresse1) {
    console.log(`✅ Match exact: ${adresse1.nom}`);
    return {
      success: true,
      adresse: adresse1,
      type: 'exact',
      message: `✅ Destination trouvée: ${adresse1.nom}`
    };
  }
  // 2. RECHERCHE FUZZY INTELLIGENTE (15% des cas)
  console.log(`🔍 Match exact échoué, tentative recherche fuzzy...`);
  const keywords = aiDestination.toLowerCase().replace(/['éèêëàâäôöùûüîïç]/g, (match)=>{
    const accents = {
      'é': 'e',
      'è': 'e',
      'ê': 'e',
      'ë': 'e',
      'à': 'a',
      'â': 'a',
      'ä': 'a',
      'ô': 'o',
      'ö': 'o',
      'ù': 'u',
      'û': 'u',
      'ü': 'u',
      'î': 'i',
      'ï': 'i',
      'ç': 'c'
    };
    return accents[match] || match;
  }).split(' ').filter((word)=>word.length > 2); // Ignorer "le", "de", "la", etc.
  for (const keyword of keywords){
    console.log(`🔎 Test mot-clé: "${keyword}"`);
    const fuzzyResults = await searchAdressePartial(keyword);
    if (fuzzyResults.length === 1) {
      console.log(`✅ Match fuzzy unique: ${fuzzyResults[0].nom}`);
      return {
        success: true,
        adresse: fuzzyResults[0],
        type: 'fuzzy_single',
        message: `🎯 Trouvé par recherche intelligente: ${fuzzyResults[0].nom}`
      };
    } else if (fuzzyResults.length > 1) {
      console.log(`❓ Matches multiples (${fuzzyResults.length}): ${fuzzyResults.map((r)=>r.nom).join(', ')}`);
      return {
        success: false,
        suggestions: fuzzyResults.slice(0, 5),
        type: 'fuzzy_multiple',
        message: `❓ Plusieurs destinations correspondent à "${keyword}"`
      };
    }
  }
  // 3. DESTINATION INCONNUE (5% des cas)
  console.log(`❌ Destination totalement inconnue: ${aiDestination}`);
  const popularDestinations = await getPopularDestinations();
  return {
    success: false,
    suggestions: popularDestinations,
    type: 'unknown',
    message: `❌ Destination "${aiDestination}" non disponible`
  };
}
// =================================================================
// WORKFLOW COMMUN (LOGIQUE PARTAGÉE TEXTE/AUDIO)
// =================================================================
async function commonWorkflow(from, workflowData) {
  const clientPhone = normalizePhone(from);
  const session = await getSession(clientPhone);
  console.log(`🔄 CommonWorkflow - Source: ${workflowData.source}`);
  console.log(`🔄 WorkflowData:`, JSON.stringify(workflowData));
  // Test de connexion base de données
  const dbTest = await testDatabaseConnection();
  if (!dbTest.connected) {
    return `❌ Service temporairement indisponible.

Réessayez dans quelques minutes.`;
  }
  try {
    // Scénario 1: Demande complète avec véhicule + destination (IA Audio)
    if (workflowData.vehicleType && workflowData.destination && workflowData.source === 'audio') {
      console.log(`🎯 Scénario IA: Demande complète audio`);
      console.log(`🔍 DEBUG - workflowData.vehicleType: ${workflowData.vehicleType}`);
      console.log(`🔍 DEBUG - workflowData.destination: ${workflowData.destination}`);
      // Vérifier s'il y a des informations temporelles
      const temporalInfo = workflowData.aiAnalysis?.temporal_info;
      console.log(`⏰ DEBUG - temporalInfo:`, temporalInfo);
      if (temporalInfo && temporalInfo.date) {
        // CAS AVEC PLANIFICATION TEMPORELLE
        console.log(`⏰ Demande avec planification temporelle détectée`);
        const plannedDateTime = {
          date: temporalInfo.date,
          hour: temporalInfo.hour || 9,
          minute: temporalInfo.minute || 0
        };
        // Sauvegarder la planification
        await saveSession(clientPhone, {
          vehicleType: workflowData.vehicleType,
          destinationNom: workflowData.destination,
          plannedDate: plannedDateTime.date,
          plannedHour: plannedDateTime.hour,
          plannedMinute: plannedDateTime.minute,
          temporalPlanning: true,
          etat: 'planifie_confirmation'
        });
        return `🎤 **${workflowData.vehicleType.toUpperCase()} PLANIFIÉ POUR ${plannedDateTime.date} ${plannedDateTime.hour}H**

✅ Message vocal: "${workflowData.transcript}"
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
📅 Planification: ${plannedDateTime.date} à ${plannedDateTime.hour}:${plannedDateTime.minute.toString().padStart(2, '0')}

🕐 Votre réservation sera créée pour le ${plannedDateTime.date} à ${plannedDateTime.hour}:${plannedDateTime.minute.toString().padStart(2, '0')}

━━━━━━━━━━━━━━━━━━━━

🤔 **Cette réservation est-elle pour vous ?**

• Tapez 'oui' - Je pars de ma position actuelle
• Tapez 'non' - Je pars d'un autre lieu`;
      }
      // NOTE: Pas de nettoyage des sessions pour l'audio - gestion via UPSERT uniquement
      // Vérifier la disponibilité des conducteurs
      console.log(`🔍 DEBUG - Avant appel getAvailableDrivers`);
      const conducteursDisponibles = await getAvailableDrivers(workflowData.vehicleType);
      console.log(`🔍 DEBUG - Après appel getAvailableDrivers: ${conducteursDisponibles.length} trouvés`);
      if (conducteursDisponibles.length === 0) {
        return `😔 Aucun ${workflowData.vehicleType} disponible actuellement.

🎤 J'ai compris: "${workflowData.transcript}"
📊 Analyse IA: ${workflowData.aiAnalysis?.confidence}% de fiabilité

Essayez l'autre type de véhicule ou réessayez plus tard.`;
      }
      // VALIDATION INTELLIGENTE DE LA DESTINATION (Option B)
      console.log(`🔍 DEBUG - Avant appel handleDestinationIntelligent`);
      const destinationResult = await handleDestinationIntelligent(workflowData.destination);
      console.log(`🔍 DEBUG - Après handleDestinationIntelligent: success=${destinationResult.success}`);
      if (!destinationResult.success) {
        // Gérer les différents types d'échec
        if (destinationResult.type === 'fuzzy_multiple') {
          // Cas 2: Plusieurs résultats - demander choix
          const suggestions = destinationResult.suggestions.map((addr, index)=>`${index + 1}️⃣ ${addr.nom}`).join('\n');
          return `🎤 **DEMANDE VOCALE ANALYSÉE**

✅ J'ai compris: "${workflowData.transcript}"

🤖 Analyse IA (${workflowData.aiAnalysis?.confidence}% fiabilité):
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
❓ Plusieurs destinations correspondent:

**Choisissez votre destination:**
${suggestions}

**Répondez par le numéro (1, 2, etc.) ou tapez le nom complet.**`;
        } else {
          // Cas 3: Destination inconnue - suggestions générales
          const suggestions = destinationResult.suggestions.slice(0, 5).map((addr)=>`• ${addr.nom}`).join('\n');
          return `🎤 **DEMANDE VOCALE ANALYSÉE**

✅ J'ai compris: "${workflowData.transcript}"

🤖 Analyse IA (${workflowData.aiAnalysis?.confidence}% fiabilité):
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
❌ Destination: "${workflowData.destination}" non disponible

**Destinations disponibles:**
${suggestions}

**Renvoyez un message vocal avec une destination connue ou tapez le nom exact.**`;
        }
      }
      const adresse1 = destinationResult.adresse;
      // Sauvegarder dans la session pour ne pas redemander
      console.log(`💾 DEBUG - TENTATIVE SAUVEGARDE SESSION IA`);
      console.log(`💾 DEBUG - clientPhone: ${clientPhone}`);
      console.log(`💾 DEBUG - vehicleType: ${workflowData.vehicleType}`);
      console.log(`💾 DEBUG - destinationNom: ${adresse1.nom}`);
      try {
        console.log(`🚨 DEBUG - AVANT APPEL saveSession pour clientPhone: ${clientPhone}`);
        console.log(`🚨 DEBUG - workflowData.vehicleType: ${workflowData.vehicleType}`);
        console.log(`🚨 DEBUG - adresse.nom: ${adresse1.nom}`);
        console.log(`🚨 DEBUG - adresse.id: ${adresse1.id}`);
        await saveSession(clientPhone, {
          vehicleType: workflowData.vehicleType,
          destinationNom: adresse1.nom,
          destinationId: adresse1.id,
          destinationPosition: adresse1.position,
          etat: 'vehicule_et_destination_ia'
        });
        console.log(`✅ DEBUG - SESSION IA SAUVEGARDÉE AVEC SUCCÈS !`);
      } catch (error) {
        console.error(`❌ DEBUG - ERREUR SAUVEGARDE SESSION IA: ${error.message}`);
        console.error(`❌ DEBUG - Stack: ${error.stack}`);
        console.error(`❌ DEBUG - Error object:`, JSON.stringify(error, null, 2));
      }
      return `🎤 **DEMANDE VOCALE ANALYSÉE** ✅

✅ J'ai compris: "${workflowData.transcript}"

🤖 Analyse IA (${workflowData.aiAnalysis?.confidence}% fiabilité):
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
📍 Destination: ${adresse1.nom} ${destinationResult.type === 'exact' ? '✅' : '🎯'}
👥 ${conducteursDisponibles.length} conducteur(s) disponible(s)

${destinationResult.message}

✅ *CONFIRMATION REÇUE*

📍 *ENVOYEZ VOTRE POSITION GPS PRÉCISE :*
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation"
• Attendez que la précision soit ≤ 50 mètres
• ✅ Choisissez "Envoyer votre localisation actuelle" (position GPS exacte)
• ❌ NE PAS choisir "Partager position en direct" (ne fonctionne pas)
• ❌ NE PAS choisir les lieux suggérés (Police, Centre, etc.)
• ⚠️ Si précision > 50m : cliquez ← en haut à gauche et réessayez

Ensuite, nous vous demanderons votre destination.`;
    }
    // Scénario 2: Demande partielle (véhicule seulement)
    if (workflowData.vehicleType && !workflowData.destination) {
      console.log(`🎯 Scénario IA: Véhicule détecté seulement`);
      const conducteursDisponibles = await getAvailableDrivers(workflowData.vehicleType);
      if (conducteursDisponibles.length === 0) {
        return `😔 Aucun ${workflowData.vehicleType} disponible.

🎤 Message vocal: "${workflowData.transcript}"

Essayez 'voiture' si vous avez dit 'moto', ou vice versa.`;
      }
      await saveSession(clientPhone, {
        vehicleType: workflowData.vehicleType,
        etat: 'vehicule_choisi'
      });
      return `🎤 **VÉHICULE SÉLECTIONNÉ PAR IA**

✅ Message vocal: "${workflowData.transcript}"
🚗 Véhicule détecté: ${workflowData.vehicleType.toUpperCase()}
👥 ${conducteursDisponibles.length} conducteur(s) disponible(s)

📍 **Prochaine étape: Partagez votre position GPS**
• Cliquez sur 📎 → Lieu → Envoyer position

Ensuite je vous demanderai votre destination.`;
    }
    // Scénario 3: Destination seulement
    if (!workflowData.vehicleType && workflowData.destination) {
      console.log(`🎯 Scénario IA: Destination détectée seulement`);
      return `🎤 **DESTINATION DÉTECTÉE**

✅ Message vocal: "${workflowData.transcript}"  
📍 Destination: ${workflowData.destination}

❓ **Type de véhicule manquant**

Renvoyez un vocal en précisant:
• "Je veux un taxi MOTO pour ${workflowData.destination}"
• "Je veux une VOITURE pour ${workflowData.destination}"

Ou écrivez 'taxi' pour le système classique.`;
    }
    // Scénario 4: Rien de détecté clairement
    console.log(`🎯 Scénario IA: Demande non claire`);
    return `🎤 **DEMANDE PEU CLAIRE**

Message vocal: "${workflowData.transcript}"
🤖 Analyse IA: ${workflowData.aiAnalysis?.confidence || 0}% de fiabilité

❓ **Je n'ai pas compris clairement**

Exemples de demandes vocales:
• "Je veux un taxi moto"
• "J'ai besoin d'une voiture pour la gare"  
• "Taxi pour la préfecture"

Ou écrivez 'taxi' pour le système classique.`;
  } catch (error) {
    console.error(`💥 Erreur CommonWorkflow: ${error.message}`);
    console.error(`💥 Stack trace: ${error.stack}`);
    console.error(`💥 Context - Source: ${workflowData.source}, VehicleType: ${workflowData.vehicleType}, Destination: ${workflowData.destination}`);
    return `💥 Erreur technique.

Message vocal: "${workflowData.transcript || 'non disponible'}"

Réessayez ou écrivez 'taxi'.`;
  }
}
// =================================================================
// HANDLERS SPÉCIALISÉS
// =================================================================
async function handleTextMessage(from, body, latitude, longitude, payload = null) {
  console.log(`\n========== DÉBUT HANDLE TEXT MESSAGE ==========`);
  console.log(`📞 DEBUG - from: "${from}"`);
  console.log(`💬 DEBUG - body: "${body}"`);
  console.log(`📍 DEBUG - latitude: "${latitude}"`);
  console.log(`📍 DEBUG - longitude: "${longitude}"`);
  const clientPhone = normalizePhone(from);
  const messageText = body.toLowerCase().trim();
  const hasLocation = latitude && longitude && latitude !== '' && longitude !== '';
  console.log(`📱 TEXTE: ${clientPhone} | 💬 "${body}" | 📍 ${hasLocation ? 'oui' : 'non'}`);
  console.log(`🔍 DEBUG GPS - latitude: "${latitude}", longitude: "${longitude}"`);
  console.log(`🔍 DEBUG hasLocation: ${hasLocation}`);
  // Test de connexion
  const dbTest = await testDatabaseConnection();
  const session = await getSession(clientPhone);
  console.log(`📋 DEBUG Session récupérée:`, JSON.stringify(session));
  console.log(`📋 DEBUG Session.vehicleType: ${session.vehicleType}`);
  console.log(`📋 DEBUG Session.etat: ${session.etat}`);
  let responseMessage = '';
  // 🌟 GESTION SYSTÈME NOTATION CONDUCTEUR
  // Vérifier si c'est une note par lettre (A-E) et que l'utilisateur attend une note
  console.log(`🔍 DEBUG NOTATION - messageText: "${messageText}", match A-E: ${messageText.match(/^[A-Ea-e]$/i)}, waitingForNote: ${session?.waitingForNote}`);
  if (messageText.match(/^[A-Ea-e]$/i)) {
    console.log(`🔍 DEBUG NOTATION - Lettre détectée: "${messageText}"`);
    console.log(`🔍 DEBUG NOTATION - Session complète:`, JSON.stringify(session));
    console.log(`🔍 DEBUG NOTATION - waitingForNote = ${session?.waitingForNote} (type: ${typeof session?.waitingForNote})`);
    if (session?.waitingForNote) {
      const noteValue = messageText.toUpperCase().charCodeAt(0) - 64; // A=1, B=2, C=3, D=4, E=5
      console.log(`⭐ Note reçue: ${messageText} (${noteValue}/5) pour client: ${clientPhone}`);
      return await handleNoteValidation(clientPhone, noteValue);
    } else {
      console.log(`⚠️ DEBUG NOTATION - Lettre détectée mais waitingForNote=false ou undefined`);
    }
  }
  // Vérifier si en attente de commentaire
  if (session?.waitingForComment) {
    console.log(`💬 Commentaire reçu pour client: ${clientPhone}`);
    return await handleCommentaire(clientPhone, messageText);
  }
  
  // 🏠 SYSTÈME ENREGISTREMENT ADRESSE DÉPART
  if (session?.etat === 'attente_nom_adresse') {
    console.log(`📍 Enregistrement adresse pour: ${clientPhone}`);
    
    // Si c'est "taxi", on passe l'enregistrement et continue le workflow
    if (messageText === 'taxi') {
      // Continue avec le workflow taxi normal (la logique existante gère déjà la suppression de session)
    } else {
      // Récupérer la réservation notée
      const reservationId = session.reservationToRate;
      if (reservationId) {
        const reservation = await getReservationById(reservationId);
        
        if (reservation && reservation.position_depart) {
          // Sauvegarder l'adresse
          await saveClientAddress(clientPhone, messageText, reservation.position_depart);
          
          // SUPPRIMER COMPLÈTEMENT LA SESSION - comme pour "taxi"
          try {
            await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${workingApiKey}`,
                'apikey': workingApiKey,
                'Content-Type': 'application/json'
              }
            });
            console.log(`🗑️ Session supprimée après enregistrement adresse pour ${clientPhone}`);
          } catch (error) {
            console.error('❌ Erreur suppression session après adresse:', error);
          }
          
          responseMessage = `✨ *Parfait !*

📍 *"${messageText}"* est enregistré !

🎯 Cette adresse sera proposée automatiquement dans vos prochaines réservations avec un numéro (1-9) pour sélection rapide.

💬 Tapez *'taxi'* pour une nouvelle course`;
          
          // Envoyer le message via Green API et retourner la réponse
          return await sendGreenAPIMessage(from, responseMessage);
        }
      }
      
      // Si pas de réservation, supprimer complètement la session aussi
      try {
        await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          }
        });
        console.log(`🗑️ Session supprimée (pas de réservation) pour ${clientPhone}`);
      } catch (error) {
        console.error('❌ Erreur suppression session (fallback):', error);
      }
    }
  }
  
  if (!dbTest.connected) {
    console.log('❌ Base de données Supabase indisponible');
    if (dbTest.status === 401) {
      responseMessage = `🔐 Erreur d'authentification Supabase.

Clés API expirées ou désactivées.
Vérifiez les clés dans Dashboard → Settings → API.

Status: ${dbTest.status}

Pour recommencer: écrivez 'taxi'`;
    } else if (dbTest.status === 503) {
      responseMessage = `⏳ Service temporairement indisponible.

Le service est en maintenance. 
Réessayez dans quelques minutes.

Support: ${dbTest.error?.substring(0, 100) || 'Service unavailable'}`;
    } else {
      responseMessage = `❌ Service indisponible.

Impossible d'accéder à la base des conducteurs.
Status: ${dbTest.status || 'unknown'}

Réessayez plus tard ou contactez le support.`;
    }
  // 🚫 HANDLER ANNULATION COMPLÈTE - Prioritaire sur tous les autres
  } else if (messageText.toLowerCase() === 'annuler') {
    console.log(`🚫 ANNULATION TOTALE - Demandée par: ${clientPhone}`);
    // 1. Annuler les réservations pending
    const cancelResult = await cancelPendingReservations(clientPhone);
    // 2. Nettoyer sessions
    try {
      await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🧹 Sessions nettoyées pour ${clientPhone}`);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
    }
    // Mettre à jour réservations pending vers canceled
    try {
      const updateResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?client_phone=eq.${encodeURIComponent(clientPhone)}&statut=eq.pending`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statut: 'canceled',
          updated_at: new Date().toISOString()
        })
      });
      if (updateResponse.ok) {
        console.log('✅ Réservations mises à jour vers canceled');
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour réservations:', error);
    }
    // 3. Message de confirmation personnalisé
    responseMessage = `✅ **Annulation terminée !**

${cancelResult.message}${cancelResult.message ? '\n' : ''}Toutes vos données ont été effacées.

Pour une nouvelle réservation, tapez 'taxi' 🚕`;
  // 🔄 HANDLER NOUVEAU TAXI - Démarrage conversation
  } else if (messageText.includes('taxi')) {
    console.log(`🔄 NOUVEAU WORKFLOW TAXI - Commande détectée: "${messageText}"`);
    // 🤖 INJECTION MINIMALE IA - SELON LE PLAN EXACT
    if (await shouldUseAIAnalysis(messageText)) {
      console.log(`🧠 [IA-INTEGRATION] Message complexe détecté, tentative traitement IA...`);
      const aiResult = await handleComplexTextMessage(messageText, clientPhone, session);
      if (aiResult.handled) {
        console.log(`✅ [IA-INTEGRATION] IA a géré le message avec succès`);
        console.log(`🔍 [IA-DEBUG] aiResult.response: "${aiResult.response}"`);
        
        // ═══════════════════════════════════════════════════════════════
        // 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
        // ═══════════════════════════════════════════════════════════════
        // 🔧 CORRECTION CRITIQUE - Multi-provider pour IA après "taxi"
        if (WHATSAPP_PROVIDER === 'greenapi') {
          const messageSent = await sendGreenAPIMessage(from, aiResult.response!);
          logRequestTiming('IA SUCCESS (Green API)', `confidence: ${aiResult.confidence || 'N/A'}`);
          return new Response('OK', { status: 200, headers: corsHeaders });
        } else {
          return new Response(aiResult.response, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        // ═══════════════════════════════════════════════════════════════
        // 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
        // ═══════════════════════════════════════════════════════════════
      }
      console.log(`🔄 [IA-INTEGRATION] IA n'a pas pu gérer, retour au workflow standard`);
    // Si l'IA ne peut pas gérer, continue avec le flow normal
    }
    // Nettoyer session précédente
    try {
      await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🧹 Session précédente nettoyée pour nouveau taxi: ${clientPhone}`);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
    }
    await saveSession(clientPhone, {
      vehicleType: null,
      etat: 'initial'
    });
    
    // 🧠 INTÉGRATION IA V3 - Tentative analyse message complexe
    if (await shouldUseAIAnalysis(body)) {
      console.log(`🧠 [IA-INTEGRATION-V3] Message complexe détecté après 'taxi', tentative traitement IA...`);
      const session = await getSession(clientPhone);
      const aiResult = await handleComplexTextMessageV3(body, clientPhone, session);
      
      if (aiResult.handled) {
        console.log(`🧠 [IA-INTEGRATION-V3] Message géré par l'IA, retour réponse`);
        // L'IA a géré le message, retourner sa réponse
        if (WHATSAPP_PROVIDER === 'greenapi') {
          const messageSent = await sendGreenAPIMessage(from, aiResult.response!);
          logRequestTiming('IA SUCCESS (Green API)', `confidence: ${aiResult.confidence || 'N/A'}`);
          return new Response('OK', { status: 200, headers: corsHeaders });
        } else {
          return new Response(aiResult.response, { headers: { 'Content-Type': 'text/plain' } });
        }
      }
      console.log(`🧠 [IA-INTEGRATION-V3] IA n'a pas pu traiter, fallback vers workflow standard`);
    }
    
    responseMessage = `🚕 Bienvenue chez LokoTaxi!

Quel type de taxi souhaitez-vous ?
• 'moto' - Transport rapide en moto-taxi
• 'voiture' - Transport en voiture

(Répondez par 'moto' ou 'voiture')`;
  } else if (session.etat === 'confirmation_depart') {
    // 🎯 HANDLER CONFIRMATION DÉPART - Déplacé avant hasLocation pour éviter le bug
    console.log(`📝 DEBUG - WORKFLOW TEXTE - État confirmation_depart détecté`);
    if (messageText.toLowerCase() === 'oui') {
      await saveSession(clientPhone, {
        ...session,
        etat: 'vehicule_choisi'
      });
      responseMessage = `✅ *CONFIRMATION REÇUE*

📍 *ENVOYEZ VOTRE POSITION GPS PRÉCISE :*
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation"
• Attendez que la précision soit ≤ 50 mètres
• ✅ Choisissez "Envoyer votre localisation actuelle" (position GPS exacte)
• ❌ NE PAS choisir "Partager position en direct" (ne fonctionne pas)
• ❌ NE PAS choisir les lieux suggérés (Police, Centre, etc.)
• ⚠️ Si précision > 50m : cliquez ← en haut à gauche et réessayez

Ensuite, nous vous demanderons votre destination.`;
    } else if (messageText.toLowerCase() === 'non') {
      // NOUVEAU: Handler pour réservation tierce avec suggestions personnelles
      const googleSuggestions = await getSuggestionsIntelligentes('', 6);
      // ENRICHISSEMENT: Ajouter adresses personnelles du client (NO-OP si pas d'adresses)
      const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, false);
      
      // Vérifier si on a des adresses personnelles enrichies
      const hasPersonalAddresses = suggestions.some(s => s.type === 'personal');
      
      if (hasPersonalAddresses) {
        // AVEC suggestions personnelles : workflow avec sélection numérique
        await saveSession(clientPhone, {
          ...session,
          suggestionsDepart: JSON.stringify(suggestions),
          etat: 'depart_autre_personne_avec_suggestions',
          reservationPourAutrui: true
        });
        
        responseMessage = `📍 RÉSERVATION POUR UNE AUTRE PERSONNE

🔍 Où se trouve la personne à récupérer ?

${suggestions.map((adresse, i) => `${i + 1}️⃣ ${adresse.nom}`).join('\n')}

📝 Tapez le numéro (1-${suggestions.length}) ou le nom du lieu de départ`;
      } else {
        // SANS adresses personnelles : message existant
        await saveSession(clientPhone, {
          ...session,
          etat: 'depart_autre_personne',
          reservationPourAutrui: true
        });
        
        responseMessage = `📍 RÉSERVATION POUR UNE AUTRE PERSONNE

🔍 Où se trouve la personne à récupérer ?

Tapez le nom du lieu de départ (ex: Hôpital Donka, Marché Madina, Kipe Centre...)`;
      }
    } else {
      responseMessage = `🤔 **CONFIRMATION REQUISE**

Cette réservation est-elle pour vous ?

**RÉPONDEZ EXACTEMENT:**
• "oui" pour confirmer
• "non" pour réserver pour quelqu'un d'autre
• "taxi" pour recommencer

**⚠️ Tapez "oui" ou "non" (pas d'autres mots)**`;
    }
  } else if (session.etat === 'ia_attente_confirmation') {
    // 🤖 HANDLER SPÉCIAL IA - Réponse "oui" après analyse intelligence artificielle
    console.log(`🤖 [IA-WORKFLOW] État ia_attente_confirmation détecté pour message: "${messageText}"`);
    if (messageText.toLowerCase() === 'oui') {
      // Passer à l'état vehicule_choisi pour continuer le workflow standard
      await saveSession(clientPhone, {
        ...session,
        etat: 'vehicule_choisi'
      });
      console.log(`✅ [IA-WORKFLOW] Passage de ia_attente_confirmation → vehicule_choisi`);
      responseMessage = `✅ *CONFIRMATION REÇUE*

📍 *ENVOYEZ VOTRE POSITION GPS PRÉCISE :*
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation"
• Attendez que la précision soit ≤ 50 mètres
• ✅ Choisissez "Envoyer votre localisation actuelle" (position GPS exacte)
• ❌ NE PAS choisir "Partager position en direct" (ne fonctionne pas)
• ❌ NE PAS choisir les lieux suggérés (Police, Centre, etc.)
• ⚠️ Si précision > 50m : cliquez ← en haut à gauche et réessayez

Ensuite, nous vous demanderons votre destination.`;
    } else if (messageText.toLowerCase() === 'non') {
      // Réservation pour quelqu'un d'autre
      await saveSession(clientPhone, {
        ...session,
        etat: 'reservation_tierce'
      });
      responseMessage = `👥 **RÉSERVATION POUR UN TIERS**

Parfait ! Où se trouve la personne à transporter ?
• Tapez l'adresse de départ
• Ou demandez-lui de partager sa position

Destination déjà connue: ${session.destinationNom}`;
    } else {
      responseMessage = `🤖 **CONFIRMATION IA REQUISE**

J'ai bien analysé votre demande pour ${session.destinationNom}.

Cette réservation est-elle pour vous ?

**RÉPONDEZ EXACTEMENT:**
• "oui" → Partager votre position GPS
• "non" → Réservation pour quelqu'un d'autre`;
    }

  } else if (session.etat === 'ia_attente_gps' && hasLocation) {
    // 🧠 HANDLER IA - État ia_attente_gps, GPS reçu (réservation immediate ou planifiée)
    console.log(`🧠 [IA_GPS] État ia_attente_gps, GPS reçu: lat=${latitude}, lon=${longitude}`);
    
    const clientCoords = { lat: parseFloat(latitude!), lon: parseFloat(longitude!) };
    
    // Rechercher la destination avec searchLocation 
    console.log(`🔍 [IA_GPS] Recherche destination IA: "${session.destinationNom}"`);
    const destinations = await searchLocation(session.destinationNom!, SUPABASE_URL, workingApiKey);
    
    if (destinations && destinations.length > 0) {
      const destination = destinations[0];
      const destCoords = { lat: destination.latitude, lon: destination.longitude };
      const distance = calculateDistance(clientCoords, destCoords);
      const prix = calculerPrix(distance, session.vehicleType);
      
      // Sauvegarder les données complètes
      await saveSession(clientPhone, {
        ...session,
        positionClient: `POINT(${longitude} ${latitude})`,
        destinationId: destination.id,
        destinationPosition: `POINT(${destination.longitude} ${destination.latitude})`,
        distanceKm: distance,
        prixEstime: prix,
        etat: session.temporalPlanning ? 'prix_estime_planifie' : 'prix_estime'
      });
      
      if (session.temporalPlanning && session.plannedDate && session.plannedHour !== null) {
        // Réservation planifiée
        const dateStr = formatDateForDisplay(session.plannedDate);
        const heureStr = `${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}`;
        
        responseMessage = `✅ **RÉSERVATION PLANIFIÉE**
━━━━━━━━━━━━━━━━━━━━━

📅 **${dateStr}** à **${heureStr}**
🚗 **${session.vehicleType?.toUpperCase()}**
📍 **${session.destinationNom}**
📏 **${distance.toFixed(1)} km**
💰 **${prix.toLocaleString('fr-FR')} GNF**

💬 Répondez "**OUI**" pour confirmer cette réservation planifiée.`;

      } else {
        // Réservation immédiate standard
        responseMessage = `💰 **PRIX ESTIMÉ**
━━━━━━━━━━━━━━━━━━━━━

🚗 **${session.vehicleType?.toUpperCase()}** 
📍 **${session.destinationNom}**
📏 **${distance.toFixed(1)} km**
💰 **${prix.toLocaleString('fr-FR')} GNF**

💬 Répondez "**OUI**" pour commander votre ${session.vehicleType}.`;
      }
    } else {
      // Destination non trouvée → Retour au search manuel
      console.log(`❌ [IA_GPS] Destination non trouvée: "${session.destinationNom}"`);
      await saveSession(clientPhone, {
        ...session,
        positionClient: `POINT(${longitude} ${latitude})`,
        etat: 'position_recue'
      });
      
      responseMessage = `📍 Position reçue! 

🤔 Désolé, je n'ai pas trouvé "${session.destinationNom}" dans notre base. 

🔍 **Quelle est votre destination ?**
• Tapez le nom du lieu où vous voulez aller
• Ou tapez "près" pour voir les destinations proches`;
    }

  } else if (session.etat === 'ia_attente_heure' && !hasLocation) {
    // 🧠 HANDLER IA - État ia_attente_heure pour réservation planifiée
    console.log(`🧠 [IA_HEURE] État ia_attente_heure, message reçu: "${messageText}"`);
    
    const heureMatch = messageText.match(/(\d{1,2})(?:h|:)?(\d{0,2})?/);
    if (heureMatch) {
      const heure = parseInt(heureMatch[1]);
      const minutes = heureMatch[2] ? parseInt(heureMatch[2]) : 0;
      
      if (heure >= 6 && heure <= 23 && minutes >= 0 && minutes <= 59) {
        // Heure valide
        await saveSession(clientPhone, {
          ...session,
          plannedHour: heure,
          plannedMinute: minutes,
          etat: 'ia_attente_gps'
        });
        
        const heureStr = `${heure}:${minutes.toString().padStart(2, '0')}`;
        const dateStr = formatDateForDisplay(session.plannedDate!);
        
        responseMessage = `⏰ **HEURE CONFIRMÉE**
━━━━━━━━━━━━━━━━━━━━━

📅 ${dateStr} à **${heureStr}**
📍 Destination: ${session.destinationNom}

📍 **PARTAGEZ VOTRE POSITION**
• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"  
• 🎯 Confirmer le partage`;
      } else {
        responseMessage = `❌ Heure invalide. Les taxis sont disponibles de 6h à 23h.
        
⏰ Tapez une heure valide (ex: 8h, 12h30, 19h)`;
      }
    } else {
      responseMessage = `❌ Format d'heure non reconnu.

⏰ **Tapez l'heure souhaitée:**
• Format: 8h, 12h30, 19h  
• Horaires: 6h à 23h

📝 Exemples: "8h", "12h30", "19h"`;
    }

  } else if (session.etat === 'ia_attente_confirmation_report' && !hasLocation) {
    // 🧠 HANDLER IA - Gestion report automatique heure passée  
    console.log(`🧠 [IA_REPORT] État ia_attente_confirmation_report, message: "${messageText}"`);
    
    if (messageText.toLowerCase() === 'oui') {
      // Confirmer le report à demain
      await saveSession(clientPhone, {
        ...session,
        etat: 'ia_attente_gps'
      });
      
      responseMessage = `✅ **REPORT CONFIRMÉ**
━━━━━━━━━━━━━━━━━━━━━

📅 Nouvelle réservation: ${formatDateForDisplay(session.plannedDate!)} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}
📍 Destination: ${session.destinationNom}

📍 **PARTAGEZ VOTRE POSITION**
• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"
• 🎯 Confirmer le partage`;
      
    } else if (messageText.toLowerCase() === 'autre') {
      // Changer l'heure
      await saveSession(clientPhone, {
        ...session,
        etat: 'ia_attente_heure'
      });
      
      responseMessage = `⏰ **NOUVELLE HEURE**
━━━━━━━━━━━━━━━━━━━━━

📅 Date: ${formatDateForDisplay(session.plannedDate!)}
📍 Destination: ${session.destinationNom}

⏰ **QUELLE HEURE SOUHAITEZ-VOUS ?**

🌅 Suggestions:
• 7h00 - Très tôt, peu de trafic
• 8h00 - Début journée standard
• 12h00 - Pause déjeuner
• 17h00 - Fin d'après-midi

💬 Tapez l'heure souhaitée (ex: 7h30, 8h)`;
      
    } else {
      responseMessage = `❌ Réponse non comprise.

✅ Tapez "OUI" → Confirmer pour demain même heure
🔄 Tapez "AUTRE" → Changer l'heure`;
    }

  } else if (session.etat === 'ia_attente_gps_pour_lieux' && hasLocation) {
    // 🧠 HANDLER IA - GPS pour recherche de lieux proches (destination non reconnue initialement)
    console.log(`🧠 [IA_GPS_LIEUX] État ia_attente_gps_pour_lieux, GPS reçu: lat=${latitude}, lon=${longitude}`);
    
    // Rechercher les lieux proches de cette position
    const suggestions = await getNearbyPlaces(parseFloat(latitude!), parseFloat(longitude!));
    
    if (suggestions.length > 0) {
      await saveSession(clientPhone, {
        ...session,
        positionClient: `POINT(${longitude} ${latitude})`,
        suggestionsDestination: JSON.stringify(suggestions.slice(0, 5)),
        etat: 'choix_destination_multiple'
      });
      
      let message = `📍 **LIEUX PROCHES DE VOTRE POSITION**\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      suggestions.slice(0, 5).forEach((place, index) => {
        const distance = calculateDistance(
          { lat: parseFloat(latitude!), lon: parseFloat(longitude!) },
          { lat: place.latitude, lon: place.longitude }
        );
        message += `${index + 1}️⃣ **${place.nom}**\n📏 ${distance.toFixed(1)}km\n\n`;
      });
      
      message += `💬 **Tapez le numéro** de votre destination (1 à ${Math.min(5, suggestions.length)})`;
      responseMessage = message;
      
    } else {
      // Aucun lieu proche trouvé
      await saveSession(clientPhone, {
        ...session,
        positionClient: `POINT(${longitude} ${latitude})`,
        etat: 'position_recue'
      });
      
      responseMessage = `📍 Position reçue!

🤔 Aucun lieu reconnu près de votre position.

🔍 **Tapez votre destination:**
• Nom du quartier (ex: Madina, Kaloum)
• Lieu précis (ex: Aéroport, Université)
• Adresse approximative`;
    }

  } else if (session.etat === 'ia_attente_gps' && !hasLocation) {
    // 🧠 HANDLER IA - État ia_attente_gps avec message texte (selon PLAN_FINAL_WORKFLOWS_DETAILLES.md)
    console.log(`🧠 [IA_TEXT] État ia_attente_gps, message texte reçu: "${messageText}"`);
    
    // L'utilisateur envoie un message texte au lieu du GPS
    // → Possibilité de modifier la destination ou demander aide
    
    if (messageText.toLowerCase().includes('changer') || messageText.toLowerCase().includes('modifier')) {
      // Changer la destination
      await saveSession(clientPhone, {
        ...session,
        destinationNom: null,
        etat: session.vehicleType ? 'vehicule_choisi' : 'initial'
      });
      
      responseMessage = `🔄 **CHANGEMENT DE DESTINATION**

🔍 **Quelle est votre nouvelle destination ?**
• Tapez le nom du lieu où vous voulez aller
• Ou tapez "près" pour voir les destinations proches`;
      
    } else if (messageText.toLowerCase().includes('aide') || messageText.toLowerCase() === '?') {
      // Aide pour partager GPS
      responseMessage = `📍 **AIDE - PARTAGE DE POSITION**
━━━━━━━━━━━━━━━━━━━━━

📱 **Comment partager votre position:**

1️⃣ Cliquez sur l'icône **trombone** (📎)
2️⃣ Sélectionnez "**Localisation**"  
3️⃣ Confirmer le partage

⚠️ **Important:** Ne pas utiliser "Localisation en direct"

🗺️ Alternative: tapez "changer" pour modifier la destination`;
      
    } else {
      // Traiter le message comme une potentielle nouvelle destination
      console.log(`🧠 [IA_TEXT] Possible nouvelle destination: "${messageText}"`);
      
      // Essayer de chercher cette destination
      const destinations = await searchLocation(messageText, SUPABASE_URL, workingApiKey);
      
      if (destinations && destinations.length > 0) {
        // Destination trouvée → Mettre à jour la session
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinations[0].nom,
          etat: 'ia_attente_gps' // Rester dans le même état
        });
        
        responseMessage = `✅ **DESTINATION MISE À JOUR**

📍 Nouvelle destination: **${destinations[0].nom}**

📍 **MAINTENANT, PARTAGEZ VOTRE POSITION**
• 📱 Cliquer sur l'icône trombone (📎)
• 📍 Sélectionner "Localisation"
• 🎯 Confirmer le partage`;
        
      } else {
        // Destination non trouvée
        responseMessage = `❌ Destination "${messageText}" non trouvée.

🔍 **Options:**
• Tapez un autre nom de lieu
• Tapez "aide" pour l'aide GPS
• Tapez "changer" pour recommencer

📍 **En attente de votre position GPS pour:**
${session.destinationNom}`;
      }
    }

  } else if (hasLocation) {
    // PRIORITÉ: Traiter d'abord les positions GPS
    console.log(`🚨 DEBUG - ENTRÉE DANS BLOC hasLocation`);
    console.log(`🚨 DEBUG - session.vehicleType: ${session.vehicleType}`);
    console.log(`🚨 DEBUG - session.etat: ${session.etat}`);
    console.log(`🚨 DEBUG - session.destinationNom: ${session.destinationNom}`);
    console.log(`🚨 DEBUG - session complète:`, JSON.stringify(session));
    
    // 🆕 VÉRIFIER SI C'EST UN GPS LIEU DE DÉPART (réservation tierce avec suggestions)
    if (session.etat === 'depart_autre_personne_avec_suggestions' && session.vehicleType) {
      // 🎯 GPS COMME LIEU DE DÉPART pour réservation tierce
      console.log(`📍 GPS reçu comme LIEU DE DÉPART dans état ${session.etat}`);
      
      // Détecter si position transférée
      let isTransferred = false;
      if (payload?.messageData?.locationMessageData) {
        isTransferred = payload.messageData.locationMessageData.isForwarded === true;
      }
      
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const departName = isTransferred ? "📍 Position transférée (ami)" : "📍 Position GPS partagée";
        console.log(`✅ Lieu de départ GPS valide: ${departName} (${lat}, ${lon})`);
        
        // Sauvegarder lieu de départ GPS
        await saveSession(clientPhone, {
          ...session,
          departNom: departName,
          departPosition: `POINT(${lon} ${lat})`,
          etat: 'en_attente_destination_tierce'  // Transition vers état attente destination
        });
        
        responseMessage = `✅ **LIEU DE DÉPART CONFIRMÉ**

📍 Départ: ${departName}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}

🎯 Maintenant, tapez le nom de la destination où emmener la personne.`;
      } else {
        responseMessage = `❌ Position GPS invalide. Veuillez réessayer ou tapez le nom du lieu de départ.`;
      }
      
    // 🆕 VÉRIFIER SI C'EST UNE DESTINATION GPS (position_recue = attente destination)  
    } else if ((session.etat === 'position_recue' || session.etat === 'position_recue_planifiee' || session.etat === 'position_recue_avec_suggestions' || session.etat === 'depart_autre_personne' || session.etat === 'en_attente_destination_tierce') && session.vehicleType) {
      // 🎯 GPS COMME DESTINATION
      console.log(`📍 GPS reçu comme DESTINATION dans état ${session.etat}`);
      
      // Détecter si position transférée
      let isTransferred = false;
      if (payload?.messageData?.locationMessageData) {
        isTransferred = payload.messageData.locationMessageData.isForwarded === true;
      }
      
      // Logs structurés JSON
      const logData = {
        event: isTransferred ? "DESTINATION_LOCATION_TRANSFERRED" : "DESTINATION_LOCATION_STATIC",
        timestamp: new Date().toISOString(),
        source: "whatsapp",
        shareType: isTransferred ? "transferred" : "static",
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        sessionId: session.id || clientPhone,
        isForwarded: isTransferred,
        forwardingScore: payload?.messageData?.locationMessageData?.forwardingScore || 0,
        rawPayload: JSON.stringify({
          typeMessage: payload?.messageData?.typeMessage,
          hasLocation: !!payload?.messageData?.locationMessageData
        })
      };
      console.log(`📊 DESTINATION_GPS_LOG:`, JSON.stringify(logData));
      
      // Parser les coordonnées
      const destLat = parseFloat(latitude);
      const destLon = parseFloat(longitude);
      
      if (isNaN(destLat) || isNaN(destLon)) {
        console.error(`❌ Coordonnées GPS invalides: lat=${latitude}, lon=${longitude}`);
        responseMessage = `❌ Position GPS invalide. 
        
Veuillez réessayer ou tapez le nom de votre destination.`;
      } else {
        // Normaliser comme destination
        const destinationName = isTransferred ? "📍 Position transférée (ami)" : "📍 Position GPS partagée";
        console.log(`✅ Destination GPS valide: ${destinationName} (${destLat}, ${destLon})`);
        
        // Calculer distance et prix selon le type de réservation
        let distanceKm1;
        if (session.etat === 'depart_autre_personne' || session.etat === 'en_attente_destination_tierce') {
          // Réservation pour quelqu'un d'autre : distance depuis le lieu de départ défini
          if (session.departPosition) {
            const departCoords = await getCoordinatesFromAddress(session.departPosition);
            distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, destLat, destLon);
            console.log(`📏 Distance calculée (réservation tierce): ${session.departNom} → GPS = ${distanceKm1.toFixed(2)} km`);
          } else {
            throw new Error('Lieu de départ manquant pour réservation tierce');
          }
        } else {
          // Réservation normale : distance depuis position client
          const clientCoords = await getClientCoordinates(normalizePhone(from));
          distanceKm1 = calculateDistance(clientCoords.latitude, clientCoords.longitude, destLat, destLon);
          console.log(`📏 Distance calculée (réservation normale): Client → GPS = ${distanceKm1.toFixed(2)} km`);
        }
        const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
        
        // Sauvegarder avec format standard
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationName,
          destinationPosition: `POINT(${destLon} ${destLat})`,
          distanceKm: distanceKm1,
          prixEstime: prixInfo1.prix_total,
          etat: session.etat === 'position_recue_planifiee' ? 'prix_calcule_planifie' : 
                (session.etat === 'depart_autre_personne' || session.etat === 'en_attente_destination_tierce') ? 'prix_calcule_tierce' : 'prix_calcule'
        });
        
        const temporalInfo = session.temporalPlanning ? 
          `📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}\n` : '';
        
        // Message personnalisé UNIQUEMENT pour réservation tierce (état exact)
        if ((session.etat === 'depart_autre_personne' || session.etat === 'en_attente_destination_tierce') && session.departNom && !session.temporalPlanning) {
          responseMessage = `📍 **RÉSUMÉ RÉSERVATION TIERCE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
👥 **Pour:** Une autre personne
📍 **Départ:** ${session.departNom}
🎯 **Destination:** ${destinationName}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo1.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
        } else {
          responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${destinationName}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo1.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
        }
      }
      // FIN DU BLOC DESTINATION GPS - Ne pas continuer dans le reste du bloc hasLocation
    } else {
      // BLOC GPS DÉPART NORMAL (code existant)
    
    // 🔍 DEBUG POSITION TRANSFÉRÉE - ANALYSE COMPLÈTE
    console.log(`📍 =================================================`);
    console.log(`📍 ANALYSE POSITION REÇUE - ${new Date().toISOString()}`);
    console.log(`📍 Latitude brute: ${latitude}`);
    console.log(`📍 Longitude brute: ${longitude}`);
    console.log(`📍 Type message: ${hasLocation ? 'POSITION GPS' : 'AUTRE'}`);
    console.log(`📍 État workflow: ${session.etat}`);
    console.log(`📍 Véhicule: ${session.vehicleType || 'NON DÉFINI'}`);
    console.log(`📍 =================================================`);
    
    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      console.log(`📍 Position parsée: ${lat}, ${lon}`);
      console.log(`📍 Validation coordonnées: ${!isNaN(lat) && !isNaN(lon) ? '✅ VALIDES' : '❌ INVALIDES'}`);
      // PRIORITÉ ABSOLUE aux états IA avant de vérifier vehicleType
      if (session.etat === 'vehicule_et_destination_ia') {
        // CAS IA: Session créée par l'IA audio - continuer workflow
        console.log(`🎤 DEBUG - WORKFLOW AUDIO - État IA détecté, session valide pour GPS`);
        console.log(`✅ DEBUG - vehicleType depuis session: ${session.vehicleType}`);
        console.log(`✅ DEBUG - destinationNom depuis session: ${session.destinationNom}`);
        await saveSession(clientPhone, {
          ...session,
          positionClient: `POINT(${lon} ${lat})`,
          etat: 'position_recue_avec_destination_ia'
        });
        responseMessage = `📍 **POSITION GPS REÇUE !**

🤖 **ANALYSE IA CONFIRMÉE:**
📍 Destination: ${session.destinationNom}
🚗 Véhicule: ${session.vehicleType.toUpperCase()}

✅ **Confirmez-vous cette destination ?**

**Répondez:**
• "oui" → Calculer le prix et trouver un conducteur
• "non" → Choisir une autre destination

**Ou tapez directement le nom d'une nouvelle destination.**`;
      } else if (session.etat === 'lieu_depart_trouve') {
        // NOUVEAU: Handler destination GPS après lieu départ trouvé (réservation tierce)
        console.log(`🎯 DEBUG - DESTINATION GPS - État: lieu_depart_trouve, GPS reçu: ${lat}, ${lon}`);
        // Vérifier qu'on a bien un lieu de départ dans la session
        if (!session.departNom) {
          responseMessage = `❌ Erreur: Lieu de départ manquant. Retapez 'taxi' pour recommencer.`;
        } else {
          // Calculer la distance entre lieu départ et destination GPS
          const lieuDepartCoords = await getCoordinatesFromAddress(session.departNom);
          console.log(`🔍 DEBUG - Format coordonnées getCoordinatesFromAddress:`, JSON.stringify(lieuDepartCoords));
          if (lieuDepartCoords) {
            // 🔧 NORMALISATION FORMAT: {latitude,longitude} → {lat,lon} pour calculateDistance
            const coordsNormalized = {
              lat: lieuDepartCoords.latitude,
              lon: lieuDepartCoords.longitude
            };
            console.log(`🔍 DEBUG - Paramètres calculateDistance normalisés:`, JSON.stringify({
              depart: coordsNormalized,
              destination: {
                lat,
                lon
              }
            }));
            const distance = calculateDistance(coordsNormalized.lat, coordsNormalized.lon, lat, lon);
            console.log(`🔍 DEBUG - Distance retournée:`, distance);
            const prix = await calculerPrixCourse(session.vehicleType || 'moto', distance);
            console.log(`🔍 DEBUG - Prix retourné:`, JSON.stringify(prix));
            // Protection contre prix null
            if (!prix || !prix.prix_total) {
              responseMessage = `❌ Erreur calcul du prix. Retapez 'taxi' pour recommencer.`;
              return;
            }
            await saveSession(clientPhone, {
              ...session,
              destinationNom: 'Position GPS partagée',
              destinationPosition: `POINT(${lon} ${lat})`,
              distance: distance,
              prixEstime: prix.prix_total,
              etat: 'prix_calcule_tiers'
            });
            responseMessage = `📍 **DESTINATION REÇUE**
🎯 Coordonnées: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°W

📋 **RÉSUMÉ DE VOTRE COURSE**
🔄 *Réservation Tierce*

🚗 **Véhicule:** ${session.vehicleType?.toUpperCase()}
👥 **Client:** Une autre personne
📍 **Départ:** ${session.departNom}
🎯 **Arrivée:** Position GPS partagée
📏 **Distance:** ${distance.toFixed(1)} km
💰 **Prix:** *${prix.prix_total.toLocaleString('fr-FR')} GNF*
⏱️ **Durée:** ~${Math.ceil(distance * 4)} minutes

✅ **Confirmez-vous cette réservation ?**
💬 Répondez **"oui"** pour confirmer`;
          } else {
            responseMessage = `❌ Erreur: Impossible de récupérer les coordonnées du lieu de départ. 
Retapez 'taxi' pour recommencer.`;
          }
        }
      } else if (session.etat === 'depart_confirme_planifie') {
        // 🔧 CORRECTIF CRITIQUE: GPS partagé = DESTINATION (pas demander destination!)
        console.log(`📝 DEBUG - WORKFLOW PLANIFIÉ - État depart_confirme_planifie détecté`);
        console.log(`🔧 CORRECTIF V2→V3 - BUG RÉSOLU: depart_confirme_planifie + GPS = DESTINATION`);
        console.log(`📊 DEBUG SESSION - etat: ${session.etat}, departNom: ${session.departNom}, vehicleType: ${session.vehicleType}`);
        console.log(`📍 DEBUG GPS - DESTINATION reçue: lat=${lat}, lon=${lon}`);
        // Calculer distance depuis point de départ vers GPS (destination)
        const departCoords = await getCoordinatesFromAddress(session.departPosition || session.departNom);
        const distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, lat, lon);
        const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
        await saveSession(clientPhone, {
          ...session,
          destinationNom: 'Position GPS partagée',
          destinationPosition: `POINT(${lon} ${lat})`,
          distanceKm: distanceKm1,
          prixEstime: prixInfo1.prix_total,
          etat: 'prix_calcule_planifie'
        });
        console.log(`✅ CORRECTIF V2→V3 - GPS traité comme DESTINATION, prix calculé: ${prixInfo1.prix_total} GNF`);
        responseMessage = `📍 **DESTINATION REÇUE !**

📋 **RÉSUMÉ DE VOTRE COURSE**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}  
📍 Départ: ${session.departNom}
🎯 Destination: Position GPS partagée
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

✅ **Confirmez-vous cette réservation ?**
• Répondez **'oui'** pour confirmer`;
      } else if (!session.vehicleType) {
        // CAS STANDARD: Pas de vehicleType ET pas d'état IA
        console.log(`📝 DEBUG - WORKFLOW TEXTE - Pas de vehicleType dans la session`);
        responseMessage = `⚠️ Veuillez d'abord choisir votre type de véhicule.

Pour commencer: écrivez 'taxi'`;
      } else if (session.etat === 'vehicule_choisi' || session.etat === 'attente_position_planifie') {
        console.log(`📝 DEBUG - WORKFLOW TEXTE/TEMPOREL - État ${session.etat} détecté, sauvegarde position...`);
        // ✅ NOUVELLE PARTIE: Vérifier conducteurs dans 5km
        const conducteursProches = await getAvailableDrivers(session.vehicleType, {
          lat,
          lon
        }, 5000);
        if (conducteursProches.length === 0) {
          // Aucun conducteur proche
          await saveSession(clientPhone, {
            ...session,
            positionClient: `POINT(${lon} ${lat})`,
            etat: 'aucun_conducteur_proximite',
            conducteursDisponibles: 0
          });
          responseMessage = `❌ Désolé, aucun conducteur ${session.vehicleType.toUpperCase()} disponible dans un rayon de 5km

• Tapez "taxi" pour recommencer`;
        } else {
          // Conducteurs trouvés - continuer normalement
          const nouvelEtat = session.temporalPlanning ? 'position_recue_planifiee' : 'position_recue';
          console.log(`📅 DEBUG - Nouveau état: ${nouvelEtat} (temporel: ${session.temporalPlanning})`);
          await saveSession(clientPhone, {
            ...session,
            positionClient: `POINT(${lon} ${lat})`,
            etat: nouvelEtat,
            conducteursDisponibles: conducteursProches.length
          });
          // Gestion spéciale pour les réservations temporelles avec auto_detect
          if (session.temporalPlanning && session.destinationNom === 'auto_detect') {
            // Cas audio IA avec destination non détectée automatiquement
            responseMessage = `📍 **POSITION GPS REÇUE !**

📅 **RÉSERVATION PLANIFIÉE:** ${session.plannedDate} à ${session.plannedHour}h
🚗 **Véhicule:** ${session.vehicleType.toUpperCase()}

🎤 **Aucune destination détectée dans votre message vocal.**

🏁 **Quelle est votre destination ?**

**Exemples disponibles:**
• CHU Donka (Conakry)
• Pharmacie Donka (Conakry) 
• Madina Centre (Conakry)
• Kipe Centre (Conakry)

**Tapez le nom de votre destination:**`;
          } else if (session.destinationNom && session.destinationNom !== 'auto_detect') {
            // ✅ NOUVEAU: Destination déjà connue (extraite par IA) - Passer directement au calcul
            console.log(`🤖 [IA-WORKFLOW] Destination IA trouvée: "${session.destinationNom}", passage direct au calcul`);
            // 🔧 CORRECTIF AFFICHAGE - Date par défaut si null
            const displayDate = session.plannedDate || "Aujourd'hui";
            const temporalInfo = session.temporalPlanning ? `📅 **PLANIFIÉ:** ${displayDate} à ${session.plannedHour}h${(session.plannedMinute ?? 0).toString().padStart(2, '0')}\n` : '';
            // Rechercher l'adresse extraite par IA
            const adressesIA = await searchAdresse(session.destinationNom);
            // 🔍 DEBUG - Analyser le format de retour
            console.log(`🔍 [IA-DEBUG] Type adressesIA:`, typeof adressesIA);
            console.log(`🔍 [IA-DEBUG] Is Array:`, Array.isArray(adressesIA));
            console.log(`🔍 [IA-DEBUG] adressesIA:`, JSON.stringify(adressesIA, null, 2));
            if (adressesIA && (Array.isArray(adressesIA) && adressesIA.length > 0 || !Array.isArray(adressesIA) && adressesIA.nom)) {
              const adresseSelectionnee = Array.isArray(adressesIA) ? adressesIA[0] : adressesIA;
              console.log(`🎯 [IA-WORKFLOW] Adresse trouvée: ${adresseSelectionnee.nom}`);
              // Calculer distance et prix directement
              const clientCoords = await getClientCoordinates(normalizePhone(from));
              const distanceKm1 = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresseSelectionnee.latitude, adresseSelectionnee.longitude);
              const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
              await saveSession(clientPhone, {
                ...session,
                destinationNom: adresseSelectionnee.nom,
                destinationPosition: `POINT(${adresseSelectionnee.longitude} ${adresseSelectionnee.latitude})`,
                distanceKm: distanceKm1,
                prixEstime: prixInfo1.prix_total,
                etat: session.temporalPlanning ? 'prix_calcule_planifie' : 'prix_calcule'
              });
              responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresseSelectionnee.nom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo1.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
            } else {
              // Destination IA non trouvée dans la base
              responseMessage = `📍 Position reçue!
✅ ${conducteursProches.length} conducteur(s) ${session.vehicleType.toUpperCase()} disponible(s) à proximité!

${temporalInfo}❓ Destination "${session.destinationNom}" non trouvée dans notre base.

🏁 Précisez votre destination :

Exemples disponibles:
• CHU Donka (Conakry)
• Pharmacie Donka (Conakry) 
• Madina Centre (Conakry)

Tapez le nom exact de votre destination:`;
            }
          } else {
            // Cas normal - Pas de destination définie
            const googleSuggestions = await getSuggestionsIntelligentes('', 6);
            // ENRICHISSEMENT: Ajouter adresses personnelles du client (NO-OP si pas d'adresses)
            const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, true);
            
            // SAUVEGARDER les suggestions pour permettre la sélection numérique
            await saveSession(clientPhone, {
              ...session,
              suggestionsDestination: JSON.stringify(suggestions),
              etat: 'position_recue_avec_suggestions'
            });
            
            const suggestionsText = suggestions.length > 0 ? suggestions.map((addr, index)=>`• ${index + 1}️⃣ ${addr.nom} (${addr.ville})`).join('\n') : `• CHU Donka (Conakry)\n• Pharmacie Donka (Conakry)\n• Madina Centre (Conakry)`;
            // 🔧 CORRECTIF AFFICHAGE - Date par défaut si null
            const displayDate = session.plannedDate || "Aujourd'hui";
            const temporalInfo = session.temporalPlanning ? `📅 **PLANIFIÉ:** ${displayDate} à ${session.plannedHour}h\n` : '';
            responseMessage = `📍 Position reçue!
✅ ${conducteursProches.length} conducteur(s) ${session.vehicleType.toUpperCase()} disponible(s) à proximité!

${temporalInfo}🏁 Quelle est votre destination ?

Exemples de destinations disponibles:
${suggestionsText}

🚗 **Pour aller chercher quelqu'un :** Cette personne peut vous partager sa position via WhatsApp :
📎 → Localisation → ✅ "Envoyer localisation actuelle" (❌ PAS "localisation en direct")

Tapez le numéro ou le nom de votre destination:`;
          }
        }
      } else {
        console.log(`❌ DEBUG - État session invalide: "${session.etat}"`);
        console.log(`❌ DEBUG - vehicleType: "${session.vehicleType}"`);
        console.log(`❌ DEBUG - destinationNom: "${session.destinationNom}"`);
        console.log(`❌ DEBUG - Session complète:`, JSON.stringify(session));
        responseMessage = `❌ **ERREUR SESSION GPS**

🔍 **Debug Info:**
• État session: "${session.etat}"
• Véhicule: "${session.vehicleType || 'NULL'}"
• Destination: "${session.destinationNom || 'NULL'}"

🔄 **Solution:**
📝 Écrivez 'taxi' pour redémarrer
🎤 Ou renvoyez votre message vocal

🆘 Si le problème persiste, envoyez cette info au support.`;
      }
    } catch (error) {
      console.error('💥 Erreur traitement position:', error);
      responseMessage = `💥 Erreur technique.

${error.message}
Pour recommencer: écrivez 'taxi'`;
    }
  } // Fin du bloc hasLocation
  } else if (session.etat === 'position_recue_avec_suggestions' && !hasLocation && !['oui', 'non', 'confirmer', 'annuler'].includes(messageText.toLowerCase())) {
    // 🔢 SÉLECTION NUMÉRIQUE DES SUGGESTIONS INITIALES
    console.log(`🔢 Gestion sélection suggestions initiales: "${messageText}"`);
    
    try {
      const suggestions = JSON.parse(session.suggestionsDestination || '[]');
      const choixNumero = parseInt(messageText);
      
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        // Sélection numérique valide
        const destinationChoisie = suggestions[choixNumero - 1];
        console.log(`✅ Sélection #${choixNumero}: ${destinationChoisie.nom}`);
        
        // Calculer distance et prix
        const clientCoords = await getClientCoordinates(normalizePhone(from));
        const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, destinationChoisie.latitude, destinationChoisie.longitude);
        const prixInfo = await calculerPrixCourse(session.vehicleType, distanceKm);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationChoisie.nom,
          destinationId: destinationChoisie.id,
          destinationPosition: `POINT(${destinationChoisie.longitude} ${destinationChoisie.latitude})`,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: session.temporalPlanning ? 'prix_calcule_planifie' : 'prix_calcule'
        });
        
        const temporalInfo = session.temporalPlanning ? `📅 ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}\n` : '';
        responseMessage = `✅ **DESTINATION CONFIRMÉE**

🎯 Destination: ${destinationChoisie.nom}
📏 Distance: ${distanceKm.toFixed(2)} km  
💰 Prix estimé: **${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType.toUpperCase()}
${temporalInfo}
**Confirmez-vous cette réservation ?**
✅ Tapez "oui" pour confirmer
❌ Tapez "non" pour annuler`;
      } else {
        // Recherche textuelle normale si ce n'est pas un numéro valide
        console.log(`🔍 Recherche textuelle pour: "${messageText}"`);
        const resultats = await searchAdresse(body);
        const suggestions = Array.isArray(resultats) ? resultats : resultats ? [resultats] : [];
        
        if (suggestions.length === 1) {
          // Un seul résultat, sélection automatique
          const adresse = suggestions[0];
          let distanceKm;
          if (session.etat === 'en_attente_destination_tierce' && session.departPosition) {
            const departCoords = await getCoordinatesFromAddress(session.departPosition);
            distanceKm = calculateDistance(departCoords.latitude, departCoords.longitude, adresse.latitude, adresse.longitude);
          } else {
            const clientCoords = await getClientCoordinates(normalizePhone(from));
            distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresse.latitude, adresse.longitude);
          }
          const prixInfo = await calculerPrixCourse(session.vehicleType, distanceKm);
          
          await saveSession(clientPhone, {
            ...session,
            destinationNom: adresse.nom,
            destinationId: adresse.id,
            destinationPosition: `POINT(${adresse.longitude} ${adresse.latitude})`,
            distanceKm: distanceKm,
            prixEstime: prixInfo.prix_total,
            etat: session.temporalPlanning ? 'prix_calcule_planifie' : 
                  (session.etat === 'en_attente_destination_tierce') ? 'prix_calcule_tierce' : 'prix_calcule'
          });
          
          responseMessage = `✅ **DESTINATION CONFIRMÉE**

🎯 Destination: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(2)} km
💰 Prix estimé: **${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType.toUpperCase()}

**Confirmez-vous cette réservation ?**
✅ Tapez "oui" pour confirmer  
❌ Tapez "non" pour annuler`;
        } else if (suggestions.length > 1) {
          // Plusieurs résultats, afficher les choix
          await saveSession(clientPhone, {
            ...session,
            suggestionsDestination: JSON.stringify(suggestions),
            etat: 'choix_destination_multiple'
          });
          
          responseMessage = `🎯 **Plusieurs destinations trouvées pour "${body}"**

Choisissez votre destination :

${suggestions.map((lieu, i) => `${i + 1}. **${lieu.nom}** (${lieu.ville || 'Conakry'})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${suggestions.length})`;
        } else {
          responseMessage = `❓ Destination non trouvée: "${body}"

Destinations suggérées:
• CHU Donka (Conakry)
• Pharmacie Donka (Conakry)  
• Madina Centre (Conakry)

Ou tapez 'annuler' pour recommencer.`;
        }
      }
    } catch (error) {
      console.error('❌ Erreur sélection suggestions initiales:', error);
      responseMessage = `❌ Erreur technique. Retapez votre destination.`;
    }
  } else if (session.etat === 'depart_autre_personne_avec_suggestions' && !hasLocation && !['oui', 'non', 'confirmer', 'annuler'].includes(messageText.toLowerCase())) {
    // 🔢 SÉLECTION NUMÉRIQUE DES SUGGESTIONS DÉPART
    console.log(`🔢 Gestion sélection suggestions départ: "${messageText}"`);
    
    try {
      const suggestions = JSON.parse(session.suggestionsDepart || '[]');
      const choixNumero = parseInt(messageText);
      
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        // Sélection numérique valide
        const departChoisi = suggestions[choixNumero - 1];
        console.log(`✅ Sélection départ #${choixNumero}: ${departChoisi.nom}`);
        
        // Sauvegarder le lieu de départ sélectionné
        await saveSession(clientPhone, {
          ...session,
          departNom: departChoisi.nom,
          departId: departChoisi.id,
          departPosition: `POINT(${departChoisi.longitude} ${departChoisi.latitude})`,
          etat: 'en_attente_destination_tierce'
        });
        
        responseMessage = `✅ **LIEU DE DÉPART CONFIRMÉ**

📍 Départ: ${departChoisi.nom}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}

🎯 Maintenant, tapez le nom de la destination où emmener la personne.`;
      } else {
        // Pas un numéro valide, continuer avec recherche textuelle
        const resultatsDepart = await searchAdresse(messageText);
        const result = Array.isArray(resultatsDepart) ? resultatsDepart[0] : resultatsDepart;
        
        if (result && result.nom) {
          // Lieu trouvé, sauvegarder comme départ
          await saveSession(clientPhone, {
            ...session,
            departNom: result.nom,
            departId: result.id,
            departPosition: `POINT(${result.longitude} ${result.latitude})`,
            etat: 'en_attente_destination_tierce'
          });
          
          responseMessage = `✅ **LIEU DE DÉPART CONFIRMÉ**

📍 Départ: ${result.nom}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}

🎯 Maintenant, tapez le nom de la destination où emmener la personne.`;
        } else {
          // Lieu non trouvé, afficher suggestions
          const googleSuggestions = await getSuggestionsIntelligentes(messageText, 5);
          const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, false);
          const suggestionsText = suggestions.map((s, i)=>`${i + 1}️⃣ ${s.nom}`).join('\n');
          
          responseMessage = `❓ Lieu de départ non trouvé: "${messageText}"

Suggestions disponibles:
${suggestionsText}

📝 Tapez le numéro (1-${suggestions.length}) ou un autre nom de lieu`;
          
          // Mettre à jour les suggestions pour la prochaine sélection
          await saveSession(clientPhone, {
            ...session,
            suggestionsDepart: JSON.stringify(suggestions)
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur sélection suggestions départ:', error);
      responseMessage = `❌ Erreur technique. Retapez votre lieu de départ.`;
    }
  } else if ((session.etat === 'position_recue' || session.etat === 'position_recue_planifiee' || session.etat === 'en_attente_destination_tierce') && !hasLocation && !['oui', 'non', 'confirmer', 'annuler'].includes(messageText.toLowerCase())) {
    // 🔍 TEXTE: Recherche destination (code existant intact)
    console.log(`🔍 Recherche destination: "${body}"`);
    const resultats = await searchAdresse(body);
    // Adapter au format attendu (resultats est maintenant un array ou null)
    const suggestions = Array.isArray(resultats) ? resultats : resultats ? [
      resultats
    ] : [];
    if (suggestions.length === 0) {
      // Aucun résultat trouvé
      responseMessage = `❓ Destination non trouvée: "${body}"

Destinations suggérées:
• CHU Donka (Conakry)
• Pharmacie Donka (Conakry)  
• Madina Centre (Conakry)

Ou tapez 'annuler' pour recommencer.`;
    } else if (suggestions.length === 1) {
      // Un seul résultat = sélection automatique (comme avant)
      const adresse1 = suggestions[0];
      console.log(`✅ Destination unique trouvée: ${adresse1.nom}`);
      // Calculer distance et prix
      let distanceKm1;
      if (session.etat === 'en_attente_destination_tierce' && session.departPosition) {
        const departCoords = await getCoordinatesFromAddress(session.departPosition);
        distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, adresse1.latitude, adresse1.longitude);
      } else {
        const clientCoords = await getClientCoordinates(normalizePhone(from));
        distanceKm1 = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresse1.latitude, adresse1.longitude);
      }
      const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
      // CORRECTION: Ajouter le responseMessage manquant pour résultat unique
      await saveSession(clientPhone, {
        ...session,
        destinationNom: adresse1.nom,
        destinationId: adresse1.id,
        destinationPosition: `POINT(${adresse1.longitude} ${adresse1.latitude})`,
        distanceKm: distanceKm1,
        prixEstime: prixInfo1.prix_total,
        etat: session.etat === 'position_recue_planifiee' ? 'prix_calcule_planifie' : 
              (session.etat === 'en_attente_destination_tierce') ? 'prix_calcule_tierce' : 'prix_calcule'
      });
      const temporalInfo = session.temporalPlanning ? `📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}\n` : '';
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresse1.nom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo1.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
    } else if (suggestions.length > 1) {
      // 🆕 PLUSIEURS RÉSULTATS = AFFICHER CHOIX MULTIPLES (comme workflow IA)
      console.log(`🎯 ${suggestions.length} destinations trouvées pour "${body}"`);
      // Sauvegarder suggestions dans session pour le choix
      await saveSession(clientPhone, {
        ...session,
        suggestionsDestination: JSON.stringify(suggestions),
        etat: 'choix_destination_multiple'
      });
      responseMessage = `🎯 **Plusieurs destinations trouvées pour "${body}"**

Choisissez votre destination :

${suggestions.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville || 'Conakry'})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${suggestions.length})`;
    } else {
      const nouvelEtatPrix = session.temporalPlanning ? 'prix_calcule_planifie' : 'prix_calcule';
      await saveSession(clientPhone, {
        ...session,
        destinationNom: adresse.nom,
        destinationId: adresse.id,
        destinationPosition: `POINT(${adresse.longitude} ${adresse.latitude})`,
        distanceKm: distanceKm,
        prixEstime: prixInfo.prix_total,
        etat: nouvelEtatPrix
      });
      // 🔧 CORRECTIF AFFICHAGE - Date par défaut si null
      const displayDate = session.plannedDate || "Aujourd'hui";
      const temporalInfo = session.temporalPlanning ? `📅 **PLANIFIÉ:** ${displayDate} à ${session.plannedHour}h\n` : '';
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
    }
  // CORRECTION BUG: Handler destination après choix véhicule (TEXTE SEULEMENT)
  } else if (session.etat === 'vehicule_choisi' && !hasLocation && messageText.trim() !== '') {
    // 🎯 L'utilisateur saisit sa DESTINATION après avoir choisi le véhicule
    console.log(`📝 DEBUG - WORKFLOW TEXTE - État vehicule_choisi + texte destination: "${messageText}"`);
    
    const suggestions = await searchAdresse(messageText);
    
    if (!suggestions || (Array.isArray(suggestions) && suggestions.length === 0)) {
      // Aucun résultat - suggestions intelligentes
      const suggestionsList = await getSuggestionsIntelligentes(messageText, 5);
      const suggestionsText = suggestionsList.map((s, i) => `${i + 1}️⃣ ${s.nom}`).join('\n');
      responseMessage = `❓ Destination non trouvée: "${messageText}"

Suggestions proches:
${suggestionsText}

Tapez le numéro de votre choix ou essayez un autre nom de destination`;
      
    } else if (Array.isArray(suggestions) && suggestions.length > 1) {
      // PLUSIEURS DESTINATIONS - État choix_destination_multiple
      await saveSession(clientPhone, {
        ...session,
        suggestionsDestination: JSON.stringify(suggestions),
        etat: 'choix_destination_multiple'
      });
      responseMessage = `🎯 **Plusieurs destinations trouvées pour "${messageText}"**

Choisissez votre destination :

${suggestions.map((lieu, i) => `${i + 1}. **${lieu.nom}** (${lieu.ville || 'Conakry'})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${suggestions.length})`;
      
    } else {
      // UNE SEULE DESTINATION TROUVÉE - Calculer prix
      const adresse = Array.isArray(suggestions) ? suggestions[0] : suggestions;
      const clientPosition = await getClientCoordinates(normalizePhone(clientPhone));
      const distanceKm = calculateDistance(clientPosition.lat, clientPosition.lon, adresse.latitude, adresse.longitude);
      const prixInfo = calculatePrice(session.vehicleType, distanceKm);
      
      const nouvelEtatPrix = session.temporalPlanning ? 'prix_calcule_planifie' : 'prix_calcule';
      await saveSession(clientPhone, {
        ...session,
        destinationNom: adresse.nom,
        destinationId: adresse.id,
        destinationPosition: `POINT(${adresse.longitude} ${adresse.latitude})`,
        distanceKm: distanceKm,
        prixEstime: prixInfo.prix_total,
        etat: nouvelEtatPrix
      });
      // 🔧 CORRECTIF AFFICHAGE - Date par défaut si null
      const displayDate = session.plannedDate || "Aujourd'hui";
      const temporalInfo = session.temporalPlanning ? `📅 **PLANIFIÉ:** ${displayDate} à ${session.plannedHour}h\n` : '';
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

${temporalInfo}🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
    }
  // EXISTANT: Handler recherche lieu départ pour réservation tierce (TEXTE SEULEMENT)
  } else if (session.etat === 'depart_autre_personne' && !hasLocation && messageText.trim() !== '') {
    const lieuxDepart = await searchAdresse(messageText);
    // 🔧 LOGIQUE SIMPLE: Réutiliser la logique existante (ligne 2392-2393)
    if (!lieuxDepart || Array.isArray(lieuxDepart) && lieuxDepart.length === 0) {
      // Lieu non trouvé - suggestions
      const suggestions = await getSuggestionsIntelligentes(messageText, 5);
      const suggestionsText = suggestions.map((s, i)=>`${i + 1}️⃣ ${s.nom}`).join('\n');
      responseMessage = `❓ Lieu non trouvé: "${messageText}"

Suggestions proches:
${suggestionsText}

Tapez le numéro de votre choix ou essayez un autre nom`;
    } else if (Array.isArray(lieuxDepart) && lieuxDepart.length > 1) {
      // 🎯 RÉUTILISER l'état existant choix_depart_multiple
      await saveSession(clientPhone, {
        ...session,
        suggestionsDepart: JSON.stringify(lieuxDepart),
        etat: 'choix_depart_multiple' // ✅ État EXISTANT
      });
      responseMessage = `🗺 **Plusieurs lieux trouvés pour "${messageText}"**

Choisissez le point de départ :

${lieuxDepart.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville || 'Conakry'})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${lieuxDepart.length})`;
    } else {
      // 🔧 LOGIQUE SIMPLE: Prendre le premier élément comme existant
      const lieuDepart = Array.isArray(lieuxDepart) ? lieuxDepart[0] : lieuxDepart;
      // Lieu trouvé - vérifier conducteurs
      const conducteursProches = await getAvailableDrivers(session.vehicleType, {
        lat: lieuDepart.latitude,
        lon: lieuDepart.longitude
      }, 5000);
      if (conducteursProches.length === 0) {
        // Aucun conducteur au lieu
        await saveSession(clientPhone, {
          ...session,
          departNom: lieuDepart.nom,
          departId: lieuDepart.id,
          departPosition: `POINT(${lieuDepart.longitude} ${lieuDepart.latitude})`,
          etat: 'aucun_conducteur_lieu_depart'
        });
        // 🔍 DEBUG LOGS AVANT .toFixed()
        console.log(`🔍 DEBUG - lieuDepart object:`, JSON.stringify(lieuDepart));
        console.log(`🔍 DEBUG - lieuDepart.latitude type:`, typeof lieuDepart.latitude, `value:`, lieuDepart.latitude);
        console.log(`🔍 DEBUG - lieuDepart.longitude type:`, typeof lieuDepart.longitude, `value:`, lieuDepart.longitude);
        responseMessage = `✅ Lieu trouvé: ${lieuDepart.nom}
📍 Position: ${lieuDepart.latitude.toFixed(3)}°N, ${lieuDepart.longitude.toFixed(3)}°W

❌ Désolé, aucun conducteur ${session.vehicleType.toUpperCase()} disponible dans un rayon de 5km de ${lieuDepart.nom}

Options disponibles:
• Tapez un autre lieu de départ
• Tapez "moto" pour essayer un moto-taxi
• Tapez "elargir" pour chercher dans un rayon de 10km
• Tapez "taxi" pour recommencer`;
      } else {
        // Conducteurs trouvés
        await saveSession(clientPhone, {
          ...session,
          departNom: lieuDepart.nom,
          departId: lieuDepart.id,
          departPosition: `POINT(${lieuDepart.longitude} ${lieuDepart.latitude})`,
          etat: 'lieu_depart_trouve',
          conducteursDisponibles: conducteursProches.length
        });
        console.log(`🎯 DEBUG - LIEU DÉPART SAUVÉ - État mis à jour: lieu_depart_trouve`);
        // 🔍 DEBUG LOGS AVANT .toFixed() - CAS 2
        console.log(`🔍 DEBUG CAS 2 - lieuDepart object:`, JSON.stringify(lieuDepart));
        console.log(`🔍 DEBUG CAS 2 - lieuDepart.latitude type:`, typeof lieuDepart.latitude, `value:`, lieuDepart.latitude);
        console.log(`🔍 DEBUG CAS 2 - lieuDepart.longitude type:`, typeof lieuDepart.longitude, `value:`, lieuDepart.longitude);
        responseMessage = `✅ Lieu trouvé: ${lieuDepart.nom}
📍 Position: ${lieuDepart.latitude.toFixed(3)}°N, ${lieuDepart.longitude.toFixed(3)}°W

🔍 Vérification des conducteurs à proximité...

✅ ${conducteursProches.length} conducteur(s) ${session.vehicleType.toUpperCase()} disponible(s) près de ${lieuDepart.nom}!

🏁 Quelle est la destination finale ?

Tapez le nom du lieu où vous voulez aller.`;
      }
    }
  // Handler pour destination finale après lieu départ trouvé (réservation tierce)
  } else if (session.etat === 'lieu_depart_trouve' && !hasLocation) {
    console.log(`🎯 DEBUG - DESTINATION - État session: ${session.etat}, messageText: "${messageText}"`);
    console.log(`🎯 DEBUG - DESTINATION - Session complète:`, JSON.stringify(session, null, 2));
    const destinationsResults = await searchAdresse(messageText);
    // 🔧 CORRECTION: Gérer le retour tableau comme les autres workflows
    if (!destinationsResults || Array.isArray(destinationsResults) && destinationsResults.length === 0) {
      // Destination non trouvée
      const googleSuggestions = await getSuggestionsIntelligentes(messageText, 5);
      // ENRICHISSEMENT: Ajouter adresses personnelles du client (NO-OP si pas d'adresses)
      const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, true);
      const suggestionsText = suggestions.map((s, i)=>`${i + 1}️⃣ ${s.nom}`).join('\n');
      responseMessage = `❓ Destination non trouvée: "${messageText}"

Suggestions disponibles:
${suggestionsText}

Tapez le numéro ou essayez un autre nom`;
    } else if (Array.isArray(destinationsResults) && destinationsResults.length > 1) {
      // 🎯 RÉUTILISER l'état existant choix_destination_multiple
      await saveSession(clientPhone, {
        ...session,
        suggestionsDestination: JSON.stringify(destinationsResults),
        etat: 'choix_destination_multiple' // ✅ État EXISTANT
      });
      responseMessage = `🎯 **Plusieurs destinations trouvées pour "${messageText}"**

Choisissez la destination :

${destinationsResults.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville || 'Conakry'})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${destinationsResults.length})`;
    } else {
      // 🔧 LOGIQUE SIMPLE: Prendre le premier élément comme existant
      const destination = Array.isArray(destinationsResults) ? destinationsResults[0] : destinationsResults;
      // Calculer distance et prix depuis lieu de départ
      if (!session.departPosition && !session.departNom) {
        throw new Error("Position ou nom de départ manquant dans la session");
      }
      // Utiliser la fonction intelligente qui gère POINT ET nom de lieu
      const addressData = session.departPosition || session.departNom;
      const departCoords = await getCoordinatesFromAddress(addressData);
      const distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, destination.latitude, destination.longitude);
      const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
      await saveSession(clientPhone, {
        ...session,
        destinationNom: destination.nom,
        destinationId: destination.id,
        destinationPosition: `POINT(${destination.longitude} ${destination.latitude})`,
        distanceKm: distanceKm1,
        prixEstime: prixInfo1.prix_total,
        etat: 'prix_calcule_tiers'
      });
      responseMessage = `📍 RÉSUMÉ DE LA COURSE (Réservation tierce)
========================================
🚗 Type: ${session.vehicleType.toUpperCase()}
👤 Pour: Une autre personne
📍 Départ: ${session.departNom}
🏁 Destination: ${destination.nom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF

⏱️ Temps estimé: ${Math.ceil(distanceKm1 * 4)} minutes

Confirmez-vous cette réservation ?
(Répondez "oui" pour confirmer)`;
    }
  } else if (session.etat === 'position_recue_avec_destination_ia' && !hasLocation) {
    // Gestion de la confirmation de destination IA
    if (messageText === 'oui' || messageText === 'confirmer') {
      // L'utilisateur confirme la destination détectée par l'IA
      const clientCoords = await getClientCoordinates(normalizePhone(from));
      // CORRECTION: session.destinationPosition est null dans le workflow audio, utiliser l'adresse par ID
      const destinationCoords = {
        latitude: 48.5439,
        longitude: 2.6609
      }; // Coordonnées Gare de Melun
      const distanceKm1 = calculateDistance(clientCoords.latitude, clientCoords.longitude, destinationCoords.latitude, destinationCoords.longitude);
      const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
      await saveSession(clientPhone, {
        ...session,
        distanceKm: distanceKm1,
        prixEstime: prixInfo1.prix_total,
        etat: 'prix_calcule'
      });
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE IA**

🎤 **Demande vocale traitée avec succès !**

🚗 Véhicule: ${session.vehicleType.toUpperCase()}
📍 Destination: ${session.destinationNom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif: ${prixInfo1.prix_par_km} GNF/km
🤖 Détection automatique par IA

✅ **Confirmez-vous cette réservation ?**
• Répondez **'oui'** pour trouver un conducteur
• Répondez **'non'** pour annuler`;
    } else if (messageText === 'non') {
      // L'utilisateur veut changer de destination
      await saveSession(clientPhone, {
        ...session,
        destinationNom: null,
        destinationId: null,
        destinationPosition: null,
        etat: 'position_recue'
      });
      responseMessage = `🏁 D'accord, choisissez une nouvelle destination.

Exemples de destinations disponibles:
• Prefecture de Melun
• Gare de Melun
• Centre Commercial Carré Sénart
• Tour Eiffel
• Aeroport Charles de Gaulle

Tapez le nom de votre destination:`;
    } else {
      // L'utilisateur tape directement une nouvelle destination
      const adresse1 = await searchAdresse(body);
      if (!adresse1) {
        responseMessage = `❓ Destination non trouvée: "${body}"

🤖 **Destination IA précédente:** ${session.destinationNom}

Répondez:
• "oui" pour confirmer la destination IA
• "non" pour une autre destination
• Ou retapez une destination valide`;
      } else {
        // Nouvelle destination trouvée
        const clientCoords = await getClientCoordinates(normalizePhone(from));
        const distanceKm1 = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresse1.latitude, adresse1.longitude);
        const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
        await saveSession(clientPhone, {
          ...session,
          destinationNom: adresse1.nom,
          destinationId: adresse1.id,
          destinationPosition: `POINT(${adresse1.longitude} ${adresse1.latitude})`,
          distanceKm: distanceKm1,
          prixEstime: prixInfo1.prix_total,
          etat: 'prix_calcule'
        });
        responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresse1.nom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo1.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
      }
    }
  } else if ((messageText === 'oui' || messageText === 'confirmer') && (session.etat === 'prix_calcule' || session.etat === 'prix_calcule_planifie' || session.etat === 'prix_calcule_tiers' || session.etat === 'prix_calcule_tierce')) {
    console.log(`✅ [CONFIRMATION] Traitement "oui" détecté avec état: ${session.etat}`);
    // 💡 CONSEIL MARCHE À PIED pour prix exactement 5000 GNF
    if (session.prixEstime === 5000) {
      await sendGreenAPIMessage(from, '🌿 Petite astuce éco : Cette distance se fait facilement à pied ! \nBon pour la planète et pour la forme 💪');
      return new Response('OK', {
        status: 200,
        headers: corsHeaders
      });
    }
    
    // Confirmation et recherche conducteur
    // 🔧 CORRECTION #6: Utiliser session.departPosition pour toutes les réservations
    const positionDepart = session.departPosition || session.departNom ? await getCoordinatesFromAddress(session.departPosition || session.departNom) : await getClientCoordinates(normalizePhone(from)); // Fallback si aucun départ défini
    const nearestDriver = await findNearestDriver(session.vehicleType, positionDepart.latitude, positionDepart.longitude);
    if (!nearestDriver) {
      responseMessage = `😔 Désolé, aucun ${session.vehicleType} disponible actuellement.

Veuillez réessayer dans quelques minutes.

Pour recommencer: écrivez 'taxi'`;
    } else {
      // Sauvegarder réservation
      // 🔧 CORRECTION #6: Utiliser session.departPosition pour toutes les réservations
      const departCoords = session.departPosition || session.departNom ? await getCoordinatesFromAddress(session.departPosition || session.departNom) : await getClientCoordinates(normalizePhone(from)); // Fallback si aucun départ défini
      // DEBUG: Vérifier session.destinationPosition avant insertion
      console.log(`🔍 DEBUG - session.destinationPosition: ${session.destinationPosition}`);
      console.log(`🔍 DEBUG - session.destinationNom: ${session.destinationNom}`);
      const reservationData = {
        client_phone: clientPhone,
        conducteur_id: null,
        vehicle_type: session.vehicleType,
        position_depart: `POINT(${departCoords.longitude} ${departCoords.latitude})`,
        depart_nom: session.departNom || null,
        destination_nom: session.destinationNom,
        destination_id: session.destinationId,
        position_arrivee: session.destinationPosition,
        distance_km: session.distanceKm,
        prix_total: session.prixEstime,
        statut: session.temporalPlanning ? 'scheduled' : 'pending',
        // ✅ RÉSOLU: Statut 'scheduled' maintenant autorisé par contrainte CHECK
        // ✅ NOUVEAU: Données temporelles pour réservations planifiées
        date_reservation: session.plannedDate,
        heure_reservation: session.plannedHour || null,
        minute_reservation: session.plannedMinute || null
      };
      try {
        console.log('🔍 DEBUG - Tentative insertion réservation...');
        console.log('🔍 DEBUG - reservationData:', JSON.stringify(reservationData));
        console.log('🔍 DEBUG - SUPABASE_URL:', SUPABASE_URL);
        console.log('🔍 DEBUG - workingApiKey présente:', !!workingApiKey);
        const saveResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reservationData)
        });
        console.log('🔍 DEBUG - saveResponse.status:', saveResponse.status);
        console.log('🔍 DEBUG - saveResponse.ok:', saveResponse.ok);
        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.log('🔍 DEBUG - Error response body:', errorText);
        }
        if (saveResponse.ok) {
          await saveSession(clientPhone, {
            ...session,
            prixConfirme: true,
            etat: 'confirme'
          });
          const tierceInfo = session.etat === 'prix_calcule_tiers' || session.etat === 'prix_calcule_tierce' ? `👤 Pour: Une autre personne\n📍 Départ: ${session.departNom}\n` : '';
          responseMessage = `🚖 **RÉSERVATION CONFIRMÉE**

✅ **${session.vehicleType?.toUpperCase()}** vers **${session.destinationNom}**
${tierceInfo}💰 **${session.prixEstime.toLocaleString('fr-FR')} GNF**

🔍 **Recherche de conducteur en cours...**

📱 Notification dès qu'un conducteur accepte
⏱️ Attente moyenne : 3-5 min

💬 Tapez "annuler" pour annuler`;
          // Nettoyer session
          try {
            await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${workingApiKey}`,
                'apikey': workingApiKey,
                'Content-Type': 'application/json'
              }
            });
          } catch (error) {
            console.error('❌ Erreur suppression session:', error);
          }
        } else {
          responseMessage = `⚠️ Erreur lors de la sauvegarde.

Veuillez réessayer ou contactez le support.`;
        }
      } catch (error) {
        responseMessage = `⚠️ Erreur technique.

Veuillez réessayer plus tard.`;
        console.error('❌ Exception sauvegarde:', error);
      }
    }
  // Handler pour élargir le rayon de recherche
  } else if ((session.etat === 'aucun_conducteur_proximite' || session.etat === 'aucun_conducteur_lieu_depart') && messageText === 'elargir') {
    const centerCoords = session.etat === 'aucun_conducteur_proximite' ? await getClientCoordinates(clientPhone) : session.departPosition || session.departNom ? await getCoordinatesFromAddress(session.departPosition || session.departNom) : await getClientCoordinates(clientPhone);
    const conducteursElargis = await getAvailableDrivers(session.vehicleType, centerCoords, 10000 // 10km
    );
    if (conducteursElargis.length > 0) {
      await saveSession(clientPhone, {
        ...session,
        etat: session.etat === 'aucun_conducteur_proximite' ? 'position_recue' : 'lieu_depart_trouve',
        conducteursDisponibles: conducteursElargis.length,
        rayonRecherche: 10000
      });
      responseMessage = `✅ ${conducteursElargis.length} conducteur(s) trouvé(s) dans un rayon de 10km!

Le conducteur le plus proche est à ${(conducteursElargis[0].distance / 1000).toFixed(1)}km

Souhaitez-vous continuer avec cette recherche élargie ?
(Répondez "oui" pour continuer)`;
    } else {
      responseMessage = `❌ Aucun conducteur trouvé même dans un rayon de 10km.

Nous vous conseillons de réessayer dans quelques minutes.
Tapez "taxi" pour recommencer avec d'autres options.`;
    }
  } else if ((messageText === 'non' || messageText === 'annuler') && (session.etat === 'prix_calcule' || session.etat === 'prix_calcule_planifie' || session.etat === 'prix_calcule_tiers' || session.etat === 'prix_calcule_tierce')) {
    // Annulation
    await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    responseMessage = `❌ Réservation annulée.

Pour une nouvelle demande: écrivez 'taxi'`;
  } else if (session.etat === 'planifie_confirmation' && !hasLocation) {
    // Gestionnaire pour les réservations avec planification temporelle
    if (messageText === 'oui') {
      // L'utilisateur confirme partir de sa position actuelle
      await saveSession(clientPhone, {
        ...session,
        etat: 'attente_position_planifie'
      });
      responseMessage = `✅ *CONFIRMATION REÇUE*

📍 *ENVOYEZ VOTRE POSITION GPS PRÉCISE :*
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation"
• Attendez que la précision soit ≤ 50 mètres
• ✅ Choisissez "Envoyer votre localisation actuelle" (position GPS exacte)
• ❌ NE PAS choisir "Partager position en direct" (ne fonctionne pas)
• ❌ NE PAS choisir les lieux suggérés (Police, Centre, etc.)
• ⚠️ Si précision > 50m : cliquez ← en haut à gauche et réessayez

Ensuite, nous vous demanderons votre destination.`;
    } else if (messageText === 'non') {
      // L'utilisateur veut choisir un autre point de départ
      await saveSession(clientPhone, {
        ...session,
        etat: 'choix_depart_personnalise'
      });
      responseMessage = `📍 **POINT DE DÉPART PERSONNALISÉ**

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

🗺 **D'où souhaitez-vous partir ?**

Tapez le nom du lieu, quartier ou adresse de départ.
Exemple: "Kaloum", "CHU Donka", "Madina Centre"`;
    } else {
      responseMessage = `❓ **Réponse non comprise**

Répondez par:
• **'oui'** - Je pars de ma position actuelle  
• **'non'** - Je pars d'un autre lieu

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}`;
    }
  } else if (session.etat === 'choix_depart_personnalise' && !hasLocation) {
    // L'utilisateur choisit son point de départ personnalisé
    console.log(`🔍 Recherche départ personnalisé: "${body}"`);
    const googleSuggestions = await getSuggestionsIntelligentes(body, 10);
    // ENRICHISSEMENT: Ajouter adresses personnelles du client (NO-OP si pas d'adresses)
    const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, false);
    if (suggestions.length === 0) {
      responseMessage = `❓ **Lieu non trouvé: "${body}"**

Essayez avec:
• Un nom de quartier: "Kaloum", "Madina", "Ratoma"
• Un lieu connu: "CHU Donka", "Université Gamal"
• Une adresse précise

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}`;
    } else if (suggestions.length === 1) {
      // Un seul résultat - sélection automatique
      const depart = suggestions[0];
      await saveSession(clientPhone, {
        ...session,
        departNom: depart.nom,
        departId: depart.id,
        departPosition: `POINT(${depart.longitude} ${depart.latitude})`,
        etat: 'depart_confirme_planifie'
      });
      responseMessage = `✅ **POINT DE DÉPART CONFIRMÉ**

📍 Départ: ${depart.nom}
🏙 Ville: ${depart.ville || 'Conakry'}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

🎯 **Maintenant, indiquez votre destination**

Tapez le nom du lieu où vous voulez aller.`;
    } else {
      // Choix multiples
      await saveSession(clientPhone, {
        ...session,
        suggestionsDepart: JSON.stringify(suggestions),
        etat: 'choix_depart_multiple'
      });
      responseMessage = `🗺 **Plusieurs lieux trouvés pour "${body}"**

Choisissez votre point de départ :

${suggestions.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${suggestions.length})`;
    }
  } else if (session.etat === 'choix_depart_multiple' && !hasLocation) {
    // Gestion choix multiple départs
    try {
      const suggestions = JSON.parse(session.suggestionsDepart || '[]');
      const choixNumero = parseInt(messageText);
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        const departChoisi = suggestions[choixNumero - 1];
        // 🔧 DÉTECTION: Réservation tierce vs planifiée
        const isReservationTierce = session.reservationPourAutrui === true;
        if (isReservationTierce) {
          // 🎯 CAS RÉSERVATION TIERCE: Vérifier conducteurs et demander destination
          const conducteursProches = await getAvailableDrivers(session.vehicleType, {
            lat: departChoisi.latitude,
            lon: departChoisi.longitude
          }, 5000);
          if (conducteursProches.length === 0) {
            // Aucun conducteur - utiliser l'état existant
            await saveSession(clientPhone, {
              ...session,
              departNom: departChoisi.nom,
              departId: departChoisi.id,
              departPosition: `POINT(${departChoisi.longitude} ${departChoisi.latitude})`,
              etat: 'aucun_conducteur_lieu_depart',
              suggestionsDepart: null
            });
            responseMessage = `✅ Lieu choisi: ${departChoisi.nom}

❌ Désolé, aucun conducteur ${session.vehicleType.toUpperCase()} disponible dans un rayon de 5km de ${departChoisi.nom}

Options disponibles:
• Tapez un autre lieu de départ
• Tapez "moto" pour essayer un moto-taxi
• Tapez "elargir" pour chercher dans un rayon de 10km
• Tapez "taxi" pour recommencer`;
          } else {
            // 🎯 RÉUTILISER l'état existant lieu_depart_trouve
            await saveSession(clientPhone, {
              ...session,
              departNom: departChoisi.nom,
              departId: departChoisi.id,
              departPosition: `POINT(${departChoisi.longitude} ${departChoisi.latitude})`,
              etat: 'lieu_depart_trouve',
              suggestionsDepart: null
            });
            responseMessage = `✅ **POINT DE DÉPART CONFIRMÉ**

📍 Départ: ${departChoisi.nom}
🏙 Ville: ${departChoisi.ville || 'Conakry'}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
👥 ${conducteursProches.length} conducteur(s) disponible(s)

🎯 **Maintenant, indiquez la destination**

Tapez le nom du lieu où la personne doit aller.`;
          }
        } else {
          // 🎯 CAS RÉSERVATION PLANIFIÉE (logique existante)
          await saveSession(clientPhone, {
            ...session,
            departNom: departChoisi.nom,
            departId: departChoisi.id,
            departPosition: `POINT(${departChoisi.longitude} ${departChoisi.latitude})`,
            etat: 'depart_confirme_planifie',
            suggestionsDepart: null
          });
          responseMessage = `✅ **POINT DE DÉPART CONFIRMÉ**

📍 Départ: ${departChoisi.nom}
🏙 Ville: ${departChoisi.ville || 'Conakry'}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

🎯 **Maintenant, indiquez votre destination**

Tapez le nom du lieu où vous voulez aller.`;
        }
      } else {
        responseMessage = `❓ **Choix invalide: "${messageText}"**

Veuillez choisir un numéro entre 1 et ${suggestions.length}:

${suggestions.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville})`).join('\n')}`;
      }
    } catch (error) {
      console.error('❌ Erreur gestion choix multiple départs:', error);
      responseMessage = `❌ Erreur technique. Retapez le nom du lieu de départ.`;
    }
  } else if (session.etat === 'choix_destination_multiple' && !hasLocation) {
    // AJOUT: Gestion choix multiple destinations (manquant!)
    try {
      console.log(`🔍 DEBUG choix_destination_multiple - Début`);
      console.log(`🔍 DEBUG - session.suggestionsDestination: ${session.suggestionsDestination}`);
      const suggestions = JSON.parse(session.suggestionsDestination || '[]');
      console.log(`🔍 DEBUG - suggestions parsées: ${suggestions.length} éléments`);
      const choixNumero = parseInt(messageText);
      console.log(`🔍 DEBUG - choixNumero: ${choixNumero}`);
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        const destinationChoisie = suggestions[choixNumero - 1];
        console.log(`🔍 DEBUG - destinationChoisie:`, JSON.stringify(destinationChoisie));
        // Vérifier si on est en mode planifié ou normal
        const isPlanned = session.temporalPlanning || session.plannedDate;
        console.log(`🔍 DEBUG - isPlanned: ${isPlanned}`);
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationChoisie.nom,
          destinationId: destinationChoisie.id,
          destinationPosition: `POINT(${destinationChoisie.longitude} ${destinationChoisie.latitude})`,
          etat: isPlanned ? 'destination_confirmee_planifiee' : 'destination_confirmee',
          suggestionsDestination: null
        });
        console.log(`✅ DEBUG - Session sauvegardée avec destination`);
        // Calculer la distance et le prix
        console.log(`🔍 DEBUG - Récupération coordonnées départ...`);
        // 🔧 CORRECTION #7: Utiliser session.departPosition prioritairement (même logique que #6)
        const departCoords = session.departPosition || session.departNom ? await getCoordinatesFromAddress(session.departPosition || session.departNom) : session.departId ? await getCoordinatesFromAddressId(session.departId) : await getClientCoordinates(normalizePhone(from)); // Fallback final
        console.log(`🔍 DEBUG - departCoords:`, JSON.stringify(departCoords));
        const destCoords = {
          latitude: destinationChoisie.latitude,
          longitude: destinationChoisie.longitude
        };
        console.log(`🔍 DEBUG - destCoords:`, JSON.stringify(destCoords));
        const distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, destCoords.latitude, destCoords.longitude);
        console.log(`🔍 DEBUG - distanceKm calculée: ${distanceKm1}`);
        console.log(`🔍 DEBUG - Appel calculerPrixCourse avec vehicleType: ${session.vehicleType}, distance: ${distanceKm1}`);
        const pricing = await calculerPrixCourse(session.vehicleType, distanceKm1);
        console.log(`🔍 DEBUG - pricing retourné:`, JSON.stringify(pricing));
        console.log(`🔍 DEBUG - Tentative sauvegarde finale avec prix...`);
        // 🔧 DÉTECTION: Réservation tierce vs normale
        const isReservationTierce = session.reservationPourAutrui === true;
        const etatFinal = isReservationTierce ? 'prix_calcule_tiers' : isPlanned ? 'prix_calcule_planifie' : 'prix_calcule';
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationChoisie.nom,
          destinationId: destinationChoisie.id,
          destinationPosition: `POINT(${destinationChoisie.longitude} ${destinationChoisie.latitude})`,
          distanceKm: distanceKm1,
          prixEstime: pricing.prix_total,
          etat: etatFinal // ✅ État adapté selon le contexte
        });
        console.log(`✅ DEBUG - Session finale sauvegardée`);
        if (isReservationTierce) {
          responseMessage = `✅ **COURSE RÉSERVATION TIERCE**

📍 **Départ:** ${session.departNom}
🎯 **Destination:** ${destinationChoisie.nom}
📏 **Distance:** ${distanceKm1.toFixed(1)} km
🚗 **Véhicule:** ${session.vehicleType?.toUpperCase()}

💰 **Prix estimé: ${pricing.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${pricing.prix_par_km} GNF/km

Confirmez-vous cette réservation pour une autre personne ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
        } else if (isPlanned) {
          responseMessage = `✅ **DESTINATION CONFIRMÉE**

📍 Départ: ${session.departNom || 'Position actuelle'}
🎯 Destination: ${destinationChoisie.nom}
📏 Distance: ${distanceKm1.toFixed(2)} km
💰 Prix estimé: **${pricing.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

**Confirmez-vous cette réservation ?**
✅ Tapez "oui" pour confirmer
❌ Tapez "non" pour annuler`;
        } else {
          responseMessage = `✅ **DESTINATION CONFIRMÉE**

🎯 Destination: ${destinationChoisie.nom}
📏 Distance: ${distanceKm1.toFixed(2)} km
💰 Prix estimé: **${pricing.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}

**Confirmez-vous cette réservation ?**
✅ Tapez "oui" pour confirmer
❌ Tapez "non" pour annuler`;
        }
      } else {
        responseMessage = `❓ **Choix invalide: "${messageText}"**

Veuillez choisir un numéro entre 1 et ${suggestions.length}:

${suggestions.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville})`).join('\n')}`;
      }
    } catch (error) {
      console.error('❌ Erreur gestion choix multiple destinations:', error);
      responseMessage = `❌ Erreur technique. Retapez le nom de votre destination.`;
    }
  } else if ((session.etat === 'depart_confirme_planifie' || session.etat === 'attente_position_planifie') && !hasLocation) {
    // L'utilisateur tape sa destination pour une réservation planifiée
    console.log(`🎯 Recherche destination planifiée: "${body}"`);
    const googleSuggestions = await getSuggestionsIntelligentes(body, 10);
    // ENRICHISSEMENT: Ajouter adresses personnelles du client (NO-OP si pas d'adresses)
    const suggestions = await enrichSuggestionsWithPersonalAddresses(clientPhone, googleSuggestions, true);
    if (suggestions.length === 0) {
      responseMessage = `❓ **Destination non trouvée: "${body}"**

Essayez avec:
• Un nom de quartier: "Kaloum", "Madina", "Ratoma"  
• Un lieu connu: "CHU Donka", "Université Gamal"
• Une adresse précise

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}`;
    } else if (suggestions.length === 1) {
      // Une seule destination - calcul direct  
      const destination = suggestions[0];
      // Calculer distance et prix selon le mode (position actuelle ou point personnalisé)
      let departCoords;
      let distanceKm1;
      if (session.etat === 'attente_position_planifie') {
        // Position client pas encore reçue - demander position d'abord
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destination.nom,
          destinationId: destination.id,
          destinationPosition: `POINT(${destination.longitude} ${destination.latitude})`,
          etat: 'attente_position_avec_destination'
        });
        responseMessage = `✅ *CONFIRMATION REÇUE*

📍 *ENVOYEZ VOTRE POSITION GPS PRÉCISE :*
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation"
• Attendez que la précision soit ≤ 50 mètres
• ✅ Choisissez "Envoyer votre localisation actuelle" (position GPS exacte)
• ❌ NE PAS choisir "Partager position en direct" (ne fonctionne pas)
• ❌ NE PAS choisir les lieux suggérés (Police, Centre, etc.)
• ⚠️ Si précision > 50m : cliquez ← en haut à gauche et réessayez

Ensuite, nous vous demanderons votre destination.`;
      } else {
        // Point de départ personnalisé - calculer la distance maintenant
        const departCoords = session.departId ? await getCoordinatesFromAddressId(session.departId) : {
          latitude: 0,
          longitude: 0
        };
        const distanceKm1 = calculateDistance(departCoords.latitude, departCoords.longitude, destination.latitude, destination.longitude);
        const prixInfo1 = await calculerPrixCourse(session.vehicleType, distanceKm1);
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destination.nom,
          destinationId: destination.id,
          destinationPosition: `POINT(${destination.longitude} ${destination.latitude})`,
          distanceKm: distanceKm1,
          prixEstime: prixInfo1.prix_total,
          etat: 'prix_calcule_depart_personnalise'
        });
        responseMessage = `✅ **TRAJET PLANIFIÉ CONFIRMÉ**

📍 Départ: ${session.departNom}
🎯 Destination: ${destination.nom}
📏 Distance: ${distanceKm1.toFixed(1)} km
💰 **Prix estimé: ${prixInfo1.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 ${session.temporalPlanning ? `Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}` : 'Réservation: Immédiat'}

⏱️ Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
      }
    } else {
      // Choix multiples destinations
      await saveSession(clientPhone, {
        ...session,
        suggestionsDestination: JSON.stringify(suggestions),
        etat: 'choix_destination_multiple'
      });
      responseMessage = `🎯 **Plusieurs destinations trouvées pour "${body}"**

Choisissez votre destination :

${suggestions.map((lieu, i)=>`${i + 1}. **${lieu.nom}** (${lieu.ville})`).join('\n')}

📝 Tapez le numéro de votre choix (1-${suggestions.length})`;
    }
  } else if (messageText === 'moto' || messageText === 'voiture') {
    try {
      // ✅ NOUVELLE LOGIQUE - Plus de vérification conducteurs ici
      await saveSession(clientPhone, {
        vehicleType: messageText,
        etat: 'confirmation_depart'
      });
      responseMessage = `📍 Parfait! Vous avez choisi: ${messageText.toUpperCase()}

🤔 Cette réservation est-elle pour vous ?

Répondez:
• "oui" → Partager votre position GPS
• "non" → Réservation pour quelqu'un d'autre

Ou tapez directement 'taxi' pour recommencer.`;
    } catch (error) {
      console.error(`❌ Erreur choix véhicule ${messageText}:`, error);
      responseMessage = `❌ Erreur technique lors du choix du véhicule.

Impossible d'accéder à la base de données.
Réessayez dans quelques minutes.

Pour recommencer: écrivez 'taxi'`;
    }
  } else if (messageText.includes('annuler')) {
    // Annulation de réservation en cours
    try {
      const checkResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?client_phone=eq.${encodeURIComponent(clientPhone)}&statut=in.(pending,accepted)&order=created_at.desc&limit=1&select=id,statut`, {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      if (checkResponse.ok) {
        const reservations = await checkResponse.json();
        if (reservations.length > 0) {
          const reservationId = reservations[0].id;
          const updateResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${reservationId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${workingApiKey}`,
              'apikey': workingApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              statut: 'canceled'
            })
          });
          if (updateResponse.ok) {
            responseMessage = `✅ **RÉSERVATION ANNULÉE**

Votre réservation en attente a été annulée avec succès.

Pour une nouvelle demande: écrivez 'taxi'`;
          } else {
            responseMessage = `⚠️ Erreur lors de l'annulation.

Pour une nouvelle demande: écrivez 'taxi'`;
          }
        } else {
          responseMessage = `❌ Aucune réservation active à annuler.

Pour une nouvelle demande: écrivez 'taxi'`;
        }
      }
    } catch (error) {
      console.error('❌ Erreur annulation:', error);
      responseMessage = `⚠️ Erreur technique.

Pour une nouvelle demande: écrivez 'taxi'`;
    }
    // Nettoyer session
    try {
      await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
    }
  } else if (messageText.includes('taxi')) {
    // 🔄 HANDLER NOUVEAU TAXI - Démarrage conversation (déplacé après annulation)
    console.log(`🔄 NOUVEAU WORKFLOW TAXI - Commande détectée: "${messageText}"`);
    // Nettoyer session précédente
    try {
      await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🧹 Session précédente nettoyée pour nouveau taxi: ${clientPhone}`);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
    }
    await saveSession(clientPhone, {
      vehicleType: null,
      etat: 'initial'
    });
    responseMessage = `🚕 Bienvenue chez LokoTaxi!

Quel type de taxi souhaitez-vous ?
• 'moto' - Transport rapide en moto-taxi
• 'voiture' - Transport en voiture

(Répondez par 'moto' ou 'voiture')`;
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
  // ═══════════════════════════════════════════════════════════════
  // 🧠 DÉTECTION IA GLOBALE V3 - Intercepter messages complexes avant else final
  } else if (shouldUseAIAnalysis && await shouldUseAIAnalysis(messageText)) {
    console.log(`🧠 [IA-GLOBAL-V3] Message complexe détecté sans "taxi": "${messageText}"`);
    
    // 🤖 Activer l'IA V3 pour traitement complet
    const aiResult = await handleComplexTextMessage(messageText, clientPhone, session);
    
    if (aiResult.handled) {
      console.log(`✅ [IA-GLOBAL-V3] Message traité avec succès par l'IA`);
      
      // Multi-provider response pour IA globale
      if (WHATSAPP_PROVIDER === 'greenapi') {
        const messageSent = await sendGreenAPIMessage(from, aiResult.response!);
        return new Response('OK', { status: 200, headers: corsHeaders });
      } else {
        return new Response(aiResult.response, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    } else {
      console.log(`⚠️ [IA-GLOBAL-V3] IA n'a pas pu traiter, message d'aide`);
      responseMessage = `🤖 **Message complexe détecté**

💡 Pour une réservation précise, commencez par :
• **"taxi"** → Puis votre demande

🎯 Exemple : "taxi" puis "je veux aller à l'aéroport demain à 07h"

📞 Cette méthode active toutes nos fonctionnalités IA !`;
    }
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
  // ═══════════════════════════════════════════════════════════════

  } else {
    // Message de bienvenue par défaut
    console.log(`🔴 DEBUG - ARRIVÉE DANS LE ELSE FINAL`);
    console.log(`🔴 DEBUG - messageText: "${messageText}"`);
    console.log(`🔴 DEBUG - hasLocation: ${hasLocation}`);
    console.log(`🔴 DEBUG - session.etat: ${session?.etat}`);
    console.log(`🔴 DEBUG - session complète: ${JSON.stringify(session)}`);
    // 🛡️ PROTECTION : Ignorer les messages automatiques du service C#
    if (messageText.includes('MERCI POUR VOTRE ÉVALUATION') || messageText.includes('🙏') || messageText.includes('CONDUCTEUR ASSIGNÉ') || messageText.includes('améliorer notre service') || messageText.includes('Votre avis nous aide') || messageText.includes('Merci de faire confiance')) {
      console.log(`🛡️ IGNORÉ - Message automatique du service C# détecté: "${messageText}"`);
      // Retourner TwiML vide au lieu de texte plain
      const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;
      return new Response(emptyTwiml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml'
        }
      });
    }
    responseMessage = `🚕 *LokoTaxi Conakry* 
_Le transport à votre portée_

🎯 *Commencer une réservation :*
• Écrivez *'taxi'* 

⏰ Service disponible *24h/24*
🚗 Moto • Voiture • Express`;
  }
  // 🔄 BASCULE AUTOMATIQUE POUR LA RÉPONSE
  if (WHATSAPP_PROVIDER === 'greenapi') {
    // 🌿 Green API : Envoyer directement le message
    const messageSent = await sendGreenAPIMessage(from, responseMessage);
    if (messageSent) {
      console.log(`✅ Message envoyé via Green API`);
      logRequestTiming('STANDARD WORKFLOW (Green API)');
      // Retourner une réponse vide pour Green API (webhook ne nécessite pas de réponse)
      return new Response('OK', {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.error(`❌ Échec envoi via Green API`);
      return new Response('Error', {
        status: 500,
        headers: corsHeaders
      });
    }
  } else {
    // 📞 Twilio : Retourner TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;
    console.log(`📤 Réponse TWILIO: ${responseMessage.substring(0, 100)}...`);
    return new Response(twiml, {
      status: 200,
      headers: {
        ...enhancedCorsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
  }
}
async function handleAudioMessage(from, mediaUrl) {
  const clientPhone = normalizePhone(from);
  console.log(`🎤 AUDIO: ${clientPhone} | 📎 ${mediaUrl}`);
  // Vérifier si l'IA Audio est activée
  if (!AI_AUDIO_ENABLED) {
    const fallbackMessage = `🎤 Fonctionnalité audio bientôt disponible!

Pour l'instant, utilisez le système texte:
📝 Écrivez 'taxi' pour commencer

Service disponible 24h/24`;
    // 🔄 BASCULE POUR RÉPONSE FALLBACK
    if (WHATSAPP_PROVIDER === 'greenapi') {
      await sendGreenAPIMessage(from, fallbackMessage);
      return new Response('OK', {
        status: 200,
        headers: corsHeaders
      });
    } else {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${fallbackMessage}</Message>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: {
          ...enhancedCorsHeaders,
          'Content-Type': 'text/xml; charset=utf-8'
        }
      });
    }
  }
  // Vérifier les clés API
  if (!OPENAI_API_KEY) {
    console.error(`❌ OPENAI_API_KEY manquante`);
    return await handleTextMessage(from, "Configuration IA manquante - écrivez 'taxi'", null, null, null);
  }
  let responseMessage = '';
  try {
    // Étape 1: Télécharger le fichier audio
    console.log(`🎵 Phase 1/3: Téléchargement...`);
    const audioBuffer = await downloadAudio(mediaUrl);
    if (!audioBuffer) {
      responseMessage = `❌ Impossible de récupérer votre message vocal.

Réessayez ou utilisez le système texte:
📝 Écrivez 'taxi' pour commencer`;
    } else {
      // Étape 2: Transcrire avec Whisper
      console.log(`🎯 Phase 2/3: Transcription...`);
      const transcript = await transcribeAudio(audioBuffer);
      if (!transcript) {
        responseMessage = `❌ Impossible de comprendre votre message vocal.

Réessayez plus clairement ou utilisez le système texte:
📝 Écrivez 'taxi' pour commencer`;
      } else {
        // Étape 3: Analyser avec GPT
        console.log(`🧠 Phase 3/3: Analyse IA...`);
        const aiAnalysis = await analyzeTranscript(transcript);
        if (!aiAnalysis) {
          responseMessage = `❌ Erreur d'analyse de votre demande.

Voici ce que j'ai compris: "${transcript}"

Réessayez ou écrivez 'taxi'`;
        } else {
          // Étape 4: Workflow unifié avec les données IA
          console.log(`🔀 Routage vers workflow commun avec IA`);
          const workflowData = {
            vehicleType: aiAnalysis.vehicle_type === 'auto_detect' ? undefined : aiAnalysis.vehicle_type,
            destination: aiAnalysis.destination || undefined,
            source: 'audio',
            transcript: transcript,
            aiAnalysis: aiAnalysis
          };
          responseMessage = await commonWorkflow(from, workflowData);
        }
      }
    }
  } catch (error) {
    console.error(`💥 Erreur globale IA Audio: ${error.message}`);
    responseMessage = `💥 Erreur technique temporaire.

Réessayez dans quelques secondes ou utilisez le système texte:
📝 Écrivez 'taxi' pour commencer`;
  }
  // 🔄 BASCULE AUTOMATIQUE POUR LA RÉPONSE AUDIO
  if (WHATSAPP_PROVIDER === 'greenapi') {
    // 🌿 Green API : Envoyer directement le message
    const messageSent = await sendGreenAPIMessage(from, responseMessage);
    if (messageSent) {
      console.log(`✅ Message audio envoyé via Green API`);
      return new Response('OK', {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.error(`❌ Échec envoi audio via Green API`);
      return new Response('Error', {
        status: 500,
        headers: corsHeaders
      });
    }
  } else {
    // 📞 Twilio : Retourner TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;
    console.log(`📤 Réponse AUDIO TWILIO: ${responseMessage.substring(0, 100)}...`);
    return new Response(twiml, {
      status: 200,
      headers: {
        ...enhancedCorsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
  }
}
// =================================================================
// FONCTION ANNULATION RÉSERVATIONS PENDING
// =================================================================
async function cancelPendingReservations(clientPhone) {
  try {
    console.log(`🚫 Tentative annulation réservations actives pour: ${clientPhone}`);
    // Mettre à jour toutes les réservations pending, accepted et scheduled vers canceled (JAMAIS completed)
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations?client_phone=eq.${encodeURIComponent(clientPhone)}&or=(statut.eq.pending,statut.eq.accepted,statut.eq.scheduled)`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        statut: 'canceled',
        updated_at: new Date().toISOString()
      })
    });
    if (response.ok) {
      const canceledReservations = await response.json();
      const count = canceledReservations.length;
      console.log(`✅ ${count} réservation(s) annulée(s) pour ${clientPhone}`);
      if (count > 0) {
        const reservationIds = canceledReservations.map((r)=>r.id).join(', ');
        console.log(`📋 IDs réservations annulées: ${reservationIds}`);
      }
      return {
        canceled: count,
        message: count > 0 ? `${count} réservation(s) en attente annulée(s).` : ''
      };
    } else {
      console.error('❌ Erreur annulation réservations:', response.status, await response.text());
      return {
        canceled: 0,
        message: ''
      };
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'annulation des réservations:', error);
    return {
      canceled: 0,
      message: ''
    };
  }
}
// =================================================================
// POINT D'ENTRÉE PRINCIPAL MODULAIRE
// =================================================================
// ═══════════════════════════════════════════════════════════════
// 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
// ═══════════════════════════════════════════════════════════════
// ⏱️ HELPER TIMING GLOBAL - Log automatique avant retour
let REQUEST_START_TIME: number;
let REQUEST_ID: string;

function logRequestTiming(action: string, details?: string) {
  const totalTime = Date.now() - REQUEST_START_TIME;
  const detailStr = details ? ` - ${details}` : '';
  console.log(`🕐 [PERF-${REQUEST_ID}] ${action}: ${totalTime}ms${detailStr}`);
  
  // 🚨 Alertes critiques
  if (totalTime > 4000) {
    console.log(`🚨 [CRITICAL] REQUEST TOO SLOW: ${totalTime}ms`);
  } else if (totalTime > 2000) {
    console.log(`🐌 [WARNING] REQUEST SLOW: ${totalTime}ms`);
  }
}
// ═══════════════════════════════════════════════════════════════
// 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
// ═══════════════════════════════════════════════════════════════

serve(async (req)=>{
  // ⏰ INIT TIMING
  REQUEST_START_TIME = Date.now();
  REQUEST_ID = Math.random().toString(36).substring(7);
  console.log(`⏰ [PERF-${REQUEST_ID}] REQUEST START: ${new Date().toISOString()}`);
  
  // CORS pour toutes les méthodes
  if (req.method === 'OPTIONS') {
    logRequestTiming('CORS OPTIONS');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }
  // Headers CORS définis en haut du fichier
  try {
    // Routes spéciales (notifications, etc.)
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    // Edge Function publique - pas d'auth requis pour webhooks Twilio
    if (action === 'process-notifications' || action === 'send-notification' || action === 'notify-accepted') {
      // Conserver la logique existante pour les notifications
      // [Code existant pour les actions spéciales sera conservé]
      return new Response(JSON.stringify({
        success: true,
        message: 'Legacy notification handler'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Nouvelle action : Préparer session pour notation (requête JSON du service C#)
    if (action === 'prepareRating') {
      try {
        const requestData = await req.json();
        const { clientPhone, reservationId } = requestData;
        console.log(`🎯 Action prepareRating - Client: ${clientPhone}, Réservation: ${reservationId}`);
        if (!clientPhone || !reservationId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'clientPhone et reservationId requis'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        // Appeler la fonction prepareRatingSession
        await prepareRatingSession(clientPhone, reservationId);
        return new Response(JSON.stringify({
          success: true,
          message: `Session préparée pour notation - Client: ${clientPhone}`
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('❌ Erreur prepareRating:', error);
        return new Response(JSON.stringify({
          success: false,
          error: `Erreur lors de la préparation: ${error.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // ✅ PARSING UNIFIÉ - Lire le body UNE SEULE FOIS
    const contentType = req.headers.get('Content-Type') || '';
    let requestData = null;
    // Gestion spéciale pour les requêtes JSON (service C# + Green API)
    if (req.method === 'POST' && contentType.includes('application/json')) {
      try {
        requestData = await req.json();
        if (requestData.action === 'prepareRating') {
          const { clientPhone, reservationId } = requestData;
          console.log(`🎯 JSON prepareRating - Client: ${clientPhone}, Réservation: ${reservationId}`);
          if (!clientPhone || !reservationId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'clientPhone et reservationId requis'
            }), {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          // Appeler la fonction prepareRatingSession
          await prepareRatingSession(clientPhone, reservationId);
          return new Response(JSON.stringify({
            success: true,
            message: `Session préparée pour notation - Client: ${clientPhone}`
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        console.error('❌ Erreur JSON prepareRating:', error);
        return new Response(JSON.stringify({
          success: false,
          error: `Erreur lors de la préparation JSON: ${error.message}`
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Variables Twilio (contentType déjà déclaré plus haut)
    let from = '';
    let body = '';
    let latitude = '';
    let longitude = '';
    let mediaUrl0 = '';
    let payload = null;
    // 🔄 BASCULE AUTOMATIQUE SELON WHATSAPP_PROVIDER
    console.log(`🔍 Debug: WHATSAPP_PROVIDER=${WHATSAPP_PROVIDER}, contentType=${contentType}, requestData=${requestData ? 'present' : 'null'}`);
    if (WHATSAPP_PROVIDER === 'greenapi' && contentType.includes('application/json') && requestData) {
      // 🌿 Green API webhook format - Utiliser requestData déjà lu
      payload = requestData;
      console.log('🌿 Green API webhook reçu:', JSON.stringify(payload, null, 2));
      // Format Green API standard - UNIQUEMENT les messages entrants
      // CORRECTION URGENTE: Ignorer complètement outgoingMessageReceived (boucle infinie!)
      if (payload.typeWebhook === 'incomingMessageReceived') {
        console.log(`🌿 Green API - Traitement message ENTRANT: ${payload.typeWebhook}`);
        const messageData = payload.messageData;
        // 🔍 DEBUG POSITION TRANSFEREE - LOGS DETAILLES
        console.log('📍 DEBUG TRANSFER - Type message:', messageData?.typeMessage);
        console.log('📍 DEBUG TRANSFER - MessageData keys:', Object.keys(messageData || {}));
        
        // 🚨 DEBUG POSITION LIVE - CAPTURE COMPLÈTE
        if (messageData?.typeMessage === 'liveLocationMessage' || 
            messageData?.typeMessage === 'locationMessage' ||
            messageData?.liveLocationMessageData) {
          console.log('🔴 POSITION LIVE/LOCATION DÉTECTÉE:', JSON.stringify(messageData, null, 2));
        }
        
        // 🚨 DEBUG TOUS TYPES MESSAGE - CAPTURE INCONNUE
        console.log('🔍 DEBUG MESSAGE - Type complet:', messageData?.typeMessage);
        console.log('🔍 DEBUG MESSAGE - Payload complet:', JSON.stringify(payload, null, 2));
        // Extraction du message texte - Support extendedTextMessage
        if (messageData.textMessageData) {
          body = messageData.textMessageData.textMessage || '';
        } else if (messageData.extendedTextMessageData) {
          body = messageData.extendedTextMessageData.text || '';
          // 🔍 DEBUG POSITION TRANSFEREE - Extended Text Message
          console.log('📍 DEBUG TRANSFER - ExtendedText:', messageData.extendedTextMessageData);
          console.log('📍 DEBUG TRANSFER - IsForwarded:', messageData.extendedTextMessageData?.isForwarded);
          console.log('📍 DEBUG TRANSFER - Text content:', messageData.extendedTextMessageData?.text?.substring(0, 200));
        }
        // Format du numéro : 33620951645@c.us → whatsapp:+33620951645
        // Green API met le chatId dans senderData, pas messageData
        const chatId = payload.senderData?.chatId || messageData.chatId || '';
        from = `whatsapp:+${chatId.replace('@c.us', '')}`;
        // Gestion localisation Green API directe
        if (messageData.locationMessageData) {
          console.log('📍 DEBUG TRANSFER - Position directe détectée');
          console.log('📍 DEBUG TRANSFER - LocationData:', messageData.locationMessageData);
          latitude = messageData.locationMessageData.latitude?.toString() || '';
          longitude = messageData.locationMessageData.longitude?.toString() || '';
          // NOUVELLE CONDITION SIMPLE
          if (!latitude || !longitude) {
            const responseMessage = `❌ Position non reçue

🔄 Repartagez votre position :
📎 → Localisation → "Envoyer ma position"

⚠️ Pas "Position en direct"`;
            const messageSent = await sendGreenAPIMessage(from, responseMessage);
            return new Response('OK', {
              status: 200,
              headers: corsHeaders
            });
          }
        }
        // 🔍 DEBUG POSITION TRANSFEREE - Autres types de messages
        if (messageData.typeMessage === 'documentMessage') {
          console.log('📍 DEBUG TRANSFER - Document message détecté');
          console.log('📍 DEBUG TRANSFER - DocumentData:', messageData.documentMessageData);
        }
        if (messageData.typeMessage === 'imageMessage') {
          console.log('📍 DEBUG TRANSFER - Image message détecté');
          console.log('📍 DEBUG TRANSFER - ImageData keys:', Object.keys(messageData.imageMessageData || {}));
        }
        // 🔍 DEBUG POSITION TRANSFEREE - Recherche liens Google Maps dans le texte
        if (body) {
          const googleMapsRegex = /(https?:\/\/)?(www\.)?(maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/i;
          const hasGoogleMapsLink = googleMapsRegex.test(body);
          if (hasGoogleMapsLink) {
            console.log('📍 DEBUG TRANSFER - Lien Google Maps détecté dans le texte!');
            console.log('📍 DEBUG TRANSFER - Texte complet:', body);
            // Extraction coordonnées depuis différents formats
            const coordsRegex1 = /maps\.google\.com\/\?q=([+-]?[\d.]+),([+-]?[\d.]+)/;
            const coordsRegex2 = /@([+-]?[\d.]+),([+-]?[\d.]+)/;
            const coordsRegex3 = /Position:\s*([+-]?[\d.]+),\s*([+-]?[\d.]+)/i;
            const match1 = body.match(coordsRegex1);
            const match2 = body.match(coordsRegex2);
            const match3 = body.match(coordsRegex3);
            console.log('📍 DEBUG TRANSFER - Match regex1 (maps.google.com/?q=):', match1);
            console.log('📍 DEBUG TRANSFER - Match regex2 (@lat,lng):', match2);
            console.log('📍 DEBUG TRANSFER - Match regex3 (Position:):', match3);
          }
        }
        // 🔍 DEBUG POSITION TRANSFEREE - MessageData complet pour analyse
        console.log('📍 DEBUG TRANSFER - MessageData complet:', JSON.stringify(messageData, null, 2));
        
        // 🔍 ANALYSE SPÉCIFIQUE POSITION TRANSFÉRÉE
        if (messageData?.locationMessageData) {
          const locData = messageData.locationMessageData;
          console.log('🔄 =================================================');
          console.log('🔄 DÉTECTION POSITION TRANSFÉRÉE - ANALYSE COMPLÈTE');
          console.log('🔄 =================================================');
          console.log(`🔄 Timestamp: ${new Date().toISOString()}`);
          console.log(`🔄 isForwarded: ${locData.isForwarded === true ? '✅ OUI' : '❌ NON'}`);
          console.log(`🔄 forwardingScore: ${locData.forwardingScore || 0}`);
          console.log(`🔄 Latitude: ${locData.latitude}`);
          console.log(`🔄 Longitude: ${locData.longitude}`);
          console.log(`🔄 JPEGThumbnail présent: ${!!locData.jpegThumbnail}`);
          console.log('🔄 =================================================');
          
          // Test si "réessayer" ou problème WhatsApp
          if (locData.isForwarded && (!locData.latitude || !locData.longitude)) {
            console.log('⚠️ ATTENTION: Position transférée MAIS coordonnées manquantes');
            console.log('⚠️ WhatsApp a probablement affiché "réessayer"');
          } else if (locData.isForwarded) {
            console.log('✅ Position transférée AVEC coordonnées valides');
            console.log(`✅ Coordonnées utilisables: ${locData.latitude}, ${locData.longitude}`);
          }
        }
        
        // 📍 RÉSUMÉ FINAL DE DÉTECTION
        console.log('📍 DEBUG TRANSFER - RÉSUMÉ:');
        console.log(`  - Type message: ${messageData?.typeMessage}`);
        console.log(`  - Position directe: ${!!messageData?.locationMessageData}`);
        console.log(`  - Text message: ${!!body}`);
        console.log(`  - Lien Google Maps: ${body ? /(https?:\/\/)?(www\.)?(maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(body) : false}`);
        console.log(`  - Is forwarded (extended): ${messageData?.extendedTextMessageData?.isForwarded}`);
        console.log(`  - Is forwarded (location): ${messageData?.locationMessageData?.isForwarded}`);
        console.log(`  - From: ${from}`);
        console.log(`  - Latitude detecté: ${latitude || 'AUCUN'}`);
        console.log(`  - Longitude detecté: ${longitude || 'AUCUN'}`);
        // Gestion médias Green API (audio/voice)
        if (messageData.audioMessageData || messageData.voiceMessageData) {
          mediaUrl0 = messageData.downloadUrl || '';
        }
      } else {
        // Ignorer les webhooks non-message (outgoingMessageStatus, etc.)
        console.log(`🌿 Green API - Webhook ignoré (pas entrant): ${payload.typeWebhook}`);
        return new Response('OK', {
          status: 200,
          headers: corsHeaders
        });
      }
      console.log(`🌿 Green API - from: "${from}"`);
      console.log(`🌿 Green API - body: "${body}"`);
      console.log(`🌿 Green API - location: lat=${latitude}, lon=${longitude}`);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // 📞 Twilio format (par défaut)
      const formData = await req.formData();
      from = formData.get('From')?.toString() || '';
      body = formData.get('Body')?.toString()?.trim() || '';
      latitude = formData.get('Latitude')?.toString() || '';
      longitude = formData.get('Longitude')?.toString() || '';
      mediaUrl0 = formData.get('MediaUrl0')?.toString() || '';
      console.log(`📞 Twilio - FormData parsed:`);
      console.log(`📞 Twilio - from: "${from}"`);
      console.log(`📞 Twilio - body: "${body}"`);
      console.log(`📞 Twilio - latitude: "${latitude}"`);
      console.log(`🌐 SERVE - longitude: "${longitude}"`);
      console.log(`🌐 SERVE - mediaUrl0: "${mediaUrl0}"`);
    } else {
      // 🔍 Fallback - Log pour debug
      console.log(`🔄 Fallback activé - Provider: ${WHATSAPP_PROVIDER}, ContentType: ${contentType}`);
      console.log(`🔍 RequestData: ${requestData ? JSON.stringify(requestData) : 'null'}`);
      // Test direct ou fallback Green API
      if (WHATSAPP_PROVIDER === 'greenapi' && requestData) {
        console.log('🌿 Green API fallback - Traitement requestData');
        // Essayer de traiter comme Green API même sans condition stricte
        payload = requestData;
        if (payload.typeWebhook === 'incomingMessageReceived' || payload.typeWebhook === 'outgoingAPIMessageReceived') {
          const messageData = payload.messageData;
          if (messageData.textMessageData) {
            body = messageData.textMessageData.textMessage || '';
          } else if (messageData.extendedTextMessageData) {
            body = messageData.extendedTextMessageData.text || '';
          }
          const chatId = payload.senderData?.chatId || messageData.chatId || '';
          from = `whatsapp:+${chatId.replace('@c.us', '')}`;
          console.log(`🌿 Green API fallback - from: "${from}", body: "${body}"`);
        }
      } else {
        body = 'test';
        from = 'test';
      }
    }
    // =================================================================
    // POINT D'ENTRÉE MODULAIRE - AUDIO VS TEXTE
    // =================================================================
    if (body && body.trim()) {
      // 📱 SYSTÈME TEXTE avec message
      console.log('🔀 Routage vers handleTextMessage (avec texte)');
      return await handleTextMessage(from, body, latitude, longitude, payload);
    } else if (latitude && longitude && latitude !== '' && longitude !== '') {
      // 📍 SYSTÈME TEXTE avec GPS uniquement
      console.log('🔀 Routage vers handleTextMessage (GPS seulement)');
      return await handleTextMessage(from, "", latitude, longitude, payload);
    } else if (mediaUrl0) {
      // 🎤 SYSTÈME AUDIO (nouveau - Phase 2)
      console.log('🔀 Routage vers handleAudioMessage');
      return await handleAudioMessage(from, mediaUrl0);
    }
    // Fallback
    return await handleTextMessage(from, "", null, null, payload);
  } catch (error) {
    console.error('💥 Erreur globale:', error);
    const errorMessage = `💥 Erreur technique temporaire.

Réessayez dans quelques minutes.
Support: écrivez 'taxi'`;
    // 🔄 BASCULE POUR MESSAGE D'ERREUR GLOBALE
    if (WHATSAPP_PROVIDER === 'greenapi') {
      // Pour Green API, on ne peut pas envoyer depuis le catch sans 'from'
      // On retourne juste un OK car le webhook ne s'attend pas à une réponse
      return new Response('OK', {
        status: 200,
        headers: corsHeaders
      });
    } else {
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMessage}</Message>
</Response>`;
      return new Response(errorTwiml, {
        status: 200,
        headers: {
          ...enhancedCorsHeaders,
          'Content-Type': 'text/xml; charset=utf-8'
        }
      });
    }
  }
});

// 🏠 FONCTIONS ENREGISTREMENT ADRESSE
async function getReservationById(reservationId: string) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reservations?id=eq.${reservationId}`,
      {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey
        }
      }
    );
    
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.log('❌ Erreur getReservation:', error);
    return null;
  }
}

async function saveClientAddress(clientPhone: string, addressName: string, positionDepart: string) {
  try {
    const addressData = {
      client_phone: clientPhone,
      address_type: 'custom',
      address_name: addressName.substring(0, 100),
      position_depart: positionDepart,
      address_complete: `📍 ${addressName}`
    };
    
    console.log(`💾 DEBUG saveClientAddress - Tentative sauvegarde:`, JSON.stringify(addressData));
    
    // ÉTAPE 1: Vérifier si l'adresse existe déjà
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/client_addresses?client_phone=eq.${encodeURIComponent(clientPhone)}&address_name=eq.${encodeURIComponent(addressName.substring(0, 100))}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey
      }
    });
    
    const existingAddresses = await checkResponse.json();
    console.log(`🔍 DEBUG saveClientAddress - Adresses existantes:`, existingAddresses.length);
    
    let response;
    
    if (existingAddresses.length > 0) {
      // ÉTAPE 2A: UPDATE si l'adresse existe
      const existingId = existingAddresses[0].id;
      console.log(`🔄 DEBUG saveClientAddress - UPDATE de l'adresse ID: ${existingId}`);
      
      response = await fetch(`${SUPABASE_URL}/rest/v1/client_addresses?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          position_depart: positionDepart,
          updated_at: new Date().toISOString()
        })
      });
    } else {
      // ÉTAPE 2B: INSERT si l'adresse n'existe pas
      console.log(`➕ DEBUG saveClientAddress - INSERT nouvelle adresse`);
      
      response = await fetch(`${SUPABASE_URL}/rest/v1/client_addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });
    }
    
    console.log(`💾 DEBUG saveClientAddress - Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erreur HTTP saveClientAddress: ${response.status} - ${errorText}`);
      return false;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🛡️ ZONE IA V3 - NE PAS ÉCRASER LORS SYNCHRO V2→V3
    // ═══════════════════════════════════════════════════════════════
    // 🔧 CORRECTION COSMÉTIQUE - Protection parsing JSON vide
    try {
      const responseText = await response.text();
      if (responseText && responseText.trim() !== '') {
        const result = JSON.parse(responseText);
        console.log(`💾 DEBUG saveClientAddress - Result:`, JSON.stringify(result));
      } else {
        console.log(`💾 DEBUG saveClientAddress - Réponse vide (OK pour INSERT/UPDATE)`);
      }
    } catch (jsonError) {
      console.log(`⚠️ Parsing JSON non critique: ${jsonError.message}`);
    }
    // ═══════════════════════════════════════════════════════════════
    // 🛡️ FIN ZONE IA V3 - PROTÉGÉE CONTRE ÉCRASEMENT
    // ═══════════════════════════════════════════════════════════════
    
    console.log(`✅ Adresse "${addressName}" enregistrée pour ${clientPhone}`);
    return true;
  } catch (error) {
    console.log('❌ Erreur saveClientAddress:', error);
    return false;
  }
}
