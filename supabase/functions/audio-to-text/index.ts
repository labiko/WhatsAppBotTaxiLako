// LokoTaxi Audio-to-Text Pipeline avec Analyse Temporelle IA
// Repository: https://github.com/labiko/WhatsAppBotTaxiLako

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configuration Environment Variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const WHATSAPP_BOT_URL = Deno.env.get('WHATSAPP_BOT_URL') || 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Interface pour l'analyse temporelle
interface TemporalAnalysis {
  destination: string;
  date: 'aujourd_hui' | 'demain' | 'date_specifique';
  time: 'maintenant' | string; // 'HH:MM' ou 'dans_X_minutes'
  ambiguous_destination: boolean;
  confidence: number;
  raw_transcript: string;
}

// Prompt IA pour analyse temporelle
const createTemporalPrompt = (transcript: string): string => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  
  return `
Analysez ce message audio transcrit et extrayez PRÉCISÉMENT :

1. DESTINATION : lieu exact ou catégorie générale
2. DATE : "aujourd_hui", "demain", ou "date_specifique"  
3. HEURE : "maintenant", "HH:MM", ou "dans_X_minutes"
4. AMBIGUITÉ : true si destination nécessite suggestions multiples

RÈGLES TEMPORELLES STRICTES :
- Si heure mentionnée < heure actuelle (${timeString}) : assumer "demain"
- "maintenant" = heure actuelle exacte
- "dans X minutes" = heure actuelle + X minutes  
- "matin" sans heure = 08:00, "soir" = 19:00
- Si pas d'heure mentionnée = "maintenant"

RÈGLES DESTINATIONS :
- Lieux précis : "Madina", "Kipé", "Kaloum" → ambiguous: false
- Catégories : "hôpital", "supermarché", "restaurant" → ambiguous: true
- "aéroport" = lieu précis → ambiguous: false

TRANSCRIPTION AUDIO : "${transcript}"
HEURE ACTUELLE : ${timeString}

RÉPONSE OBLIGATOIRE FORMAT JSON EXACT :
{
  "destination": "lieu_ou_catégorie",
  "date": "aujourd_hui",
  "time": "maintenant",
  "ambiguous_destination": false,
  "confidence": 0.95,
  "raw_transcript": "${transcript}"
}`;
};

// Télécharger fichier audio depuis Twilio
async function downloadAudioFromTwilio(mediaUrl: string): Promise<Blob> {
  console.log(`🔄 Téléchargement audio: ${mediaUrl}`);
  
  const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  const response = await fetch(mediaUrl, {
    headers: {
      'Authorization': authHeader
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur téléchargement audio: ${response.status}`);
  }
  
  return await response.blob();
}

// Transcription Whisper OpenAI
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('🗣️ Transcription Whisper en cours...');
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY manquante');
  }
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr'); // Français prioritaire
  formData.append('response_format', 'text');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur Whisper: ${response.status} - ${error}`);
  }
  
  const transcript = await response.text();
  console.log(`✅ Transcription: "${transcript}"`);
  return transcript.trim();
}

// Analyse temporelle avec GPT-4
async function analyzeTemporalIntent(transcript: string): Promise<TemporalAnalysis> {
  console.log('🧠 Analyse temporelle IA...');
  
  const prompt = createTemporalPrompt(transcript);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: prompt
      }],
      temperature: 0.1, // Précision maximale
      max_tokens: 200
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur GPT-4: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    const analysis = JSON.parse(analysisText) as TemporalAnalysis;
    console.log('✅ Analyse temporelle:', analysis);
    return analysis;
  } catch (parseError) {
    console.error('❌ Erreur parsing JSON:', analysisText);
    // Fallback basique
    return {
      destination: transcript,
      date: 'aujourd_hui',
      time: 'maintenant',
      ambiguous_destination: true,
      confidence: 0.5,
      raw_transcript: transcript
    };
  }
}

// Formater message enrichi pour le bot principal
function formatEnrichedMessage(analysis: TemporalAnalysis): string {
  let message = analysis.destination;
  
  // Ajouter contexte temporel
  if (analysis.date === 'demain') {
    message += ' demain';
  }
  
  if (analysis.time !== 'maintenant') {
    if (analysis.time.includes('dans')) {
      // "dans 20 minutes" → calculer heure exacte
      const match = analysis.time.match(/dans (\d+) minutes?/);
      if (match) {
        const minutes = parseInt(match[1]);
        const futureTime = new Date();
        futureTime.setMinutes(futureTime.getMinutes() + minutes);
        const timeString = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
        message += ` à ${timeString}`;
      }
    } else {
      message += ` à ${analysis.time}`;
    }
  }
  
  // Ajouter metadata pour le bot principal
  const metadata = {
    audio_source: true,
    date: analysis.date,
    time: analysis.time,
    ambiguous: analysis.ambiguous_destination,
    confidence: analysis.confidence
  };
  
  message += ` [META:${JSON.stringify(metadata)}]`;
  
  console.log(`📝 Message enrichi: "${message}"`);
  return message;
}

