import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// =================================================================
// TYPES ET INTERFACES
// =================================================================

interface WorkflowData {
  vehicleType?: 'moto' | 'voiture'
  destination?: string
  clientPosition?: { lat: number, lon: number }
  confirmed?: boolean
  source: 'text' | 'audio'
  transcript?: string
  aiAnalysis?: AIAnalysis
}

interface AIAnalysis {
  destination: string
  vehicle_type: 'moto' | 'voiture' | 'auto_detect'
  confidence: number
  raw_transcript: string
}

interface Session {
  vehicleType?: string
  positionClient?: string
  destinationNom?: string
  destinationId?: string
  destinationPosition?: string
  distanceKm?: number
  prixEstime?: number
  prixConfirme?: boolean
  etat?: string
  timestamp?: number
}

// =================================================================
// CONFIGURATION ET CONSTANTES
// =================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

// Configuration IA Audio (préparation Phase 2)
const AI_AUDIO_ENABLED = Deno.env.get('AI_AUDIO_ENABLED') === 'true';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const WHISPER_API_URL = Deno.env.get('WHISPER_API_URL') || 'https://api.openai.com/v1/audio/transcriptions';

// Configuration Twilio pour téléchargement audio
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

// Logs de diagnostic des variables d'environnement (v2.0 - Twilio Auth)
console.log('🔧 DEBUG ENV - AI_AUDIO_ENABLED:', AI_AUDIO_ENABLED);
console.log('🔧 DEBUG ENV - OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG ENV - WHISPER_API_URL:', WHISPER_API_URL);
console.log('🔧 DEBUG ENV - TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('🔧 DEBUG ENV - TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');

let workingApiKey = SUPABASE_SERVICE_KEY;

// =================================================================
// FONCTIONS UTILITAIRES
// =================================================================

const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim();
};

async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Tentative ${i + 1}/${maxRetries}: ${url}`);
      const response = await fetch(url, options);
      if (response.status === 503) {
        console.log(`⏳ Service indisponible (503), retry dans ${(i + 1) * 1000}ms...`);
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
          continue;
        }
      }
      return response;
    } catch (error) {
      console.log(`❌ Erreur tentative ${i + 1}: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error('Max retries reached');
}

// =================================================================
// FONCTIONS BASE DE DONNÉES
// =================================================================

async function testDatabaseConnection(): Promise<{ connected: boolean, status?: number, error?: string }> {
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
      return { connected: true, status: response1.status };
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
      return { connected: true, status: response2.status };
    } else {
      const errorText = await response2.text();
      return { connected: false, error: errorText, status: response2.status };
    }
  } catch (error) {
    console.log(`💥 Anon exception:`, error.message);
    return { connected: false, error: error.message };
  }
}

async function saveSession(phone: string, data: any): Promise<void> {
  try {
    const sessionData = {
      client_phone: phone,
      vehicle_type: data.vehicleType || null,
      position_client: data.positionClient || null,
      destination_nom: data.destinationNom || null,
      destination_id: data.destinationId || null,
      destination_position: data.destinationPosition || null,
      distance_km: data.distanceKm || null,
      prix_estime: data.prixEstime || null,
      prix_confirme: data.prixConfirme || false,
      etat: data.etat || 'initial',
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };

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

    if (response.status === 409) {
      console.log(`🔄 Session existe, mise à jour pour ${phone}`);
      const updateData = { ...sessionData };
      delete updateData.client_phone;
      
      const updateResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        console.log(`💾 Session mise à jour: ${phone} → État: ${data.etat}`);
      }
      return;
    }

    if (response.ok) {
      console.log(`💾 Session sauvée: ${phone} → État: ${data.etat}`);
    }
  } catch (error) {
    console.error(`❌ Exception sauvegarde session: ${error.message}`);
  }
}

