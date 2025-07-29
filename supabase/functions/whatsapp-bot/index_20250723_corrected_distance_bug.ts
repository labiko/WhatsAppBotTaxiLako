import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
// Utilisation de la clé API service_role (doit être récupérée depuis Settings > API Keys)
// ATTENTION: Cette clé pourrait avoir expiré, aller dans Dashboard → Settings → API Keys pour la nouvelle
// Clé API service_role confirmée (2025-07-22 18:30)
// Clé service_role vérifiée depuis Dashboard (2025-07-22 18:45)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';
// Clé anon (publique) récupérée depuis Dashboard (2025-07-22 18:45)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';
// Sessions maintenant stockées dans Supabase au lieu de la mémoire
let workingApiKey = SUPABASE_SERVICE_KEY // Par défaut on essaie service_role
;
const normalizePhone = (phone)=>{
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim();
};
// Fonction de retry avec backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  for(let i = 0; i < maxRetries; i++){
    try {
      console.log(`🔄 Tentative ${i + 1}/${maxRetries}: ${url}`);
      const response = await fetch(url, options);
      if (response.status === 503) {
        console.log(`⏳ Service indisponible (503), retry dans ${(i + 1) * 1000}ms...`);
        if (i < maxRetries - 1) {
          await new Promise((resolve)=>setTimeout(resolve, (i + 1) * 1000));
          continue;
        }
      }
      return response;
    } catch (error) {
      console.log(`❌ Erreur tentative ${i + 1}: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve)=>setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error('Max retries reached');
}
// Fonction pour inspecter la structure de la table conducteurs
async function inspectConducteursTable() {
  try {
    console.log('🔍 Inspection de la table conducteurs...');
    // 1. Compter le nombre total de conducteurs
    const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    if (countResponse.ok) {
      const countData = await countResponse.text();
      console.log('📊 Nombre total de conducteurs:', countData);
    }
    // 2. Récupérer un échantillon de conducteurs pour voir la structure
    const sampleResponse = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=*&limit=2`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    if (sampleResponse.ok) {
      const sampleData = await sampleResponse.json();
      console.log('📋 Échantillon conducteurs (2 premiers):');
      sampleData.forEach((c, index)=>{
        console.log(`   ${index + 1}. ID: ${c.id}`);
        console.log(`      Nom: ${c.prenom} ${c.nom}`);
        console.log(`      Téléphone: ${c.telephone}`);
        console.log(`      Type véhicule: ${c.vehicle_type}`);
        console.log(`      Statut: ${c.statut}`);
        console.log(`      Position: ${JSON.stringify(c.position_actuelle)}`);
        console.log(`      Autres champs: ${Object.keys(c).join(', ')}`);
        console.log('      ---');
      });
    }
    // 3. Compter par type de véhicule
    const motoCount = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?vehicle_type=eq.moto&select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    const voitureCount = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?vehicle_type=eq.voiture&select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    if (motoCount.ok && voitureCount.ok) {
      const motoData = await motoCount.text();
      const voitureData = await voitureCount.text();
      console.log('🏍️ Conducteurs moto:', motoData);
      console.log('🚗 Conducteurs voiture:', voitureData);
    }
    // 4. Compter par statut
    const disponibleCount = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?statut=eq.disponible&select=count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    if (disponibleCount.ok) {
      const dispData = await disponibleCount.text();
      console.log('✅ Conducteurs disponibles:', dispData);
    }
  } catch (error) {
    console.error('❌ Erreur inspection table:', error);
  }
}
// Test de connexion Supabase avec fallback vers les deux clés
async function testDatabaseConnection() {
  console.log('🔄 Test de connexion Supabase...');
  // Test 1: avec clé service_role
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
      // Inspecter la table une fois connecté
      await inspectConducteursTable();
      return {
        connected: true,
        status: response1.status
      };
    } else {
      const errorText = await response1.text();
      console.log(`❌ Service_role failed (${response1.status}):`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.log(`💥 Service_role exception:`, error.message);
  }
  // Test 2: avec clé anon (si service_role échoue)
  if (SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.PLACEHOLDER') {
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
        console.log(`❌ Anon failed (${response2.status}):`, errorText.substring(0, 200));
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
  return {
    connected: false,
    error: 'Toutes les clés ont échoué',
    status: 401
  };
}
// Fonction pour sauvegarder la session dans Supabase
async function saveSession(phone, data) {
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
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 heure
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

    // Si erreur 409 (duplicate), faire un UPDATE au lieu d'INSERT
    if (response.status === 409) {
      console.log(`🔄 Session existe, mise à jour pour ${phone}`);
      const updateData = { ...sessionData };
      delete updateData.client_phone; // Ne pas mettre à jour la clé primaire
      
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
      } else {
        const errorText = await updateResponse.text();
        console.error(`❌ Erreur mise à jour session: ${updateResponse.status} - ${errorText}`);
      }
      return;
    }

    if (response.ok) {
      console.log(`💾 Session sauvée: ${phone} → État: ${data.etat}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Erreur sauvegarde session: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Exception sauvegarde session: ${error.message}`);
  }
}

