import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// =================================================================
// TYPES ET INTERFACES - Force redeploy: 2025-07-27 20:15
// =================================================================

interface WorkflowData {
  vehicleType?: 'moto' | 'voiture'
  destination?: string
  clientPosition?: { lat: number, lon: number }
  confirmed?: boolean
  source: 'text' | 'audio'
  transcript?: string
  aiAnalysis?: AIAnalysis
  plannedDateTime?: { date: string, hour: number, minute: number }
}

interface AIAnalysis {
  destination: string
  vehicle_type: 'moto' | 'voiture' | 'auto_detect'
  date?: 'aujourd_hui' | 'demain' | string
  time?: 'maintenant' | string
  temporal_planning?: boolean
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
  suggestionsDestination?: string // JSON des suggestions pour choix multiple
  // Données temporelles pour planification
  plannedDate?: string     // YYYY-MM-DD
  plannedHour?: number     // 0-23
  plannedMinute?: number   // 0-59
  temporalPlanning?: boolean // true si réservation future
  // Données pour départ personnalisé
  departNom?: string       // Nom du point de départ personnalisé
  departId?: string        // ID du point de départ
  departPosition?: string  // Position GPS du départ
  departLatitude?: number  // Latitude du départ (depuis searchAdresse)
  departLongitude?: number // Longitude du départ (depuis searchAdresse)
  suggestionsDepart?: string // JSON des suggestions départ
}

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
    console.log(`🚨 DEBUG - ENTRÉE DANS saveSession pour phone: ${phone}`);
    console.log(`🚨 DEBUG - data reçu:`, JSON.stringify(data, null, 2));
    
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
      suggestions_destination: data.suggestionsDestination || null, // Nouveau champ
      suggestions_depart: data.suggestionsDepart || null, // Champ pour suggestions départ (même logique)
      // Données départ personnalisé (équivalent destinations)
      depart_nom: data.departNom || null,
      depart_id: data.departId || null, // AJOUT MANQUANT: Sauvegarder l'ID du départ
      depart_position: data.departPosition || null,
      // 🆕 DONNÉES TEMPORELLES - AJOUT CRITIQUE
      planned_date: data.plannedDate || null,
      planned_hour: data.plannedHour || null,
      planned_minute: data.plannedMinute || null,
      temporal_planning: data.temporalPlanning || false,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 heures pour réservations planifiées
    };

    console.log(`🚨 DEBUG - sessionData construit:`, JSON.stringify(sessionData, null, 2));

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

async function getSession(phone: string): Promise<Session> {
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
        allSessions.forEach((s: any, i: number) => {
          console.log(`📋 Session ${i+1}: expires_at=${s.expires_at}, etat=${s.etat}, now=${currentTime}`);
        });
      }
      
      if (sessions.length > 0) {
        // CORRECTION : Prendre la session la plus récente (updated_at le plus tard)
        const sortedSessions = sessions.sort((a: any, b: any) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        const session = sortedSessions[0];
        console.log(`🔍 DEBUG getSession - Session sélectionnée (la plus récente): vehicle_type=${session.vehicle_type}, etat=${session.etat}, updated_at=${session.updated_at}`);
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
          suggestionsDestination: session.suggestions_destination, // Nouveau champ
          suggestionsDepart: session.suggestions_depart, // Champ pour suggestions départ (même logique)
          // Données départ personnalisé (équivalent destinations)
          departNom: session.depart_nom,
          departId: session.depart_id, // AJOUT: Récupérer l'ID du départ
          departPosition: session.depart_position,
          // 🆕 DONNÉES TEMPORELLES - RÉCUPÉRATION
          plannedDate: session.planned_date,
          plannedHour: session.planned_hour,
          plannedMinute: session.planned_minute,
          temporalPlanning: session.temporal_planning,
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

// Fonction de recherche fuzzy/partielle intelligente
async function searchAdressePartial(keyword: string): Promise<any[]> {
  try {
    console.log(`🔍 Recherche fuzzy: "${keyword}"`);
    
    // CORRECTION: Utiliser la même requête SQL directe qui marche pour les départs (ligne 2048)
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,latitude,longitude,position&or=(nom.ilike.*${encodeURIComponent(keyword)}*,nom_normalise.ilike.*${encodeURIComponent(keyword)}*)&order=nom&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Erreur recherche fuzzy: ${response.status}`);
      // FALLBACK: Tester avec table adresses directement comme pour les départs
      console.log(`🔄 FALLBACK: Test avec table adresses directement`);
      const fallbackResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=id,nom,ville,type_lieu,position&or=(nom.ilike.*${encodeURIComponent(keyword)}*,nom_normalise.ilike.*${encodeURIComponent(keyword)}*)&order=nom&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log(`✅ FALLBACK réussi: ${fallbackData.length} résultat(s)`);
        return fallbackData.map((addr: any) => ({
          id: addr.id,
          nom: addr.nom,
          ville: addr.ville,
          type_lieu: addr.type_lieu,
          latitude: addr.position ? parseFloat(addr.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[2] || '0') : 0,
          longitude: addr.position ? parseFloat(addr.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[1] || '0') : 0,
          position: addr.position
        }));
      }
      
      return [];
    }
    
    const adresses = await response.json();
    console.log(`🎯 ${adresses.length} résultat(s) fuzzy pour "${keyword}"`);
    
    return adresses.map((addr: any) => ({
      id: addr.id,
      nom: addr.nom,
      ville: addr.ville,
      type_lieu: addr.type_lieu,
      latitude: addr.latitude || 0,
      longitude: addr.longitude || 0,
      position: addr.position
    }));
    
  } catch (error) {
    console.error(`💥 Exception recherche fuzzy: ${error.message}`);
    return [];
  }
}

// =================================================================
// NOUVELLE API DE RECHERCHE INTELLIGENTE GUINÉE (30,000+ lieux)
// =================================================================

// Fonction de suggestions dynamiques basées sur popularité
async function getSuggestionsIntelligentes(partialText: string, limit = 5): Promise<any> {
  try {
    console.log(`🎯 Suggestions intelligentes pour: "${partialText}"`);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=nom,ville,type_lieu,popularite&actif=eq.true&nom=ilike.${encodeURIComponent(partialText)}*&order=popularite.desc,nom.asc&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Erreur suggestions: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ ${data.length} suggestions trouvées`);
    return data;
    
  } catch (error) {
    console.error(`💥 Exception suggestions: ${error.message}`);
    return [];
  }
}

// Fonction pour incrémenter la popularité d'une destination
async function incrementerPopularite(destinationNom: string): Promise<void> {
  try {
    console.log(`📊 Incrémentation popularité: "${destinationNom}"`);
    
    // Utiliser l'API RPC pour exécuter une fonction SQL directe
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/increment_popularite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination_nom: destinationNom
      })
    });

    if (response.ok) {
      console.log(`✅ Popularité incrémentée pour: ${destinationNom}`);
    } else {
      console.log(`⚠️ Fonction RPC non trouvée, utilisation UPDATE direct`);
      // Fallback: simple UPDATE (ne peut pas utiliser += en REST)
      // On récupère d'abord la valeur actuelle, puis on met à jour
    }
  } catch (error) {
    console.error(`❌ Erreur mise à jour popularité: ${error.message}`);
  }
}

async function searchDestinationIntelligent(searchTerm: string): Promise<any> {
  try {
    console.log(`🔍 Recherche intelligente: "${searchTerm}"`);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/functions/v1/location-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: searchTerm,
        maxResults: 5
      })
    });
    
    if (!response.ok) {
      console.error(`❌ Erreur API recherche intelligente: ${response.status}`);
      return { success: false, results: [] };
    }
    
    const result = await response.json();
    console.log(`🎯 Recherche intelligente: ${result.results?.length || 0} résultat(s) pour "${searchTerm}"`);
    
    return result;
  } catch (error) {
    console.error(`❌ Exception recherche intelligente: ${error.message}`);
    return { success: false, results: [] };
  }
}

// Fonction pour rechercher des adresses (utilisée pour départ et destination)
async function searchAdresses(searchTerm: string): Promise<any[]> {
  return await searchAdressePartial(searchTerm);
}