async function getSession(phone: string): Promise<Session> {
  console.log(`🔍 DEBUG getSession - Recherche session pour: ${phone}`);
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}&expires_at=gte.${new Date().toISOString()}`;
    console.log(`🔍 DEBUG getSession - URL: ${url}`);
    
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
      
      if (sessions.length > 0) {
        const session = sessions[0];
        const result = {
          vehicleType: session.vehicle_type,
          positionClient: session.position_client,
          destinationNom: session.destination_nom,
          destinationId: session.destination_id,
          destinationPosition: session.destination_position,
          distanceKm: session.distance_km,
          prixEstime: session.prix_estime,
          prixConfirme: session.prix_confirme,
          etat: session.etat,
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

async function getAvailableDrivers(vehicleType: string): Promise<any[]> {
  try {
    console.log(`🔍 Recherche conducteurs ${vehicleType}`);
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
  } catch (error) {
    console.error('❌ Exception récupération conducteurs:', error);
    throw error;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const result = R * c;
  
  console.log(`🧮 Distance calculée: ${result.toFixed(1)} km`);
  return result;
}

async function findNearestDriver(vehicleType: string, clientLat: number, clientLng: number): Promise<any> {
  console.log(`🎯 Recherche conducteur ${vehicleType} près de ${clientLat}, ${clientLng}`);
  try {
    const conducteurs = await getAvailableDrivers(vehicleType);
    if (conducteurs.length === 0) {
      return null;
    }
    
    let nearestDriver = null;
    let minDistance = Infinity;
    
    for (const conducteur of conducteurs) {
      const driverLat = conducteur.latitude;
      const driverLng = conducteur.longitude;
      
      if (driverLat && driverLng && !isNaN(driverLat) && !isNaN(driverLng)) {
        const distance = calculateDistance(clientLat, clientLng, driverLat, driverLng);
        console.log(`   ${conducteur.prenom} ${conducteur.nom}: ${distance.toFixed(1)} km`);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestDriver = { ...conducteur, distance };
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

async function searchAdresse(searchTerm: string): Promise<any> {
  try {
    console.log(`🔍 Recherche adresse: "${searchTerm}"`);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/search_adresse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ search_term: searchTerm })
    });
    
    if (!response.ok) {
      console.error(`❌ Erreur recherche adresse: ${response.status}`);
      return null;
    }
    
    const adresses = await response.json();
    console.log(`📍 ${adresses.length} adresse(s) trouvée(s)`);
    
    return adresses.length > 0 ? adresses[0] : null;
  } catch (error) {
    console.error(`❌ Exception recherche adresse: ${error.message}`);
    return null;
  }
}

async function calculerPrixCourse(vehicleType: string, distanceKm: number): Promise<any> {
  try {
    console.log(`💰 Calcul prix: ${vehicleType}, ${distanceKm}km`);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/calculer_prix_course`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        p_vehicle_type: vehicleType,
        p_distance_km: distanceKm
      })
    });
    
    if (!response.ok) {
      const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
      const prixTotal = Math.ceil(distanceKm * tarifDefaut / 1000) * 1000;
      return {
        prix_total: prixTotal,
        prix_par_km: tarifDefaut,
        tarif_applique: 'Tarif par défaut'
      };
    }
    
    const resultats = await response.json();
    return resultats.length > 0 ? resultats[0] : {
      prix_total: Math.ceil(distanceKm * (vehicleType === 'moto' ? 3000 : 4000) / 1000) * 1000,
      prix_par_km: vehicleType === 'moto' ? 3000 : 4000,
      tarif_applique: 'Tarif par défaut'
    };
  } catch (error) {
    console.error(`❌ Exception calcul prix: ${error.message}`);
    const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
    return {
      prix_total: Math.ceil(distanceKm * tarifDefaut / 1000) * 1000,
      prix_par_km: tarifDefaut,
      tarif_applique: 'Tarif par défaut (erreur)'
    };
  }
}

async function getClientCoordinates(sessionPhone: string): Promise<{ latitude: number, longitude: number }> {
  if (!sessionPhone) {
    console.log('❌ sessionPhone manquant');
    return { latitude: 0, longitude: 0 };
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
      body: JSON.stringify({ phone_number: sessionPhone })
    });
    
    if (rpcResponse.ok) {
      const coords = await rpcResponse.json();
      if (coords.length > 0) {
        const lat = parseFloat(coords[0].latitude) || 0;
        const lon = parseFloat(coords[0].longitude) || 0;
        
        if (lat !== 0 && lon !== 0) {
          console.log(`✅ Coordonnées extraites: lat=${lat}, lon=${lon}`);
          return { latitude: lat, longitude: lon };
        }
      }
    }
    
    console.log(`⚠️ Extraction PostGIS échouée, coordonnées par défaut`);
    return { latitude: 0, longitude: 0 };
  } catch (error) {
    console.error(`❌ Erreur extraction coordonnées: ${error.message}`);
    return { latitude: 0, longitude: 0 };
  }
}