// Fonction pour récupérer la session depuis Supabase
async function getSession(phone) {
  try {
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(phone)}&expires_at=gte.${new Date().toISOString()}`, {
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const sessions = await response.json();
      if (sessions.length > 0) {
        const session = sessions[0];
        return {
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
      }
    } else {
      console.error(`❌ Erreur récupération session: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Exception récupération session: ${error.message}`);
  }
  
  return {};
}

// Fonction pour extraire les coordonnées client depuis PostGIS
async function getClientCoordinates(sessionPhone) {
  if (!sessionPhone) {
    console.log('❌ sessionPhone manquant pour extraction coordonnées');
    return { latitude: 0, longitude: 0 };
  }
  
  try {
    console.log(`🔍 Extraction coordonnées pour session: ${sessionPhone}`);
    
    // CORRIGÉ: Utiliser directement une requête REST avec PostGIS au lieu de la fonction RPC défaillante
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(sessionPhone)}&select=position_client&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const sessions = await response.json();
      console.log(`🔎 DEBUG coordonnées client depuis PostGIS:`);
      
      if (sessions.length > 0 && sessions[0].position_client) {
        console.log(`   session.positionClient (binaire): ${sessions[0].position_client}`);
        
        // Utiliser une requête séparée pour extraire les coordonnées avec ST_X et ST_Y
        const coordsResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(sessionPhone)}&select=ST_Y(position_client::geometry)%20as%20latitude,ST_X(position_client::geometry)%20as%20longitude&limit=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });
        
        if (coordsResponse.ok) {
          const coords = await coordsResponse.json();
          if (coords.length > 0) {
            const lat = parseFloat(coords[0].latitude) || 0;
            const lon = parseFloat(coords[0].longitude) || 0;
            
            console.log(`   clientLatitude extraite: ${lat}`);
            console.log(`   clientLongitude extraite: ${lon}`);
            
            if (lat !== 0 && lon !== 0) {
              console.log(`✅ Coordonnées extraites avec succès: lat=${lat}, lon=${lon}`);
              return { latitude: lat, longitude: lon };
            }
          }
        }
      }
    }
    
    console.log(`⚠️ Extraction PostGIS échouée, coordonnées par défaut (0,0)`);
    return { latitude: 0, longitude: 0 };
  } catch (error) {
    console.error(`❌ Erreur extraction coordonnées: ${error.message}`);
    return { latitude: 0, longitude: 0 };
  }
}

// Fonction pour nettoyer les sessions expirées dans Supabase
async function cleanExpiredSessions() {
  try {
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/clean_expired_sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('🧹 Sessions expirées nettoyées');
    }
  } catch (error) {
    console.error(`❌ Erreur nettoyage sessions: ${error.message}`);
  }
}
// Récupérer les conducteurs disponibles depuis Supabase avec la clé qui fonctionne
async function getAvailableDrivers(vehicleType) {
  try {
    console.log(`🔍 Recherche conducteurs ${vehicleType} avec clé: ${workingApiKey === SUPABASE_ANON_KEY ? 'anon' : 'service_role'}`);
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/conducteurs_with_coords?vehicle_type=eq.${vehicleType}&statut=eq.disponible&select=*`, {
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log(`📡 Statut requête conducteurs: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur: ${response.status} - ${errorText}`);
      throw new Error(`Erreur API: ${response.status} - ${errorText}`);
    }
    const conducteurs = await response.json();
    console.log(`📋 ${conducteurs.length} conducteur(s) ${vehicleType} trouvé(s) dans la base`);
    if (conducteurs.length === 0) {
      console.log(`⚠️ Aucun conducteur ${vehicleType} disponible dans la table`);
    }
    return conducteurs;
  } catch (error) {
    console.error('❌ Exception récupération conducteurs:', error);
    throw error;
  }
}
// Calcul de distance avec Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  console.log(`🧮 DEBUG calculateDistance - ENTRÉE:`);
  console.log(`   lat1 (client): ${lat1}`);
  console.log(`   lon1 (client): ${lon1}`);
  console.log(`   lat2 (destination): ${lat2}`);
  console.log(`   lon2 (destination): ${lon2}`);
  
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  console.log(`🧮 DEBUG calculateDistance - CALCULS:`);
  console.log(`   dLat: ${dLat}`);
  console.log(`   dLon: ${dLon}`);
  console.log(`   lat1Rad: ${lat1Rad}`);
  console.log(`   lat2Rad: ${lat2Rad}`);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const result = R * c;
  
  console.log(`🧮 DEBUG calculateDistance - RÉSULTAT: ${result} km`);
  
  return result;
}
// Trouver le conducteur le plus proche depuis la table Supabase
async function findNearestDriver(vehicleType, clientLat, clientLng) {
  console.log(`🎯 Recherche conducteur ${vehicleType} près de ${clientLat}, ${clientLng}`);
  try {
    const conducteurs = await getAvailableDrivers(vehicleType);
    if (conducteurs.length === 0) {
      console.log(`❌ Aucun conducteur ${vehicleType} disponible dans la table 'conducteurs'`);
      return null;
    }
    let nearestDriver = null;
    let minDistance = Infinity;
    let validDriversCount = 0;
    console.log(`📐 Calcul distances pour ${conducteurs.length} conducteur(s)...`);
    for (const conducteur of conducteurs){
      // Utiliser les coordonnées extraites par ST_X et ST_Y
      const driverLat = conducteur.latitude;
      const driverLng = conducteur.longitude;
      
      if (driverLat && driverLng && !isNaN(driverLat) && !isNaN(driverLng)) {
        validDriversCount++;
        const distance = calculateDistance(clientLat, clientLng, driverLat, driverLng);
        console.log(`   ${conducteur.prenom} ${conducteur.nom}: ${distance.toFixed(1)} km (${driverLat}, ${driverLng})`);
        if (distance < minDistance) {
          minDistance = distance;
          nearestDriver = {
            ...conducteur,
            distance
          };
        }
      } else {
        console.log(`⚠️ Coordonnées manquantes pour ${conducteur.prenom} ${conducteur.nom}: lat=${driverLat}, lng=${driverLng}`);
      }
    }
    console.log(`📊 ${validDriversCount}/${conducteurs.length} conducteurs avec position GPS valide`);
    if (nearestDriver) {
      const distanceKm = nearestDriver.distance.toFixed(1);
      console.log(`🏆 Sélectionné: ${nearestDriver.prenom} ${nearestDriver.nom} à ${distanceKm} km`);
      return nearestDriver;
    } else {
      console.log(`❌ Aucun conducteur avec position GPS valide trouvé`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche de conducteur:`, error);
    return null;
  }
}
// Fonction pour rechercher une adresse par nom
async function searchAdresse(searchTerm) {
  try {
    console.log(`🔍 Recherche adresse: "${searchTerm}"`);
    
    // Appeler la fonction SQL search_adresse
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
      const errorText = await response.text();
      console.error(`❌ Erreur recherche adresse: ${response.status} - ${errorText}`);
      return null;
    }
    
    const adresses = await response.json();
    console.log(`📍 ${adresses.length} adresse(s) trouvée(s)`);
    
    if (adresses.length > 0) {
      // Retourner la première adresse (meilleure correspondance)
      return adresses[0];
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Exception recherche adresse: ${error.message}`);
    return null;
  }
}

// Fonction pour calculer le prix d'une course
async function calculerPrixCourse(vehicleType, distanceKm) {
  try {
    console.log(`💰 Calcul prix: ${vehicleType}, ${distanceKm}km`);
    
    // Appeler la fonction SQL calculer_prix_course
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
      const errorText = await response.text();
      console.error(`❌ Erreur calcul prix: ${response.status} - ${errorText}`);
      
      // Tarif par défaut si erreur
      const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
      const prixTotal = Math.ceil(distanceKm * tarifDefaut / 1000) * 1000;
      return {
        prix_total: prixTotal,
        prix_par_km: tarifDefaut,
        tarif_applique: 'Tarif par défaut'
      };
    }
    
    const resultats = await response.json();
    if (resultats.length > 0) {
      return resultats[0];
    }
    
    // Fallback si pas de résultat
    const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
    const prixTotal = Math.ceil(distanceKm * tarifDefaut / 1000) * 1000;
    return {
      prix_total: prixTotal,
      prix_par_km: tarifDefaut,
      tarif_applique: 'Tarif par défaut'
    };
  } catch (error) {
    console.error(`❌ Exception calcul prix: ${error.message}`);
    
    // Tarif par défaut en cas d'erreur
    const tarifDefaut = vehicleType === 'moto' ? 3000 : 4000;
    const prixTotal = Math.ceil(distanceKm * tarifDefaut / 1000) * 1000;
    return {
      prix_total: prixTotal,
      prix_par_km: tarifDefaut,
      tarif_applique: 'Tarif par défaut (erreur)'
    };
  }
}

serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    // Vérifier le Content-Type pour éviter l'erreur lors des tests directs
    const contentType = req.headers.get('Content-Type') || '';
    
    let from = '';
    let body = '';
    let latitude = '';
    let longitude = '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Requête Twilio normale avec FormData
      const formData = await req.formData();
      from = formData.get('From')?.toString() || '';
      body = formData.get('Body')?.toString()?.trim() || '';
      latitude = formData.get('Latitude')?.toString() || '';
      longitude = formData.get('Longitude')?.toString() || '';
    } else {
      // Test direct de l'URL ou autre type de requête
      body = 'test';
      from = 'test';
    }
    const clientPhone = normalizePhone(from);
    const messageText = body.toLowerCase();
    const hasLocation = latitude && longitude && latitude !== '' && longitude !== '';
    console.log(`📱 ${clientPhone} | 💬 "${body}" | 📍 ${hasLocation ? 'oui' : 'non'}`);
    // Test de connexion au début
    console.log('🔄 Test connexion base de données...');
    const dbTest = await testDatabaseConnection();
    
    // Récupérer la session en cours
    const session = await getSession(clientPhone);
    console.log(`📋 Session état: ${session.etat || 'aucune'}`);
    
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
    } else if (messageText.includes('taxi')) {
      // PRIORITÉ: Vérifier d'abord si l'utilisateur veut recommencer
      // Nettoyer toute session existante avant de recommencer
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
      
      // Créer une nouvelle session
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
      // L'utilisateur a partagé sa position et tape maintenant sa destination
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
        // Calculer la distance entre position client et destination
        // Extraire les coordonnées depuis le format PostGIS
        const clientCoords = await getClientCoordinates(from);
        const clientLat = clientCoords.latitude;
        const clientLon = clientCoords.longitude;
          
        // 🔍 DEBUG LOGS - Tracer les coordonnées exactes
        console.log(`🔎 DEBUG coordonnées client depuis PostGIS:`);
        console.log(`   session.positionClient (binaire): ${session.positionClient}`);
        console.log(`   clientLatitude extraite: ${clientLat}`);
        console.log(`   clientLongitude extraite: ${clientLon}`);
        
        console.log(`🔍 DEBUG destination adresse:`, JSON.stringify(adresse));
        console.log(`📍 DEBUG destination - latitude: ${adresse.latitude}, longitude: ${adresse.longitude}`);
        
        // CORRECTION: Inverser l'ordre lat/lon pour calculateDistance(lat1, lon1, lat2, lon2)
        const distanceKm = calculateDistance(clientLat, clientLon, adresse.latitude, adresse.longitude);
        
        // Calculer le prix
        const prixInfo = await calculerPrixCourse(session.vehicleType, distanceKm);
        
        // Sauvegarder les infos dans la session
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

🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${adresse.nom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**

ℹ️ Tarif appliqué: ${prixInfo.prix_par_km} GNF/km

Confirmez-vous cette réservation ?
• Répondez 'oui' pour confirmer
• Répondez 'non' pour annuler`;
      }
    } else if ((messageText === 'oui' || messageText === 'confirmer') && session.etat === 'prix_calcule') {
      // L'utilisateur confirme le prix, on cherche le conducteur
      // Extraire les coordonnées depuis le format PostGIS
      const clientCoords = await getClientCoordinates(from);
      const clientLat = clientCoords.latitude;
      const clientLon = clientCoords.longitude;
        
      const nearestDriver = await findNearestDriver(session.vehicleType, clientLat, clientLon);
      
      if (!nearestDriver) {
        responseMessage = `😔 Désolé, aucun ${session.vehicleType} disponible actuellement.

Veuillez réessayer dans quelques minutes.

Pour recommencer: écrivez 'taxi'`;
      } else {
        const etaMinutes = Math.max(5, Math.round(nearestDriver.distance * 3));
        
        // Sauvegarder la réservation
        const reservationData = {
          client_phone: clientPhone,
          conducteur_id: nearestDriver.id,
          vehicle_type: session.vehicleType,
          position_depart: session.positionClient,
          destination_nom: session.destinationNom,
          destination_id: session.destinationId,
          position_arrivee: session.destinationPosition,
          distance_km: session.distanceKm,
          prix_total: session.prixEstime,
          statut: 'confirmee'
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
            // Mise à jour session
            await saveSession(clientPhone, {
              ...session,
              prixConfirme: true,
              etat: 'confirme'
            });
            
            responseMessage = `✅ **RÉSERVATION CONFIRMÉE!**

🚖 **Conducteur assigné:**
👤 ${nearestDriver.prenom} ${nearestDriver.nom}
📱 ${nearestDriver.telephone}
🚗 ${nearestDriver.vehicle_couleur} ${nearestDriver.vehicle_marque} ${nearestDriver.vehicle_modele}
🔢 Plaque: ${nearestDriver.vehicle_plaque}
⏱️ Arrivée dans: ${etaMinutes} minutes
⭐ Note: ${nearestDriver.note_moyenne}/5

💰 **Prix confirmé: ${session.prixEstime.toLocaleString('fr-FR')} GNF**
📍 Destination: ${session.destinationNom}

Le conducteur vous contactera dans quelques instants.

Bon voyage! 🚗`;
            
            // Nettoyer la session
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
      // L'utilisateur refuse le prix
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
        // Vérifier d'abord s'il y a des conducteurs disponibles
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
    } else if (hasLocation) {
      try {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        console.log(`📍 Position client: ${lat}, ${lon} (lat, lon)`);
        console.log(`🔍 Session: ${JSON.stringify(session)}`);
        if (!session.vehicleType) {
          responseMessage = `⚠️ Veuillez d'abord choisir votre type de véhicule.

Pour commencer: écrivez 'taxi'`;
        } else if (session.etat === 'vehicule_choisi') {
          // Première fois qu'on reçoit la position, demander la destination
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
          // Gérer les autres états de session si nécessaire
          responseMessage = `⚠️ État de session invalide.

Pour recommencer: écrivez 'taxi'`;
        }
      } catch (error) {
        console.error('💥 Erreur traitement:', error);
        responseMessage = `💥 Erreur technique.

${error.message}
Pour recommencer: écrivez 'taxi'`;
      }
    } else if (messageText.includes('annuler')) {
      responseMessage = `❌ Réservation annulée.

Pour une nouvelle demande: écrivez 'taxi'`;
    } else {
      responseMessage = `🚕 Bienvenue chez LokoTaxi Conakry!

Pour commencer votre réservation:
📝 Écrivez 'taxi'

Service disponible 24h/24`;
    }
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;
    console.log(`📤 Réponse: ${responseMessage.substring(0, 100)}...`);
    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    });
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