// Appeler le bot principal WhatsApp
async function callMainWhatsAppBot(from: string, enrichedMessage: string): Promise<string> {
  console.log('📱 Appel bot principal WhatsApp...');
  
  const formData = new FormData();
  formData.append('From', from);
  formData.append('Body', enrichedMessage);
  
  const response = await fetch(WHATSAPP_BOT_URL, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Erreur bot principal: ${response.status}`);
  }
  
  const twimlResponse = await response.text();
  console.log('✅ Réponse bot principal reçue');
  return twimlResponse;
}

// Pipeline complet audio → texte
async function processAudioMessage(request: Request): Promise<Response> {
  console.log('🎤 Début pipeline audio-to-text');
  
  try {
    // Parser le payload Twilio
    const formData = await request.formData();
    const from = formData.get('From')?.toString() || '';
    const mediaUrl = formData.get('MediaUrl0')?.toString();
    
    if (!mediaUrl) {
      console.error('❌ Pas de fichier audio trouvé');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ Aucun fichier audio détecté. Veuillez réessayer.</Message>
</Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }
    
    console.log(`📞 Audio de: ${from}`);
    console.log(`🔗 URL Media: ${mediaUrl}`);
    
    // Étape 1: Télécharger audio
    const audioBlob = await downloadAudioFromTwilio(mediaUrl);
    
    // Étape 2: Transcription Whisper  
    const transcript = await transcribeAudio(audioBlob);
    
    if (!transcript || transcript.length < 3) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>🎤 Audio non compris. Veuillez réécrire votre demande en texte.</Message>
</Response>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
      );
    }
    
    // Étape 3: Analyse temporelle IA
    const analysis = await analyzeTemporalIntent(transcript);
    
    // Étape 4: Formater message enrichi
    const enrichedMessage = formatEnrichedMessage(analysis);
    
    // Étape 5: Appeler bot principal
    const botResponse = await callMainWhatsAppBot(from, enrichedMessage);
    
    console.log('✅ Pipeline audio-to-text terminé avec succès');
    return new Response(botResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
    
  } catch (error) {
    console.error('❌ Erreur pipeline audio:', error);
    
    // Messages d'erreur spécifiques
    let errorMessage = '⚠️ Service audio temporairement indisponible.';
    
    if (error.message.includes('OPENAI_API_KEY')) {
      errorMessage = '🔑 Configuration audio en cours. Utilisez le mode texte.';
    } else if (error.message.includes('Whisper')) {
      errorMessage = '🎤 Audio non reconnu. Veuillez réessayer ou utiliser le texte.';
    } else if (error.message.includes('téléchargement')) {
      errorMessage = '📥 Impossible de récupérer l\'audio. Réessayez.';
    }
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${errorMessage}

💬 Tapez "taxi" pour continuer en mode texte.</Message>
</Response>`;
    
    return new Response(errorResponse, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
}

// Point d'entrée principal
serve(async (req) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }
  
  return await processAudioMessage(req);
});

/* 
🎤 LokoTaxi Audio-to-Text Pipeline avec Analyse Temporelle IA

✅ FONCTIONNALITÉS :
• Transcription Whisper OpenAI
• Analyse temporelle GPT-4 (aujourd'hui/demain + heures)
• Détection destinations ambiguës → suggestions  
• Appel transparent vers bot principal existant
• Gestion erreurs robuste avec fallback texte

📋 VARIABLES REQUISES :
• OPENAI_API_KEY - Clé OpenAI (Whisper + GPT-4)
• WHATSAPP_BOT_URL - URL bot principal existant
• TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN - Auth Twilio

🎯 SCÉNARIOS SUPPORTÉS :
• "Madina à 14h" → Réservation précise
• "hôpital maintenant" → Suggestions + urgence
• "restaurant demain soir" → Suggestions futures
• "aéroport dans 30 min" → Calcul temps réel

🚀 DÉPLOIEMENT : supabase functions deploy audio-to-text
*/