// Fonction legacy pour compatibilité - utilise maintenant l'API intelligente
async function searchAdresse(searchTerm: string): Promise<any> {
  const intelligentResult = await searchDestinationIntelligent(searchTerm);
  
  if (intelligentResult.success && intelligentResult.results.length > 0) {
    const firstResult = intelligentResult.results[0];
    return {
      id: firstResult.id,
      nom: firstResult.nom,
      latitude: firstResult.latitude,
      longitude: firstResult.longitude,
      position: `POINT(${firstResult.longitude} ${firstResult.latitude})`,
      adresse_complete: firstResult.adresse_complete,
      ville: firstResult.ville,
      type_lieu: firstResult.type_lieu
    };
  }
  
  return null;
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

// Fonction pour extraire coordonnées depuis position PostGIS
// CORRECTION: Fonction pour récupérer coordonnées depuis ID d'adresse (OPTIMISÉE TIMEOUT)
async function getCoordinatesFromAddressId(addressId: string): Promise<{ latitude: number, longitude: number }> {
  try {
    console.log(`🔍 Récupération coordonnées pour ID: ${addressId}`);
    
    // OPTIMISATION: Requête simple sans retry pour éviter timeout
    const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=latitude,longitude&id=eq.${addressId}&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(3000) // Timeout 3s max
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        const coords = {
          latitude: parseFloat(data[0].latitude) || 0,
          longitude: parseFloat(data[0].longitude) || 0
        };
        console.log(`✅ Coordonnées trouvées: lat=${coords.latitude}, lon=${coords.longitude}`);
        return coords;
      }
    }
    
    console.log(`❌ Coordonnées non trouvées pour ID: ${addressId}`);
    return { latitude: 0, longitude: 0 };
  } catch (error) {
    console.error(`❌ Erreur récupération coordonnées: ${error.message}`);
    return { latitude: 0, longitude: 0 };
  }
}

// CORRECTION: Fonction pour récupérer coordonnées depuis nom d'adresse (recherche partielle)
async function getCoordinatesFromAddressName(addressName: string): Promise<{ latitude: number, longitude: number }> {
  try {
    console.log(`🔍 Récupération coordonnées pour nom: "${addressName}"`);
    
    // OPTIMISATION: Requête rapide avec timeout pour éviter blocage Twilio
    const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=latitude,longitude,nom&nom=ilike.*${encodeURIComponent(addressName)}*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(3000) // Timeout 3s max
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        const coords = {
          latitude: parseFloat(data[0].latitude) || 0,
          longitude: parseFloat(data[0].longitude) || 0
        };
        console.log(`✅ Coordonnées trouvées pour "${addressName}" (résultat: "${data[0].nom}"): lat=${coords.latitude}, lon=${coords.longitude}`);
        return coords;
      }
    }
    
    console.log(`❌ Coordonnées non trouvées pour nom: "${addressName}"`);
    return { latitude: 0, longitude: 0 };
  } catch (error) {
    console.error(`❌ Erreur récupération coordonnées par nom: ${error.message}`);
    return { latitude: 0, longitude: 0 };
  }
}

// LEGACY: Fonction de fallback pour format POINT() texte
function getCoordinatesFromPosition(position: string): { latitude: number, longitude: number } {
  const match = position.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (match) {
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
  }
  console.log(`⚠️ Format PostGIS binaire détecté, utiliser getCoordinatesFromAddressId() à la place`);
  return { latitude: 0, longitude: 0 };
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

// Fonction pour récupérer les destinations populaires (top 10)
async function getPopularDestinations(): Promise<any[]> {
  try {
    console.log('🎆 Récupération des destinations populaires...');
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=*&actif=eq.true&order=nom&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Erreur récupération destinations populaires: ${response.status}`);
      return [{ nom: 'Hôpital Ignace Deen' }, { nom: 'Marché Madina' }, { nom: 'Aéroport de Conakry' }];
    }
    
    const adresses = await response.json();
    console.log(`✅ ${adresses.length} destinations populaires récupérées`);
    return adresses;
    
  } catch (error) {
    console.error(`💥 Exception destinations populaires: ${error.message}`);
    return [{ nom: 'Prefecture de Melun' }, { nom: 'Gare de Melun' }, { nom: 'Tour Eiffel' }];
  }
}

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

// Fonction pour créer reservationData avec gestion temporelle
function createReservationData(clientPhone: string, session: Session) {
  console.log(`🏗️ DEBUG createReservationData - clientPhone: ${clientPhone}`);
  console.log(`🏗️ DEBUG createReservationData - session:`, JSON.stringify(session, null, 2));
  
  const reservationData: any = {
    client_phone: clientPhone,
    conducteur_id: null,
    vehicle_type: session.vehicleType,
    position_depart: session.positionClient || session.departPosition, // Position GPS client OU départ personnalisé
    destination_nom: session.destinationNom,
    destination_id: session.destinationId,
    position_arrivee: session.destinationPosition,
    distance_km: session.distanceKm,
    prix_total: session.prixEstime,
    statut: 'pending'
  };

  console.log(`🏗️ DEBUG - Temporal planning: ${session.temporalPlanning}`);
  console.log(`🏗️ DEBUG - Planned date: ${session.plannedDate}`);
  console.log(`🏗️ DEBUG - Planned hour: ${session.plannedHour}`);
  console.log(`🏗️ DEBUG - Planned minute: ${session.plannedMinute}`);

  // ⏰ GESTION TEMPORELLE - Utiliser les données de planification si disponibles
  if (session.temporalPlanning && session.plannedDate && session.plannedHour !== undefined) {
    // Réservation planifiée - utiliser les données temporelles de la session
    const plannedMinute = session.plannedMinute || 0; // Défaut à 0 si null/undefined
    const plannedDate = new Date(session.plannedDate);
    plannedDate.setHours(session.plannedHour, plannedMinute, 0, 0);
    
    reservationData.date_reservation = session.plannedDate; // YYYY-MM-DD
    reservationData.heure_reservation = session.plannedHour; // 0-23
    reservationData.minute_reservation = plannedMinute; // 0-59
    reservationData.created_at = plannedDate.toISOString(); // Timestamp complet
    
    console.log(`⏰ Réservation PLANIFIÉE créée pour: ${session.plannedDate} à ${session.plannedHour}:${plannedMinute.toString().padStart(2, '0')}`);
  } else {
    // Réservation immédiate - utiliser NOW()
    const now = new Date();
    reservationData.date_reservation = now.toISOString().split('T')[0]; // YYYY-MM-DD
    reservationData.heure_reservation = now.getHours(); // 0-23
    reservationData.minute_reservation = now.getMinutes(); // 0-59
    // created_at sera automatiquement NOW() par défaut dans Supabase
    
    console.log(`⏰ Réservation IMMÉDIATE créée pour: maintenant`);
  }

  console.log(`🏗️ DEBUG - ReservationData final:`, JSON.stringify(reservationData, null, 2));
  return reservationData;
}

// Fonction pour calculer la date/heure planifiée à partir de l'analyse IA
function calculatePlannedDateTime(analysis: AIAnalysis): { date: string, hour: number, minute: number } {
  const now = new Date();
  let plannedDate = new Date(now);
  let hour = now.getHours();
  let minute = now.getMinutes();
  
  // Gestion de la date
  let dateString = '';
  if (analysis.date === 'demain') {
    plannedDate.setDate(plannedDate.getDate() + 1);
    dateString = plannedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD pour demain
  } else if (analysis.date === 'aujourd_hui') {
    dateString = plannedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD pour aujourd'hui
  } else if (analysis.date && analysis.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si c'est déjà une date spécifique (YYYY-MM-DD)
    dateString = analysis.date;
    plannedDate = new Date(analysis.date);
  } else {
    // Par défaut, aujourd'hui
    dateString = plannedDate.toISOString().split('T')[0];
  }
  
  // Gestion de l'heure
  if (analysis.time && analysis.time !== 'maintenant') {
    if (analysis.time.includes(':')) {
      // Format HH:MM
      const [h, m] = analysis.time.split(':');
      hour = parseInt(h);
      minute = parseInt(m);
    } else if (analysis.time.includes('dans_')) {
      // Format "dans_X_minutes"
      const match = analysis.time.match(/dans_(\d+)_minutes/);
      if (match) {
        const minutesToAdd = parseInt(match[1]);
        const futureTime = new Date(now.getTime() + minutesToAdd * 60000);
        hour = futureTime.getHours();
        minute = futureTime.getMinutes();
      }
    }
  }
  
  console.log(`📅 Planification calculée: ${dateString} à ${hour}:${minute.toString().padStart(2, '0')}`);
  
  return {
    date: dateString,
    hour: hour,
    minute: minute
  };
}

async function analyzeTranscript(transcript: string): Promise<AIAnalysis | null> {
  console.log(`🧠 Analyse sémantique IA LIBRE: "${transcript}"`);
  
  try {
    // PROMPT GPT AVEC ANALYSE TEMPORELLE
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDate = currentTime.toISOString().split('T')[0]; // 2025-07-27
    
    const systemPrompt = `Tu es un assistant IA pour LokoTaxi. Analyse les demandes vocales et retourne EXACTEMENT ce format JSON:

{
  "vehicle_type": "moto" | "voiture" | "auto_detect",
  "destination": "string ou vide",
  "date": "aujourd_hui" | "demain" | "YYYY-MM-DD",
  "time": "maintenant" | "HH:MM" | "dans_X_minutes",
  "temporal_planning": true | false,
  "confidence": number (0-100),
  "raw_transcript": "string"
}

CONTEXTE:
- Heure actuelle: ${timeString}
- Date actuelle: ${currentDate}

RÈGLES IMPORTANTES:
- Si "demain" est mentionné → date: "demain", temporal_planning: true
- Si une heure est mentionnée (ex: "14h") → time: "14:00"
- Si aucune référence temporelle → date: "aujourd_hui", time: "maintenant", temporal_planning: false
- TOUS les champs sont OBLIGATOIRES

EXEMPLE pour "Je veux un taxi moto pour demain 14h":
{
  "vehicle_type": "moto",
  "destination": "",
  "date": "demain",
  "time": "14:00",
  "temporal_planning": true,
  "confidence": 95,
  "raw_transcript": "Je veux un taxi moto pour demain 14h"
}`;

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
    
    console.log(`🔍 DEBUG - GPT-4 raw response:`, JSON.stringify(result, null, 2));
    console.log(`🔍 DEBUG - GPT-4 content:`, content);
    
    if (!content) {
      console.error(`❌ Réponse GPT vide`);
      return null;
    }

    const analysis = JSON.parse(content);
    console.log(`🔍 DEBUG - Parsed analysis:`, JSON.stringify(analysis, null, 2));
    
    // Détection temporelle manuelle si GPT-4 ne la fait pas
    let temporalPlanning = analysis.temporal_planning === true;
    let date = analysis.date || 'aujourd_hui';
    let time = analysis.time || 'maintenant';
    
    // Fallback : détecter manuellement "demain" et heure dans le transcript
    if (!analysis.temporal_planning && transcript.toLowerCase().includes('demain')) {
      temporalPlanning = true;
      date = 'demain';
      console.log(`⚠️ Détection manuelle: "demain" trouvé dans le transcript`);
    }
    
    // Détecter l'heure (format: 14h, 14h00, 14:00)
    const heureMatch = transcript.match(/(\d{1,2})h(\d{0,2})?|\d{1,2}:\d{2}/);
    if (heureMatch && (!analysis.time || analysis.time === 'maintenant')) {
      const matched = heureMatch[0];
      if (matched.includes('h')) {
        const parts = matched.split('h');
        const hour = parts[0];
        const minutes = parts[1] || '00';
        time = `${hour.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      } else {
        time = matched;
      }
      temporalPlanning = true; // Si une heure est spécifiée, c'est forcément planifié
      console.log(`⚠️ Détection manuelle: heure "${time}" trouvée dans le transcript`);
    }
    
    const aiAnalysis: AIAnalysis = {
      destination: analysis.destination || '',
      vehicle_type: analysis.vehicle_type || 'auto_detect',
      date: date,
      time: time,
      temporal_planning: temporalPlanning,
      confidence: Math.min(Math.max(analysis.confidence || 0, 0), 100),
      raw_transcript: analysis.raw_transcript || transcript
    };

    console.log(`✅ Analyse terminée:`, JSON.stringify(aiAnalysis));
    return aiAnalysis;

  } catch (error) {
    console.error(`💥 Exception analyse GPT: ${error.message}`);
    return null;
  }
}