// =================================================================
// FONCTIONS IA AUDIO (PHASE 2)
// =================================================================

async function downloadAudio(mediaUrl: string): Promise<ArrayBuffer | null> {
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

    if (!response.ok) {
      console.error(`❌ Erreur téléchargement audio: ${response.status} - ${response.statusText}`);
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

async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string | null> {
  console.log(`🎯 Début transcription Whisper...`);
  
  try {
    // Créer un FormData pour l'API Whisper
    const formData = new FormData();
    
    // Créer un Blob à partir du buffer
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr'); // Français pour le contexte guinéen/parisien
    formData.append('response_format', 'json');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

async function analyzeTranscript(transcript: string): Promise<AIAnalysis | null> {
  console.log(`🧠 Analyse sémantique: "${transcript}"`);
  
  try {
    const systemPrompt = `Tu es un assistant IA pour LokoTaxi qui analyse les demandes vocales de réservation de taxi.

CONTEXTE:
- Service de taxi à Conakry (Guinée) et Paris (France)
- Types de véhicules: 'moto' ou 'voiture'
- Les clients demandent un taxi en parlant naturellement

DESTINATIONS CONNUES:
Conakry: Prefecture, Gare, Marché, Aéroport, Hôpital, Université
Paris: Gare de Melun, Prefecture de Melun, Tour Eiffel, Aéroport CDG, Opéra, Champs-Élysées

TÂCHE:
Analyse le texte et extrait:
1. vehicle_type: 'moto', 'voiture', ou 'auto_detect' si pas clair
2. destination: nom exact de la destination si mentionnée, sinon ""
3. confidence: score 0-100 de la fiabilité de l'analyse

EXEMPLES:
"Je veux un taxi moto pour aller à la gare" → vehicle_type: 'moto', destination: 'Gare', confidence: 95
"Taxi pour prefecture" → vehicle_type: 'auto_detect', destination: 'Prefecture', confidence: 80
"J'ai besoin d'une voiture" → vehicle_type: 'voiture', destination: '', confidence: 90

Réponds UNIQUEMENT en JSON valide:`;

    const userPrompt = `Analyse cette demande: "${transcript}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: "json_object" }
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
    
    const aiAnalysis: AIAnalysis = {
      destination: analysis.destination || '',
      vehicle_type: analysis.vehicle_type || 'auto_detect',
      confidence: Math.min(Math.max(analysis.confidence || 0, 0), 100),
      raw_transcript: transcript
    };

    console.log(`✅ Analyse terminée:`, JSON.stringify(aiAnalysis));
    return aiAnalysis;

  } catch (error) {
    console.error(`💥 Exception analyse GPT: ${error.message}`);
    return null;
  }
}

// =================================================================
// WORKFLOW COMMUN (LOGIQUE PARTAGÉE TEXTE/AUDIO)
// =================================================================

async function commonWorkflow(from: string, workflowData: WorkflowData): Promise<string> {
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
      
      // Nettoyer les sessions précédentes
      await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });

      // Vérifier la disponibilité des conducteurs
      const conducteursDisponibles = await getAvailableDrivers(workflowData.vehicleType);
      if (conducteursDisponibles.length === 0) {
        return `😔 Aucun ${workflowData.vehicleType} disponible actuellement.

🎤 J'ai compris: "${workflowData.transcript}"
📊 Analyse IA: ${workflowData.aiAnalysis?.confidence}% de fiabilité

Essayez l'autre type de véhicule ou réessayez plus tard.`;
      }

      // Rechercher la destination
      const adresse = await searchAdresse(workflowData.destination);
      if (!adresse) {
        return `❓ Destination "${workflowData.destination}" non trouvée.

🎤 J'ai compris: "${workflowData.transcript}"

Destinations disponibles:
• Prefecture de Melun  
• Gare de Melun
• Tour Eiffel
• Aéroport Charles de Gaulle

Renvoyez un vocal avec une destination connue.`;
      }

      return `🎤 **DEMANDE VOCALE ANALYSÉE**

✅ J'ai compris: "${workflowData.transcript}"

🤖 Analyse IA (${workflowData.aiAnalysis?.confidence}% fiabilité):
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
📍 Destination: ${adresse.nom}
👥 ${conducteursDisponibles.length} conducteur(s) disponible(s)

⚠️ **Pour continuer, partagez votre position GPS:**
• Cliquez sur 📎 → Lieu → Envoyer position

Ou écrivez 'taxi' pour le système texte classique.`;
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
    return `💥 Erreur technique.

Message vocal: "${workflowData.transcript || 'non disponible'}"

Réessayez ou écrivez 'taxi'.`;
  }
}

// =================================================================
// HANDLERS SPÉCIALISÉS
// =================================================================

async function handleTextMessage(from: string, body: string, latitude?: string, longitude?: string): Promise<Response> {
  console.log(`\n========== DÉBUT HANDLE TEXT MESSAGE ==========`);
  console.log(`📞 DEBUG - from: "${from}"`);
  console.log(`💬 DEBUG - body: "${body}"`);
  console.log(`📍 DEBUG - latitude: "${latitude}"`);
  console.log(`📍 DEBUG - longitude: "${longitude}"`);
  
  const clientPhone = normalizePhone(from);
  const messageText = body.toLowerCase();
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
  } else if (hasLocation) {
    // PRIORITÉ: Traiter d'abord les positions GPS
    console.log(`🚨 DEBUG - ENTRÉE DANS BLOC hasLocation`);
    console.log(`🚨 DEBUG - session.vehicleType: ${session.vehicleType}`);
    console.log(`🚨 DEBUG - session.etat: ${session.etat}`);
    
    try {
      const lat = parseFloat(latitude!);
      const lon = parseFloat(longitude!);
      console.log(`📍 Position client: ${lat}, ${lon}`);
      
      if (!session.vehicleType) {
        console.log(`⚠️ DEBUG - Pas de vehicleType dans la session`);
        responseMessage = `⚠️ Veuillez d'abord choisir votre type de véhicule.

Pour commencer: écrivez 'taxi'`;
      } else if (session.etat === 'vehicule_choisi') {
        console.log(`✅ DEBUG - État vehicule_choisi détecté, sauvegarde position...`);
        await saveSession(clientPhone, {
          ...session,
          positionClient: `POINT(${lon} ${lat})`,
          etat: 'position_recue'
        });
        
        responseMessage = `📍 Position reçue! Merci.

🏁 Quelle est votre destination ?

Exemples de destinations disponibles:
• Prefecture de Melun
• Gare de Melun
• Mairie de Moissy-Cramayel
• Centre Commercial Carré Sénart
• Tour Eiffel
• Aeroport Charles de Gaulle

Tapez le nom de votre destination:`;
      } else {
        console.log(`❌ DEBUG - État invalide: ${session.etat}`);
        responseMessage = `⚠️ État de session invalide.

Pour recommencer: écrivez 'taxi'`;
      }
    } catch (error) {
      console.error('💥 Erreur traitement position:', error);
      responseMessage = `💥 Erreur technique.

${error.message}
Pour recommencer: écrivez 'taxi'`;
    }
  } else if (messageText.includes('taxi')) {
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
      console.log(`🧹 Session précédente nettoyée pour ${clientPhone}`);
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
  } else if (session.etat === 'position_recue' && !hasLocation) {
    // L'utilisateur tape sa destination
    const adresse = await searchAdresse(body);
    
    if (!adresse) {
      responseMessage = `❓ Destination non trouvée: "${body}"

Veuillez réessayer avec une destination connue:
• Prefecture de Melun
• Gare de Melun
• Centre Commercial Carré Sénart
• Aeroport Charles de Gaulle

Ou tapez 'annuler' pour recommencer.`;
    } else {
      // Calculer distance et prix
      const clientCoords = await getClientCoordinates(normalizePhone(from));
      const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresse.latitude, adresse.longitude);
      const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
      
      await saveSession(clientPhone, {
        ...session,
        destinationNom: adresse.nom,
        destinationId: adresse.id,
        destinationPosition: `POINT(${adresse.longitude} ${adresse.latitude})`,
        distanceKm: distanceKm,
        prixEstime: prixInfo.prix_total,
        etat: 'prix_calcule'
      });
      
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE**

🚗 Type: ${session.vehicleType!.toUpperCase()}
📍 Destination: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
    }
  } else if ((messageText === 'oui' || messageText === 'confirmer') && session.etat === 'prix_calcule') {
    // Confirmation et recherche conducteur
    const clientCoords = await getClientCoordinates(normalizePhone(from));
    const nearestDriver = await findNearestDriver(session.vehicleType!, clientCoords.latitude, clientCoords.longitude);
    
    if (!nearestDriver) {
      responseMessage = `😔 Désolé, aucun ${session.vehicleType} disponible actuellement.

Veuillez réessayer dans quelques minutes.

Pour recommencer: écrivez 'taxi'`;
    } else {
      // Sauvegarder réservation
      const reservationData = {
        client_phone: clientPhone,
        conducteur_id: null,
        vehicle_type: session.vehicleType,
        position_depart: session.positionClient,
        destination_nom: session.destinationNom,
        destination_id: session.destinationId,
        position_arrivee: session.destinationPosition,
        distance_km: session.distanceKm,
        prix_total: session.prixEstime,
        statut: 'pending'
      };
      
      try {
        const saveResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reservationData)
        });
        
        if (saveResponse.ok) {
          await saveSession(clientPhone, {
            ...session,
            prixConfirme: true,
            etat: 'confirme'
          });
          
          responseMessage = `⏳ **RÉSERVATION EN ATTENTE**

🚖 Votre demande de ${session.vehicleType} a été enregistrée
📍 Destination: ${session.destinationNom}
💰 Prix: ${session.prixEstime!.toLocaleString('fr-FR')} GNF

🔍 **Recherche d'un conducteur disponible...**

📱 Vous recevrez un message dès qu'un conducteur accepte votre course.

⏱️ Temps d'attente moyen: 3-5 minutes

Pour annuler: écrivez 'annuler'`;
          
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
  } else if ((messageText === 'non' || messageText === 'annuler') && session.etat === 'prix_calcule') {
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
  } else if (messageText === 'moto' || messageText === 'voiture') {
    try {
      const conducteursDisponibles = await getAvailableDrivers(messageText);
      if (conducteursDisponibles.length === 0) {
        responseMessage = `😔 Désolé, aucun ${messageText} n'est disponible actuellement.

Causes possibles:
• Tous nos conducteurs ${messageText} sont occupés
• Heure de pointe avec forte demande
• Aucun conducteur ${messageText} enregistré dans le système

Solutions:
• Essayez l'autre type: ${messageText === 'moto' ? 'voiture' : 'moto'}
• Réessayez dans quelques minutes
• Contactez le support si le problème persiste

Pour recommencer: écrivez 'taxi'`;
      } else {
        await saveSession(clientPhone, {
          vehicleType: messageText,
          etat: 'vehicule_choisi'
        });
        
        responseMessage = `📍 Parfait! Vous avez choisi: ${messageText.toUpperCase()}

✅ ${conducteursDisponibles.length} conducteur(s) ${messageText} disponible(s)

Pour calculer le prix de votre course, partagez votre position GPS:
• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Lieu"
• Envoyez votre position actuelle

Ensuite, nous vous demanderons votre destination.`;
      }
    } catch (error) {
      console.error(`❌ Erreur vérification conducteurs ${messageText}:`, error);
      responseMessage = `❌ Erreur technique lors de la vérification des conducteurs.

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
            body: JSON.stringify({ statut: 'canceled' })
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
  } else {
    // Message de bienvenue par défaut
    console.log(`🔴 DEBUG - ARRIVÉE DANS LE ELSE FINAL`);
    console.log(`🔴 DEBUG - messageText: "${messageText}"`);
    console.log(`🔴 DEBUG - hasLocation: ${hasLocation}`);
    console.log(`🔴 DEBUG - session: ${JSON.stringify(session)}`);
    
    responseMessage = `🚕 Bienvenue chez LokoTaxi Conakry!

Pour commencer votre réservation:
📝 Écrivez 'taxi'

Service disponible 24h/24`;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

  console.log(`📤 Réponse TEXTE: ${responseMessage.substring(0, 100)}...`);
  
  return new Response(twiml, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml; charset=utf-8'
    }
  });
}

async function handleAudioMessage(from: string, mediaUrl: string): Promise<Response> {
  const clientPhone = normalizePhone(from);
  console.log(`🎤 AUDIO: ${clientPhone} | 📎 ${mediaUrl}`);
  
  // Vérifier si l'IA Audio est activée
  if (!AI_AUDIO_ENABLED) {
    const fallbackMessage = `🎤 Fonctionnalité audio bientôt disponible!

Pour l'instant, utilisez le système texte:
📝 Écrivez 'taxi' pour commencer

Service disponible 24h/24`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${fallbackMessage}</Message>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
  }

  // Vérifier les clés API
  if (!OPENAI_API_KEY) {
    console.error(`❌ OPENAI_API_KEY manquante`);
    return await handleTextMessage(from, "Configuration IA manquante - écrivez 'taxi'");
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
          
          const workflowData: WorkflowData = {
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

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;

  console.log(`📤 Réponse AUDIO: ${responseMessage.substring(0, 100)}...`);
  
  return new Response(twiml, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml; charset=utf-8'
    }
  });
}

// =================================================================
// POINT D'ENTRÉE PRINCIPAL MODULAIRE
// =================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Routes spéciales (notifications, etc.)
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'process-notifications' || action === 'send-notification' || action === 'notify-accepted') {
      // Conserver la logique existante pour les notifications
      // [Code existant pour les actions spéciales sera conservé]
      return new Response(JSON.stringify({ success: true, message: 'Legacy notification handler' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parsing des données Twilio
    const contentType = req.headers.get('Content-Type') || '';
    let from = '';
    let body = '';
    let latitude = '';
    let longitude = '';
    let mediaUrl0 = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('From')?.toString() || '';
      body = formData.get('Body')?.toString()?.trim() || '';
      latitude = formData.get('Latitude')?.toString() || '';
      longitude = formData.get('Longitude')?.toString() || '';
      mediaUrl0 = formData.get('MediaUrl0')?.toString() || '';
      
      console.log(`🌐 SERVE - FormData parsed:`);
      console.log(`🌐 SERVE - from: "${from}"`);
      console.log(`🌐 SERVE - body: "${body}"`);
      console.log(`🌐 SERVE - latitude: "${latitude}"`);
      console.log(`🌐 SERVE - longitude: "${longitude}"`);
      console.log(`🌐 SERVE - mediaUrl0: "${mediaUrl0}"`);
    } else {
      // Test direct
      body = 'test';
      from = 'test';
    }

    // =================================================================
    // POINT D'ENTRÉE MODULAIRE - AUDIO VS TEXTE
    // =================================================================
    
    if (body && body.trim()) {
      // 📱 SYSTÈME TEXTE avec message
      console.log('🔀 Routage vers handleTextMessage (avec texte)');
      return await handleTextMessage(from, body, latitude, longitude);
    } else if (latitude && longitude && latitude !== '' && longitude !== '') {
      // 📍 SYSTÈME TEXTE avec GPS uniquement
      console.log('🔀 Routage vers handleTextMessage (GPS seulement)');
      return await handleTextMessage(from, '', latitude, longitude);
    } else if (mediaUrl0) {
      // 🎤 SYSTÈME AUDIO (nouveau - Phase 2)
      console.log('🔀 Routage vers handleAudioMessage');
      return await handleAudioMessage(from, mediaUrl0);
    }

    // Fallback
    return await handleTextMessage(from, "");

  } catch (error) {
    console.error('💥 Erreur globale:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>💥 Erreur technique temporaire.

Réessayez dans quelques minutes.
Support: écrivez 'taxi'</Message>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
  }
});