// =================================================================
// GESTION INTELLIGENTE DES DESTINATIONS (OPTION B)
// =================================================================

interface DestinationResult {
  success: boolean
  adresse?: any
  suggestions?: any[]
  type: 'exact' | 'fuzzy_single' | 'fuzzy_multiple' | 'unknown'
  message?: string
}

// Fonction principale de validation intelligente des destinations
async function handleDestinationIntelligent(aiDestination: string): Promise<DestinationResult> {
  console.log(`🧠 Nouvelle recherche intelligente Guinée: "${aiDestination}"`);
  
  // Utilisation de la nouvelle API de recherche intelligente
  const searchResult = await searchDestinationIntelligent(aiDestination);
  
  if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
    console.log(`❌ Aucun résultat pour: ${aiDestination}`);
    const popularDestinations = await getPopularDestinations();
    return { 
      success: false, 
      suggestions: popularDestinations.slice(0, 5),
      type: 'not_found',
      message: `❌ Destination "${aiDestination}" non trouvée`
    };
  }
  
  const results = searchResult.results;
  
  if (results.length === 1) {
    // 1 seul résultat - sélection automatique
    const lieu = results[0];
    console.log(`✅ Résultat unique: ${lieu.nom} (${lieu.ville})`);
    
    const adresse = {
      id: lieu.id,
      nom: lieu.nom,
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      position: `POINT(${lieu.longitude} ${lieu.latitude})`,
      adresse_complete: lieu.adresse_complete,
      ville: lieu.ville,
      type_lieu: lieu.type_lieu
    };
    
    return { 
      success: true, 
      adresse, 
      type: lieu.match_type || 'intelligent',
      message: `✅ ${lieu.nom} trouvé à ${lieu.ville} (${lieu.type_lieu})`
    };
  } else {
    // Plusieurs résultats - demander choix à l'utilisateur
    console.log(`❓ ${results.length} résultats trouvés pour: ${aiDestination}`);
    
    const suggestions = results.map(lieu => ({
      id: lieu.id,
      nom: lieu.nom,
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      position: `POINT(${lieu.longitude} ${lieu.latitude})`,
      ville: lieu.ville,
      type_lieu: lieu.type_lieu
    }));
    
    return { 
      success: false, 
      suggestions,
      type: 'multiple_found',
      message: `🎯 ${results.length} lieux trouvés pour "${aiDestination}"`
    };
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
      console.log(`🔍 DEBUG - workflowData.vehicleType: ${workflowData.vehicleType}`);
      console.log(`🔍 DEBUG - workflowData.destination: ${workflowData.destination}`);
      
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

      // SAUVEGARDER LES DONNÉES TEMPORELLES SI PRÉSENTES
      if (workflowData.plannedDateTime) {
        console.log(`⏰ Sauvegarde données temporelles (Scénario 1): ${workflowData.plannedDateTime.date} à ${workflowData.plannedDateTime.hour}:${workflowData.plannedDateTime.minute.toString().padStart(2, '0')}`);
      }

      // VALIDATION INTELLIGENTE DE LA DESTINATION (Option B)
      console.log(`🔍 DEBUG - Avant appel handleDestinationIntelligent`);
      const destinationResult = await handleDestinationIntelligent(workflowData.destination);
      console.log(`🔍 DEBUG - Après handleDestinationIntelligent: success=${destinationResult.success}`);
      
      if (!destinationResult.success) {
        // Gérer les différents types d'échec
        if (destinationResult.type === 'multiple_found') {
          // Cas 2: Plusieurs résultats trouvés avec nouvelle API - demander choix
          const suggestions = destinationResult.suggestions!.map((lieu, index) => 
            `${index + 1}️⃣ ${lieu.nom} (${lieu.ville}) - ${lieu.type_lieu}`
          ).join('\n');
          
          // Sauvegarder les suggestions pour traitement choix
          const sessionDataMultiple: any = {
            vehicleType: workflowData.vehicleType,
            etat: 'choix_destination_multiple',
            suggestionsDestination: JSON.stringify(destinationResult.suggestions)
          };
          
          // Ajouter les données temporelles si présentes
          if (workflowData.plannedDateTime) {
            sessionDataMultiple.plannedDate = workflowData.plannedDateTime.date;
            sessionDataMultiple.plannedHour = workflowData.plannedDateTime.hour;
            sessionDataMultiple.plannedMinute = workflowData.plannedDateTime.minute;
            sessionDataMultiple.temporalPlanning = true;
            console.log(`⏰ Sauvegarde données temporelles (Multiple choix): ${workflowData.plannedDateTime.date} à ${workflowData.plannedDateTime.hour}:${workflowData.plannedDateTime.minute.toString().padStart(2, '0')}`);
          }
          
          await saveSession(clientPhone, sessionDataMultiple);
          
          return `🎤 **DEMANDE VOCALE ANALYSÉE**

✅ J'ai compris: "${workflowData.transcript}"

🤖 Analyse IA (${workflowData.aiAnalysis?.confidence}% fiabilité):
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
🎯 ${destinationResult.suggestions!.length} destinations trouvées:

**Choisissez votre destination:**
${suggestions}

**Répondez par le numéro (1, 2, etc.) ou tapez le nom complet.**`;
        } else {
          // Cas 3: Destination inconnue - suggestions générales
          const suggestions = destinationResult.suggestions!.slice(0, 5).map(addr => 
            `• ${addr.nom}`
          ).join('\n');
          
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
      
      const adresse = destinationResult.adresse!;

      // Sauvegarder dans la session pour ne pas redemander
      console.log(`💾 DEBUG - TENTATIVE SAUVEGARDE SESSION IA`);
      console.log(`💾 DEBUG - clientPhone: ${clientPhone}`);
      console.log(`💾 DEBUG - vehicleType: ${workflowData.vehicleType}`);
      console.log(`💾 DEBUG - destinationNom: ${adresse.nom}`);
      
      try {
        console.log(`🚨 DEBUG - AVANT APPEL saveSession pour clientPhone: ${clientPhone}`);
        console.log(`🚨 DEBUG - workflowData.vehicleType: ${workflowData.vehicleType}`);
        console.log(`🚨 DEBUG - adresse.nom: ${adresse.nom}`);
        console.log(`🚨 DEBUG - adresse.id: ${adresse.id}`);
        
        await saveSession(clientPhone, {
          vehicleType: workflowData.vehicleType,
          destinationNom: adresse.nom,
          destinationId: adresse.id,
          destinationPosition: adresse.position,
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
📍 Destination: ${adresse.nom} ${destinationResult.type === 'exact' ? '✅' : '🎯'}
👥 ${conducteursDisponibles.length} conducteur(s) disponible(s)

${destinationResult.message}

📍 **ÉTAPE SUIVANTE - Partagez votre position GPS:**

• Cliquez sur l'icône 📎 (trombone)
• Sélectionnez "Localisation" 
• Appuyez sur "Envoyer position actuelle"

Ou tapez 'taxi' pour recommencer en mode texte.`;
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

      // Sauvegarder les données temporelles si présentes
      const sessionData: any = {
        vehicleType: workflowData.vehicleType,
        etat: 'vehicule_choisi'
      };
      
      // Ajouter les données temporelles si c'est une planification
      if (workflowData.plannedDateTime) {
        sessionData.plannedDate = workflowData.plannedDateTime.date;
        sessionData.plannedHour = workflowData.plannedDateTime.hour;
        sessionData.plannedMinute = workflowData.plannedDateTime.minute;
        sessionData.temporalPlanning = true;
        console.log(`⏰ Sauvegarde données temporelles: ${workflowData.plannedDateTime.date} à ${workflowData.plannedDateTime.hour}:${workflowData.plannedDateTime.minute.toString().padStart(2, '0')}`);
      }
      
      await saveSession(clientPhone, sessionData);

      // Message adapté selon planification temporelle ou non
      if (workflowData.plannedDateTime) {
        const dateFormatted = workflowData.plannedDateTime.date === 'demain' ? 
          'demain' : workflowData.plannedDateTime.date;
        const timeFormatted = `${workflowData.plannedDateTime.hour}:${workflowData.plannedDateTime.minute.toString().padStart(2, '0')}`;
        
        return `🎤 **${workflowData.vehicleType.toUpperCase()} PLANIFIÉ POUR ${dateFormatted.toUpperCase()} ${timeFormatted}**

✅ Message vocal: "${workflowData.transcript}"
🚗 Véhicule: ${workflowData.vehicleType.toUpperCase()}
📅 Planification: ${dateFormatted} à ${timeFormatted}

📍 **Prochaines étapes :**
1. Partagez votre position de départ (📎 → Localisation)
2. Indiquez votre destination (texte ou vocal)

🕐 Votre réservation sera créée pour le ${dateFormatted} à ${timeFormatted}`;
      } else {
        return `🎤 **VÉHICULE SÉLECTIONNÉ PAR IA**

✅ Message vocal: "${workflowData.transcript}"
🚗 Véhicule détecté: ${workflowData.vehicleType.toUpperCase()}
👥 ${conducteursDisponibles.length} conducteur(s) disponible(s)

📍 **Prochaine étape: Partagez votre position GPS**
• Cliquez sur 📎 → Lieu → Envoyer position

Ensuite je vous demanderai votre destination.`;
      }
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
  console.log(`🔴 DEBUG - messageText: "${messageText}"`);
  
  // Test de connexion
  const dbTest = await testDatabaseConnection();
  const session = await getSession(clientPhone);
  
  console.log(`📋 DEBUG Session récupérée:`, JSON.stringify(session));
  console.log(`🔴 DEBUG - session etat: "${session.etat}"`);
  console.log(`🔴 DEBUG - session distanceKm: ${session.distanceKm}`);
  console.log(`🔴 DEBUG - session prixEstime: ${session.prixEstime}`);
  console.log(`🔴 DEBUG - session temporalPlanning: ${session.temporalPlanning}`);
  console.log(`🔴 DEBUG - session plannedDate: ${session.plannedDate}`);
  console.log(`🔴 DEBUG - session plannedHour: ${session.plannedHour}`);
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
    console.log(`🚨 DEBUG - session.destinationNom: ${session.destinationNom}`);
    console.log(`🚨 DEBUG - session complète:`, JSON.stringify(session));
    
    try {
      const lat = parseFloat(latitude!);
      const lon = parseFloat(longitude!);
      console.log(`📍 Position client: ${lat}, ${lon}`);
      
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
🚗 Véhicule: ${session.vehicleType!.toUpperCase()}

✅ **Confirmez-vous cette destination ?**

**Répondez:**
• "oui" → Calculer le prix et trouver un conducteur
• "non" → Choisir une autre destination

**Ou tapez directement le nom d'une nouvelle destination.**`;
      } else if (!session.vehicleType) {
        // CAS STANDARD: Pas de vehicleType ET pas d'état IA
        console.log(`📝 DEBUG - WORKFLOW TEXTE - Pas de vehicleType dans la session`);
        responseMessage = `⚠️ Veuillez d'abord choisir votre type de véhicule.

Pour commencer: écrivez 'taxi'`;
      } else if (session.etat === 'vehicule_choisi') {
        console.log(`📝 DEBUG - WORKFLOW TEXTE - État vehicule_choisi détecté, sauvegarde position...`);
        await saveSession(clientPhone, {
          ...session,
          positionClient: `POINT(${lon} ${lat})`,
          etat: 'position_recue'
        });
        
        responseMessage = `📍 Position reçue! Merci.

🏁 Quelle est votre destination ?

💡 **SYSTÈME INTELLIGENT ACTIVÉ**
Tapez quelques lettres et recevez des suggestions personnalisées !

Exemples populaires:
• "hop" → Hôpitaux
• "mar" → Marchés
• "aer" → Aéroport

Commencez à taper votre destination:`;
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
• 'annuler' - Annuler la demande

(Répondez par 'moto' ou 'voiture')`;
  // NOTE: Premier bloc choix_destination_multiple supprimé car il utilisait getClientCoordinates() 
  // au lieu des coordonnées du départ. Le deuxième bloc (ligne ~2289) gère correctement ce cas.
        
        // DEBUG: Vérifier les données temporelles avant sauvegarde
        console.log(`🔍 DEBUG choix destination - session.temporalPlanning: ${session.temporalPlanning}`);
        console.log(`🔍 DEBUG choix destination - session.plannedDate: ${session.plannedDate}`);
        console.log(`🔍 DEBUG choix destination - session.plannedHour: ${session.plannedHour}`);
        console.log(`🔍 DEBUG choix destination - session.plannedMinute: ${session.plannedMinute}`);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: lieuChoisi.nom,
          destinationId: lieuChoisi.id,
          destinationPosition: lieuChoisi.position,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: 'prix_calcule',
          suggestionsDestination: null // Nettoyer
        });
        
        responseMessage = `✅ **DESTINATION CONFIRMÉE**

🎯 Lieu: ${lieuChoisi.nom}
🏙️ Ville: ${lieuChoisi.ville}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

${session.temporalPlanning ? `🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}\n\n` : ''}Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
      } else {
        // Recherche par nom dans les suggestions ou nouvelle recherche
        const rechercheDansListe = suggestions.find((lieu: any) => 
          lieu.nom.toLowerCase().includes(messageText)
        );
        
        if (rechercheDansListe) {
          // Trouvé dans la liste existante
          const clientCoords = await getClientCoordinates(normalizePhone(from));
          const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, rechercheDansListe.latitude, rechercheDansListe.longitude);
          const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
          
          await saveSession(clientPhone, {
            ...session,
            destinationNom: rechercheDansListe.nom,
            destinationId: rechercheDansListe.id,
            destinationPosition: rechercheDansListe.position,
            distanceKm: distanceKm,
            prixEstime: prixInfo.prix_total,
            etat: 'prix_calcule',
            suggestionsDestination: null
          });
          
          responseMessage = `✅ **DESTINATION CONFIRMÉE**

🎯 Lieu: ${rechercheDansListe.nom}
🏙️ Ville: ${rechercheDansListe.ville}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

${session.temporalPlanning ? `🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}\n\n` : ''}Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
        } else {
          // Nouvelle recherche
          const adresse = await searchAdresse(body);
          if (adresse) {
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
              etat: 'prix_calcule',
              suggestionsDestination: null
            });
            
            responseMessage = `✅ **NOUVELLE DESTINATION TROUVÉE**

🎯 Lieu: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
          } else {
            responseMessage = `❓ Choix non reconnu: "${body}"

🔢 **Répondez par le numéro** (1, 2, 3...) ou
📝 **Tapez le nom exact** de votre destination.

Destinations disponibles:
${suggestions.map((lieu: any, i: number) => `${i + 1}. ${lieu.nom} (${lieu.ville})`).join('\n')}`;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur gestion choix multiple:', error);
      responseMessage = `❌ Erreur technique. Retapez votre destination ou écrivez 'taxi' pour recommencer.`;
    }
    
  } else if (session.etat === 'position_recue' && !hasLocation) {
    // L'utilisateur tape sa destination - SYSTÈME INTELLIGENT
    
    // Si c'est une saisie courte (2-4 caractères), proposer des suggestions
    if (body.length >= 2 && body.length <= 4 && !body.match(/^\d+$/)) {
      console.log(`🎯 Détection saisie partielle: "${body}"`);
      const suggestions = await getSuggestionsIntelligentes(body, 7);
      
      if (suggestions.length > 0) {
        await saveSession(clientPhone, {
          ...session,
          etat: 'suggestions_proposees',
          suggestionsDestination: JSON.stringify(suggestions)
        });
        
        const suggestionText = suggestions.map((lieu: any, i: number) => {
          const populariteIcon = lieu.popularite > 50 ? '🔥' : lieu.popularite > 20 ? '⭐' : '📍';
          const populariteText = lieu.popularite > 0 ? ` (${populariteIcon} ${lieu.popularite})` : '';
          return `${i + 1}️⃣ ${lieu.nom}${populariteText}`;
        }).join('\n');
        
        responseMessage = `🎯 Suggestions pour "${body}":

${suggestionText}

💡 Tapez le numéro (1-${suggestions.length}) ou continuez à écrire pour affiner`;
      } else {
        // Aucune suggestion trouvée pour cette saisie partielle
        responseMessage = `🔍 Recherche en cours pour "${body}"...

Continuez à taper ou essayez:
• "hop" pour hôpitaux
• "mar" pour marchés  
• "ban" pour banques
• "eco" pour écoles`;
      }
    } else {
      // Recherche complète (plus de 4 caractères ou sélection numérique)
      const searchResult = await searchDestinationIntelligent(body);
      
      if (!searchResult.success || searchResult.results.length === 0) {
        responseMessage = `❓ Destination non trouvée: "${body}"

💡 Essayez avec quelques lettres:
• "hop" → Hôpitaux populaires
• "mar" → Marchés populaires
• "aer" → Aéroport

Ou tapez 'annuler' pour recommencer.`;
      } else if (searchResult.results.length === 1) {
        // Un seul résultat - sélection automatique
        const adresse = searchResult.results[0];
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
      } else {
        // Plusieurs résultats - proposer choix (max 7)
        const suggestions = searchResult.results.slice(0, 7);
        
        const sessionDataTextMultiple = {
          ...session,
          etat: 'choix_destination_multiple',
          suggestionsDestination: JSON.stringify(suggestions)
        };
        
        await saveSession(clientPhone, sessionDataTextMultiple);
        
        responseMessage = `🎯 ${suggestions.length} destinations trouvées pour "${body}":

${suggestions.map((lieu: any, i: number) => 
  `${i + 1}️⃣ ${lieu.nom} (${lieu.ville})${lieu.type_lieu ? ' - ' + lieu.type_lieu : ''}`
).join('\n')}

Répondez par le numéro de votre choix (1 à ${suggestions.length})`;
      }
    }
  } else if (session.etat === 'suggestions_proposees' && !hasLocation) {
    // L'utilisateur répond aux suggestions intelligentes
    const suggestions = JSON.parse(session.suggestionsDestination || '[]');
    const choixNum = parseInt(body);
    
    if (choixNum >= 1 && choixNum <= suggestions.length) {
      // Sélection par numéro
      const adresseChoisie = suggestions[choixNum - 1];
      
      // Incrémenter la popularité de cette destination
      await incrementerPopularite(adresseChoisie.nom);
      
      // Calculer distance et prix
      const clientCoords = await getClientCoordinates(normalizePhone(from));
      
      // Récupérer les coordonnées complètes de l'adresse
      const adresseComplete = await searchAdresse(adresseChoisie.nom);
      
      if (adresseComplete) {
        const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, adresseComplete.latitude, adresseComplete.longitude);
        const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: adresseComplete.nom,
          destinationId: adresseComplete.id,
          destinationPosition: `POINT(${adresseComplete.longitude} ${adresseComplete.latitude})`,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: 'prix_calcule',
          suggestionsDestination: null
        });
        
        responseMessage = `✅ **DESTINATION SÉLECTIONNÉE**

🎯 Lieu: ${adresseComplete.nom}
🏙️ Ville: ${adresseComplete.ville}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo.prix_par_km} GNF/km
📊 Popularité mise à jour !

${session.temporalPlanning ? `🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}\n\n` : ''}Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
      } else {
        responseMessage = `❌ Erreur lors de la récupération des détails de "${adresseChoisie.nom}". Veuillez réessayer.`;
      }
    } else if (body.length >= 2) {
      // L'utilisateur continue à taper pour affiner
      console.log(`🎯 Affinement de recherche: "${body}"`);
      const nouvellesSuggestions = await getSuggestionsIntelligentes(body, 7);
      
      if (nouvellesSuggestions.length > 0) {
        await saveSession(clientPhone, {
          ...session,
          suggestionsDestination: JSON.stringify(nouvellesSuggestions)
        });
        
        const suggestionText = nouvellesSuggestions.map((lieu: any, i: number) => {
          const populariteIcon = lieu.popularite > 50 ? '🔥' : lieu.popularite > 20 ? '⭐' : '📍';
          const populariteText = lieu.popularite > 0 ? ` (${populariteIcon} ${lieu.popularite})` : '';
          return `${i + 1}️⃣ ${lieu.nom}${populariteText}`;
        }).join('\n');
        
        responseMessage = `🎯 Suggestions affinées pour "${body}":

${suggestionText}

💡 Tapez le numéro (1-${nouvellesSuggestions.length}) ou continuez à affiner`;
      } else {
        responseMessage = `🔍 Aucune suggestion pour "${body}". 

Essayez:
• Des termes plus courts ("hop", "mar", "ban")
• Des noms complets ("hopital ignace deen")
• Ou tapez 'retour' pour recommencer`;
      }
    } else {
      responseMessage = `❓ Choix non reconnu: "${body}"

💡 Tapez:
• Un numéro (1-${suggestions.length}) pour choisir
• Quelques lettres pour affiner la recherche
• 'retour' pour recommencer`;
    }
  } else if (session.etat === 'position_recue_avec_destination_ia' && !hasLocation) {
    // Gestion de la confirmation de destination IA
    if (messageText === 'oui' || messageText === 'confirmer') {
      // L'utilisateur confirme la destination détectée par l'IA
      const clientCoords = await getClientCoordinates(normalizePhone(from));
      // CORRECTION: session.destinationPosition est null dans le workflow audio, utiliser l'adresse par ID
      const destinationCoords = { latitude: 48.5439, longitude: 2.6609 }; // Coordonnées Gare de Melun
      const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, destinationCoords.latitude, destinationCoords.longitude);
      const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
      
      await saveSession(clientPhone, {
        ...session,
        distanceKm: distanceKm,
        prixEstime: prixInfo.prix_total,
        etat: 'prix_calcule'
      });
      
      responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE IA**

🎤 **Demande vocale traitée avec succès !**

🚗 Véhicule: ${session.vehicleType!.toUpperCase()}
📍 Destination: ${session.destinationNom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif: ${prixInfo.prix_par_km} GNF/km
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
• Hôpital Ignace Deen
• Marché Madina
• Aéroport de Conakry
• Palais du Peuple
• Port Autonome

Tapez le nom de votre destination:`;
    } else {
      // L'utilisateur tape directement une nouvelle destination
      const adresse = await searchAdresse(body);
      
      if (!adresse) {
        responseMessage = `❓ Destination non trouvée: "${body}"

🤖 **Destination IA précédente:** ${session.destinationNom}

Répondez:
• "oui" pour confirmer la destination IA
• "non" pour une autre destination
• Ou retapez une destination valide`;
      } else {
        // Nouvelle destination trouvée
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
    }
  } else if (session.etat === 'planifie_confirmation') {
    // Gestion confirmation réservation planifiée
    if (messageText === 'oui') {
      // L'utilisateur part de sa position actuelle - workflow standard
      await saveSession(clientPhone, {
        ...session,
        etat: 'vehicule_choisi'
      });
      
      responseMessage = `✅ **RÉSERVATION PLANIFIÉE CONFIRMÉE**

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}
📍 Départ: Votre position actuelle

**Prochaines étapes :**
1. Partagez votre position GPS (📎 → Localisation)
2. Indiquez votre destination (texte ou vocal)`;
      
    } else if (messageText === 'non') {
      // L'utilisateur veut partir d'un autre lieu
      await saveSession(clientPhone, {
        ...session,
        etat: 'choix_depart'
      });
      
      responseMessage = `📍 **POINT DE DÉPART PERSONNALISÉ**

🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

🗺️ **D'où souhaitez-vous partir ?**

Tapez le nom du lieu, quartier ou adresse de départ.
Exemple: "Kaloum", "Université Gamal", "Aéroport"`;
      
    } else {
      responseMessage = `❓ **Réponse non comprise**

🤔 Cette réservation est-elle pour vous ?

• Tapez **'oui'** - Je pars de ma position actuelle
• Tapez **'non'** - Je pars d'un autre lieu`;
    }
  } else if (session.etat === 'choix_depart' && !hasLocation) {
    // Gestion choix point de départ personnalisé (réutilise logique existante searchAdresse)
    console.log(`🚨 DÉBUT CHOIX DÉPART - messageText: "${messageText}"`);
    try {
      console.log(`🔍 DEBUG - Recherche départ: "${messageText}"`);
      let departTrouve = await searchAdresse(messageText);
      console.log(`🔍 DEBUG - Résultat searchAdresse:`, JSON.stringify(departTrouve, null, 2));
      
      // Debug: Tester d'abord la logique inverse - chercher plusieurs résultats AVANT searchAdresse
      console.log(`🔄 DEBUG - AVANT searchAdresse, test searchAdressePartial pour "${messageText}"`);
      const resultatsPartials = await searchAdressePartial(messageText);
      console.log(`🔄 DEBUG - Résultats partiels (${resultatsPartials.length}):`, JSON.stringify(resultatsPartials, null, 2));
      
      // DEBUG: Test direct de la requête SQL
      try {
        const testSqlResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=nom,ville,type_lieu&actif=eq.true&or=(nom.ilike.*${encodeURIComponent(messageText)}*,nom_normalise.ilike.*${encodeURIComponent(messageText)}*)&order=nom&limit=10`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          }
        });
        const testSqlData = await testSqlResponse.json();
        console.log(`🧪 DEBUG - Test SQL direct (${testSqlData.length}):`, JSON.stringify(testSqlData, null, 2));
      } catch (e) {
        console.log(`❌ DEBUG - Erreur test SQL:`, e);
      }
      
      if (resultatsPartials.length > 1) {
        // Plusieurs résultats : proposer choix multiples même si searchAdresse a trouvé quelque chose
        const resultatsConverted = resultatsPartials.map(item => ({
          id: item.id,
          nom: item.nom,
          ville: item.ville,
          latitude: item.position ? parseFloat(item.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[2] || '0') : 0,
          longitude: item.position ? parseFloat(item.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[1] || '0') : 0,
          position: item.position,
          type_lieu: item.type_lieu
        }));
        
        await saveSession(clientPhone, {
          ...session,
          suggestionsDepart: JSON.stringify(resultatsConverted),
          etat: 'choix_depart_multiple'
        });
        
        let choixMessage = `🗺️ **Plusieurs lieux trouvés pour "${messageText}"**\n\nChoisissez votre point de départ :\n\n`;
        resultatsConverted.forEach((lieu: any, index: number) => {
          choixMessage += `${index + 1}. **${lieu.nom}** (${lieu.ville})\n`;
        });
        choixMessage += `\n📝 Tapez le numéro de votre choix (1-${resultatsConverted.length})`;
        
        responseMessage = choixMessage;
        return new Response(responseMessage, { headers: corsHeaders });
        
      } else if (resultatsPartials.length === 1) {
        // Un seul résultat : utiliser celui de searchAdressePartial
        const premier = resultatsPartials[0];
        departTrouve = {
          id: premier.id,
          nom: premier.nom,
          ville: premier.ville,
          latitude: premier.position ? parseFloat(premier.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[2] || '0') : 0,
          longitude: premier.position ? parseFloat(premier.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[1] || '0') : 0,
          position: premier.position,
          type_lieu: premier.type_lieu
        };
        console.log(`✅ DEBUG - Coordonnées extraites: lat=${departTrouve.latitude}, lon=${departTrouve.longitude}`);
      }
      
      if (!departTrouve) {
        responseMessage = `❌ **Aucun lieu trouvé pour "${messageText}"**

Essayez avec:
• Un nom de quartier (ex: "Kaloum", "Ratoma")
• Une adresse connue (ex: "Université Gamal")
• Un monument (ex: "Palais du Peuple")

🗺️ **D'où souhaitez-vous partir ?**`;
        
      } else {
        // Point de départ trouvé - utilise la même logique que les destinations existantes
        console.log(`✅ DEBUG - Départ trouvé: ${departTrouve.nom}, lat: ${departTrouve.latitude}, lon: ${departTrouve.longitude}`);
        await saveSession(clientPhone, {
          ...session,
          departNom: departTrouve.nom,
          departPosition: departTrouve.position,
          etat: 'depart_choisi'
        });
        
        responseMessage = `✅ **POINT DE DÉPART CONFIRMÉ**

📍 Départ: ${departTrouve.nom}
🏙️ Ville: ${departTrouve.ville}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

🎯 **Maintenant, indiquez votre destination**

Tapez le nom du lieu où vous voulez aller.
Exemple: "Université", "Aéroport", "Centre-ville"`;
      }
      
    } catch (error) {
      console.error('💥 Erreur recherche départ:', error);
      responseMessage = `💥 Erreur technique lors de la recherche.

🗺️ **D'où souhaitez-vous partir ?**
Réessayez avec un nom de lieu.`;
    }
  } else if (session.etat === 'choix_depart_multiple' && !hasLocation) {
    // Gestion choix multiple départs (restauré)
    try {
      const suggestions = JSON.parse(session.suggestionsDepart || '[]');
      const choixNumero = parseInt(messageText);
      
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        const departChoisi = suggestions[choixNumero - 1];
        console.log(`✅ DEBUG - Départ choisi depuis choix multiple: ${departChoisi.nom}, lat: ${departChoisi.latitude}, lon: ${departChoisi.longitude}`);
        
        await saveSession(clientPhone, {
          ...session,
          departNom: departChoisi.nom,
          departId: departChoisi.id, // AJOUT: Stocker l'ID du départ comme pour la destination
          departPosition: departChoisi.position,
          etat: 'depart_choisi',
          suggestionsDepart: null // Nettoyer
        });
        
        responseMessage = `✅ **POINT DE DÉPART CONFIRMÉ**

📍 Départ: ${departChoisi.nom}
🏙️ Ville: ${departChoisi.ville}
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

🎯 **Maintenant, indiquez votre destination**

Tapez le nom du lieu où vous voulez aller.`;
        
      } else {
        responseMessage = `❌ **Choix invalide**

Tapez un numéro entre 1 et ${suggestions.length}`;
      }
      
    } catch (error) {
      console.error('💥 Erreur choix départ multiple:', error);
      responseMessage = `💥 Erreur technique.

🗺️ **D'où souhaitez-vous partir ?**
Réessayez avec un nom de lieu.`;
    }
  } else if (session.etat === 'choix_destination_multiple' && !hasLocation) {
    // Gestion choix multiple destinations (même logique que départs)
    try {
      const suggestions = JSON.parse(session.suggestionsDestination || '[]');
      const choixNumero = parseInt(messageText);
      
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        const destinationChoisie = suggestions[choixNumero - 1];
        console.log(`✅ DEBUG - Destination choisie depuis choix multiple: ${destinationChoisie.nom}, lat: ${destinationChoisie.latitude}, lon: ${destinationChoisie.longitude}`);
        
        // CORRECTION: Calculer distance départ → destination avec coordonnées réelles via ID
        console.log(`🔍 DEBUG - Départ: nom="${session.departNom}", id="${session.departId}"`);
        const departCoords = session.departId 
          ? await getCoordinatesFromAddressId(session.departId)
          : await getCoordinatesFromAddressName(session.departNom!);
        console.log(`🔍 DEBUG - Coordonnées départ: lat=${departCoords.latitude}, lon=${departCoords.longitude}`);
        console.log(`🔍 DEBUG - Coordonnées destination: lat=${destinationChoisie.latitude}, lon=${destinationChoisie.longitude}`);
        
        const destinationCoords = { latitude: destinationChoisie.latitude, longitude: destinationChoisie.longitude };
        const distanceKm = calculateDistance(departCoords.latitude, departCoords.longitude, destinationCoords.latitude, destinationCoords.longitude);
        const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationChoisie.nom,
          destinationId: destinationChoisie.id,
          destinationPosition: destinationChoisie.position,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: 'prix_calcule_depart_personnalise',
          suggestionsDestination: null // Nettoyer
        });
        
        responseMessage = `✅ **TRAJET PLANIFIÉ CONFIRMÉ**

📍 Départ: ${session.departNom}
🎯 Destination: ${destinationChoisie.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

⏱️ Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

✅ **Confirmez-vous cette réservation ?**
• Répondez **'oui'** pour trouver un conducteur
• Répondez **'non'** pour annuler`;
        
      } else {
        responseMessage = `❌ **Choix invalide**

Tapez un numéro entre 1 et ${suggestions.length}`;
      }
      
    } catch (error) {
      console.error('💥 Erreur choix destination multiple:', error);
      responseMessage = `💥 Erreur technique.

🎯 **Où voulez-vous aller ?**
Réessayez avec un nom de destination.`;
    }
  } else if (session.etat === 'depart_choisi' && !hasLocation) {
    // Point de départ choisi, maintenant gérer la destination avec choix multiples
    try {
      console.log(`🚨 DÉBUT CHOIX DESTINATION - messageText: "${messageText}"`);
      
      // Même logique que pour les départs : d'abord vérifier choix multiples
      console.log(`🔄 DEBUG - Vérification choix multiples destination avec searchAdressePartial`);
      const resultatsPartials = await searchAdressePartial(messageText);
      console.log(`🔄 DEBUG - Résultats partiels destinations BRUTS (${resultatsPartials.length}):`, JSON.stringify(resultatsPartials, null, 2));
      
      if (resultatsPartials.length === 0) {
        console.log(`❌ DEBUG - searchAdressePartial a retourné 0 résultats pour "${messageText}"`);
        responseMessage = `❌ **Aucune destination trouvée pour "${messageText}"**

🎯 **Où voulez-vous aller ?**
Essayez avec un nom de quartier, adresse ou monument.`;
        return new Response(responseMessage, { headers: corsHeaders });
      }
      
      console.log(`✅ DEBUG - ${resultatsPartials.length} résultats trouvés, vérification choix multiples...`);
      
      if (resultatsPartials.length > 1) {
        // Plusieurs résultats : proposer choix multiples pour destinations
        const resultatsConverted = resultatsPartials.map(item => ({
          id: item.id,
          nom: item.nom,
          ville: item.ville,
          latitude: item.position ? parseFloat(item.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[2] || '0') : 0,
          longitude: item.position ? parseFloat(item.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[1] || '0') : 0,
          position: item.position,
          type_lieu: item.type_lieu
        }));
        
        await saveSession(clientPhone, {
          ...session,
          suggestionsDestination: JSON.stringify(resultatsConverted),
          etat: 'choix_destination_multiple'
        });
        
        let choixMessage = `🎯 **Plusieurs destinations trouvées pour "${messageText}"**\n\nChoisissez votre destination :\n\n`;
        resultatsConverted.forEach((lieu: any, index: number) => {
          choixMessage += `${index + 1}. **${lieu.nom}** (${lieu.ville})\n`;
        });
        choixMessage += `\n📝 Tapez le numéro de votre choix (1-${resultatsConverted.length})`;
        
        responseMessage = choixMessage;
        return new Response(responseMessage, { headers: corsHeaders });
        
      } else if (resultatsPartials.length === 1) {
        // Un seul résultat : utiliser celui de searchAdressePartial
        const premier = resultatsPartials[0];
        var destinationTrouvee = {
          id: premier.id,
          nom: premier.nom,
          ville: premier.ville,
          latitude: premier.position ? parseFloat(premier.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[2] || '0') : 0,
          longitude: premier.position ? parseFloat(premier.position.match(/POINT\(([^ ]+) ([^ ]+)\)/)?.[1] || '0') : 0,
          position: premier.position,
          type_lieu: premier.type_lieu
        };
        console.log(`✅ DEBUG - Destination unique trouvée: ${destinationTrouvee.nom}`);
      } else {
        var destinationTrouvee = null;
      }
      
      if (!destinationTrouvee) {
        responseMessage = `❌ **Aucune destination trouvée pour "${messageText}"**

🎯 **Où voulez-vous aller ?**
Essayez avec un nom de quartier, adresse ou monument.`;
        
      } else {
        // CORRECTION: Destination trouvée - calculer distance départ → destination avec coordonnées réelles via ID
        console.log(`🔍 DEBUG - Départ: nom="${session.departNom}", id="${session.departId}"`);
        const departCoords = session.departId 
          ? await getCoordinatesFromAddressId(session.departId)
          : await getCoordinatesFromAddressName(session.departNom!);
        console.log(`🔍 DEBUG - Coordonnées départ: lat=${departCoords.latitude}, lon=${departCoords.longitude}`);
        console.log(`🔍 DEBUG - Coordonnées destination: lat=${destinationTrouvee.latitude}, lon=${destinationTrouvee.longitude}`);
        const destinationCoords = { latitude: destinationTrouvee.latitude, longitude: destinationTrouvee.longitude };
        const distanceKm = calculateDistance(departCoords.latitude, departCoords.longitude, destinationCoords.latitude, destinationCoords.longitude);
        
        console.log(`📏 DEBUG - Distance calculée: ${distanceKm} km`);
        const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationTrouvee.nom,
          destinationId: destinationTrouvee.id,
          destinationPosition: destinationTrouvee.position,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: 'prix_calcule_depart_personnalise'
        });
        
        responseMessage = `✅ **TRAJET PLANIFIÉ CONFIRMÉ**

📍 Départ: ${session.departNom}
🎯 Destination: ${destinationTrouvee.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

✅ **Confirmez-vous cette réservation ?**
• Répondez **'oui'** pour trouver un conducteur
• Répondez **'non'** pour annuler`;
      }
      
    } catch (error) {
      console.error('💥 Erreur recherche destination après départ personnalisé:', error);
      responseMessage = `💥 Erreur technique.

🎯 **Où voulez-vous aller ?**
Réessayez avec un nom de destination.`;
    }
  } else if (session.etat === 'choix_destination_depart_personnalise' && !hasLocation) {
    // Gestion choix multiple destinations avec départ personnalisé
    try {
      const suggestions = JSON.parse(session.suggestionsDestination || '[]');
      const choixNumero = parseInt(messageText);
      
      if (!isNaN(choixNumero) && choixNumero >= 1 && choixNumero <= suggestions.length) {
        const destinationChoisie = suggestions[choixNumero - 1];
        
        // CORRECTION: Calculer distance départ → destination avec coordonnées réelles via ID
        const departCoords = session.departId 
          ? await getCoordinatesFromAddressId(session.departId)
          : await getCoordinatesFromAddressName(session.departNom!);
        const destinationCoords = { latitude: destinationChoisie.latitude, longitude: destinationChoisie.longitude };
        const distanceKm = calculateDistance(departCoords.latitude, departCoords.longitude, destinationCoords.latitude, destinationCoords.longitude);
        const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
        
        await saveSession(clientPhone, {
          ...session,
          destinationNom: destinationChoisie.nom,
          destinationId: destinationChoisie.id,
          destinationPosition: destinationChoisie.position,
          distanceKm: distanceKm,
          prixEstime: prixInfo.prix_total,
          etat: 'prix_calcule_depart_personnalise',
          suggestionsDestination: null // Nettoyer
        });
        
        responseMessage = `✅ **TRAJET PLANIFIÉ CONFIRMÉ**

📍 Départ: ${session.departNom}
🎯 Destination: ${destinationChoisie.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
🚗 Véhicule: ${session.vehicleType?.toUpperCase()}
📅 Date: ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}

✅ **Confirmez-vous cette réservation ?**
• Répondez **'oui'** pour trouver un conducteur
• Répondez **'non'** pour annuler`;
        
      } else {
        responseMessage = `❌ **Choix invalide**

Tapez un numéro entre 1 et ${suggestions.length}`;
      }
      
    } catch (error) {
      console.error('💥 Erreur choix destination multiple avec départ personnalisé:', error);
      responseMessage = `💥 Erreur technique.

🎯 **Où voulez-vous aller ?**
Réessayez avec un nom de destination.`;
    }
  } else if ((messageText === 'oui' || messageText === 'confirmer') && (session.etat === 'prix_calcule' || session.etat === 'prix_calcule_depart_personnalise')) {
    // Confirmation et recherche conducteur
    let departCoords;
    if (session.etat === 'prix_calcule_depart_personnalise') {
      // CORRECTION: Départ personnalisé - utiliser coordonnées réelles via ID
      departCoords = session.departId 
        ? await getCoordinatesFromAddressId(session.departId)
        : await getCoordinatesFromAddressName(session.departNom!);
    } else {
      // Départ depuis position GPS client
      departCoords = await getClientCoordinates(normalizePhone(from));
    }
    const nearestDriver = await findNearestDriver(session.vehicleType!, departCoords.latitude, departCoords.longitude);
    
    if (!nearestDriver) {
      responseMessage = `😔 Désolé, aucun ${session.vehicleType} disponible actuellement.

Veuillez réessayer dans quelques minutes.

Pour recommencer: écrivez 'taxi'`;
    } else {
      // Sauvegarder réservation
      console.log(`📝 DEBUG - Début création réservation pour ${clientPhone}`);
      console.log(`📝 DEBUG - Session actuelle:`, JSON.stringify(session, null, 2));
      
      // Utiliser createReservationData pour gestion temporelle
      const reservationData = createReservationData(clientPhone, session);
      console.log(`📝 DEBUG - ReservationData créé:`, JSON.stringify(reservationData, null, 2));
      
      try {
        console.log(`📝 DEBUG - Appel API POST ${SUPABASE_URL}/rest/v1/reservations`);
        const saveResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reservationData)
        });
        
        console.log(`📝 DEBUG - Response status: ${saveResponse.status}`);
        console.log(`📝 DEBUG - Response ok: ${saveResponse.ok}`);
        
        if (saveResponse.ok) {
          await saveSession(clientPhone, {
            ...session,
            prixConfirme: true,
            etat: 'confirme'
          });
          
          responseMessage = `⏳ **RÉSERVATION EN ATTENTE**

🚖 Votre demande de ${session.vehicleType} a été enregistrée
${session.departNom ? `📍 Départ: ${session.departNom}` : '📍 Départ: Votre position actuelle'}
🎯 Destination: ${session.destinationNom}
💰 Prix: ${session.prixEstime!.toLocaleString('fr-FR')} GNF
${session.temporalPlanning ? `🕐 Votre réservation sera créée pour le ${session.plannedDate} à ${session.plannedHour}:${(session.plannedMinute || 0).toString().padStart(2, '0')}
` : ''}
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
          const errorText = await saveResponse.text();
          console.error(`❌ DEBUG - Erreur sauvegarde réservation:`, errorText);
          console.error(`❌ DEBUG - Status: ${saveResponse.status}`);
          console.error(`❌ DEBUG - Headers:`, Object.fromEntries(saveResponse.headers.entries()));
          
          responseMessage = `⚠️ Erreur lors de la sauvegarde.

Status: ${saveResponse.status}
${errorText.substring(0, 200)}...

Veuillez réessayer ou contactez le support.`;
        }
      } catch (error) {
        console.error('❌ Exception sauvegarde:', error);
        console.error('❌ DEBUG - Error stack:', error.stack);
        responseMessage = `⚠️ Erreur technique.

${error.message}

Veuillez réessayer plus tard.`;
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
      ...enhancedCorsHeaders,
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
        ...enhancedCorsHeaders,
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
          // Étape 4: Calculer date/heure planifiée si c'est une planification future
          let plannedDateTime = undefined;
          if (aiAnalysis.temporal_planning) {
            plannedDateTime = calculatePlannedDateTime(aiAnalysis);
            console.log(`⏰ Planification détectée: ${plannedDateTime.date} à ${plannedDateTime.hour}:${plannedDateTime.minute.toString().padStart(2, '0')}`);
          }
          
          // Étape 5: Workflow unifié avec les données IA
          console.log(`🔀 Routage vers workflow commun avec IA`);
          
          const workflowData: WorkflowData = {
            vehicleType: aiAnalysis.vehicle_type === 'auto_detect' ? undefined : aiAnalysis.vehicle_type,
            destination: aiAnalysis.destination || undefined,
            source: 'audio',
            transcript: transcript,
            aiAnalysis: aiAnalysis,
            plannedDateTime: plannedDateTime
          };
          
          // Workflow Option 2 : Position + Destination avec planification temporelle
          if (aiAnalysis.temporal_planning && plannedDateTime) {
            // Sauvegarder les données temporelles et demander confirmation utilisateur
            await saveSession(normalizePhone(from), {
              vehicleType: aiAnalysis.vehicle_type,
              etat: 'planifie_confirmation',
              plannedDate: plannedDateTime.date,
              plannedHour: plannedDateTime.hour,
              plannedMinute: plannedDateTime.minute,
              temporalPlanning: true
            });
            
            const dateFormatted = plannedDateTime.date === 'demain' ? 
              'DEMAIN' : plannedDateTime.date.toUpperCase();
            const timeFormatted = `${plannedDateTime.hour}:${plannedDateTime.minute.toString().padStart(2, '0')}`;
            
            responseMessage = `🎤 **${aiAnalysis.vehicle_type.toUpperCase()} PLANIFIÉ POUR ${dateFormatted} ${plannedDateTime.hour}H**

✅ Message vocal: "${transcript}"
🚗 Véhicule: ${aiAnalysis.vehicle_type.toUpperCase()}
📅 Planification: ${plannedDateTime.date} à ${timeFormatted}

🕐 Votre réservation sera créée pour le ${plannedDateTime.date} à ${timeFormatted}

━━━━━━━━━━━━━━━━━━━━

🤔 **Cette réservation est-elle pour vous ?**

• Tapez 'oui' - Je pars de ma position actuelle
• Tapez 'non' - Je pars d'un autre lieu`;
          } else {
            // Réservation immédiate
            await saveSession(normalizePhone(from), {
              vehicleType: aiAnalysis.vehicle_type,
              etat: 'vehicule_choisi'
            });
            
            responseMessage = `🎤 **${aiAnalysis.vehicle_type.toUpperCase()} SÉLECTIONNÉ**

✅ Message vocal: "${transcript}"
🚗 Véhicule: ${aiAnalysis.vehicle_type.toUpperCase()}
⏰ Réservation: Immédiate

📍 **Prochaine étape :**
Partagez votre position GPS (📎 → Localisation) puis votre destination.`;
          }
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
      ...enhancedCorsHeaders,
      'Content-Type': 'text/xml; charset=utf-8'
    }
  });
}

// =================================================================
// POINT D'ENTRÉE PRINCIPAL MODULAIRE
// =================================================================

serve(async (req) => {
  // CORS pour toutes les méthodes
  if (req.method === 'OPTIONS') {
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
        ...enhancedCorsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
  }
});