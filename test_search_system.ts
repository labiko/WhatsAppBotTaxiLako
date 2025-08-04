/**
 * SCRIPT DE TEST UNITAIRE - SYSTÈME DE RECHERCHE BOT V2
 * 
 * Teste exactement la même implémentation que le bot pour identifier
 * pourquoi "station shell lambayi" trouve "Station Shell" au lieu de "Station Shell Lambanyi"
 */

// Configuration Supabase (exactement comme le bot)
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';
const GOOGLE_PLACES_API_KEY = '';
const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

let workingApiKey = SUPABASE_SERVICE_KEY;

// ===== FONCTIONS UTILITAIRES (copiées du bot) =====

async function fetchWithRetry(url: string, options: any, maxRetries: number = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxRetries}: ${url}`);
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Toutes les tentatives ont échoué');
}

// ===== FONCTIONS DE RECHERCHE (copiées exactement du bot) =====

async function searchAdressePartial(keyword: string): Promise<any[]> {
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
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/rpc/execute_fuzzy_search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ search_query: keyword.toLowerCase() })
    });
    
    let adresses = [];
    
    if (!response.ok) {
      console.log(`⚠️ RPC fuzzy non disponible, fallback vers ilike amélioré`);
      
      // Fallback amélioré: recherche plus flexible avec variations courantes
      // CORRECTION: Trier par longueur de nom DESC pour privilégier les noms complets
      // CORRECTION ENCODAGE: Ne pas encoder les caractères spéciaux dans les paramètres ILIKE
      const keywordEncoded = keyword.toLowerCase().replace(/ /g, '%20');
      const fallbackResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,longitude,latitude,position&actif=eq.true&or=(nom_normalise.ilike.*${keyword.toLowerCase()}*,nom.ilike.*${keyword.toLowerCase()}*)&order=nom&limit=10`, {
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
    } else {
      adresses = await response.json();
    }
    
    console.log(`🎯 ${adresses.length} résultat(s) fuzzy pour "${keyword}"`);
    
    // Log détaillé des résultats
    adresses.forEach((addr: any, index: number) => {
      console.log(`  ${index + 1}. "${addr.nom}" (ID: ${addr.id?.substring(0, 8)}..., Score: ${addr.score || 'N/A'})`);
    });
    
    // Si aucun résultat avec la recherche locale, appeler Google Places API
    if (adresses.length === 0) {
      console.log(`🌐 Aucun résultat local, tentative Google Places API...`);
      const googleResults = await searchGooglePlacesFallback(keyword);
      return googleResults;
    }
    
    // OPTIMISATION : Les coordonnées sont déjà pré-calculées dans adresses_with_coords
    return adresses.map((addr: any) => ({
      id: addr.id,
      nom: addr.nom,
      ville: addr.ville,
      type_lieu: addr.type_lieu,
      latitude: addr.latitude || 0,  // Déjà calculé par PostgreSQL
      longitude: addr.longitude || 0,  // Déjà calculé par PostgreSQL
      position: addr.position,
      score: addr.score || 1.0  // Score de similarité si disponible
    }));
    
  } catch (error) {
    console.error(`💥 Exception recherche fuzzy: ${error.message}`);
    return [];
  }
}

async function searchGooglePlacesFallback(keyword: string): Promise<any[]> {
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
    return data.results.slice(0, 3).map((place: any, index: number) => ({
      id: `google_${index}_${Date.now()}`, // ID temporaire unique
      nom: place.name,
      ville: 'Conakry', // Supposé car recherche focalisée
      type_lieu: place.types?.[0] || 'establishment',
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      position: null, // Google ne fournit pas au format PostGIS
      source: 'google_places', // Marqueur pour distinction
      address: place.formatted_address,
      rating: place.rating || null,
      score: 0.8 // Score artificiel pour Google (considéré comme pertinent)
    }));
    
  } catch (error) {
    console.error(`💥 Exception Google Places: ${error.message}`);
    return [];
  }
}

async function searchAdresse(searchTerm: string): Promise<any> {
  try {
    console.log(`🔍 RECHERCHE INTELLIGENTE: "${searchTerm}"`);
    
    // Simuler l'import du service de recherche (pas disponible dans le test)
    // On utilise directement searchAdressePartial comme fallback
    console.log(`⚠️ Service de recherche intelligent non disponible, utilisation fallback`);
    
    const results = await searchAdressePartial(searchTerm);
    
    if (results && results.length > 0) {
      const result = results[0]; // Premier résultat
      console.log(`📍 RECHERCHE INTELLIGENTE - Trouvé: ${result.nom} (Source: database_partial) [Score: ${result.score || 'N/A'}]`);
      return result;
    }
    
    console.log(`❌ RECHERCHE INTELLIGENTE - Aucun résultat pour: "${searchTerm}"`);
    return null;
  } catch (error) {
    console.error(`❌ Exception recherche intelligente: ${error.message}`);
    return null;
  }
}

// ===== FONCTIONS DE TEST =====

async function testAuthentification(): Promise<boolean> {
  console.log('\n🔑 === TEST AUTHENTIFICATION ===');
  
  try {
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Authentification service_role OK');
      return true;
    } else {
      console.log('❌ Authentification service_role échouée, test avec anon key');
      workingApiKey = SUPABASE_ANON_KEY;
      
      const anonResponse = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses?select=count&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (anonResponse.ok) {
        console.log('✅ Authentification anon OK');
        return true;
      } else {
        console.log('❌ Authentification anon échouée également');
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Erreur authentification: ${error.message}`);
    return false;
  }
}

async function testVueAdressesWithCoords(): Promise<boolean> {
  console.log('\n📊 === TEST VUE adresses_with_coords ===');
  
  try {
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,latitude,longitude&nom=ilike.*shell*&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Vue accessible: ${data.length} stations Shell trouvées`);
      
      // Afficher les stations Shell spécifiques
      data.forEach((addr: any) => {
        if (addr.nom.toLowerCase().includes('lamban')) {
          console.log(`🎯 TROUVÉ: "${addr.nom}" (${addr.latitude}, ${addr.longitude})`);
        }
      });
      
      return true;
    } else {
      console.log(`❌ Vue non accessible: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur test vue: ${error.message}`);
    return false;
  }
}

async function testCasSpecifique(): Promise<void> {
  console.log('\n🎯 === TEST CAS SPÉCIFIQUE: "station shell lambayi" ===');
  
  const searchTerm = 'station shell lambayi';
  
  console.log(`\n--- TEST searchAdressePartial("${searchTerm}") ---`);
  const partialResults = await searchAdressePartial(searchTerm);
  
  console.log(`\n--- TEST searchAdresse("${searchTerm}") ---`);
  const mainResult = await searchAdresse(searchTerm);
  
  console.log('\n📋 === RÉSUMÉ DES RÉSULTATS ===');
  console.log(`Recherche partielle: ${partialResults.length} résultat(s)`);
  partialResults.forEach((result, index) => {
    console.log(`  ${index + 1}. "${result.nom}" (${result.latitude}, ${result.longitude})`);
  });
  
  if (mainResult) {
    console.log(`Recherche principale: "${mainResult.nom}" (${mainResult.latitude}, ${mainResult.longitude})`);
    
    // Vérification du problème
    if (mainResult.nom === 'Station Shell') {
      console.log('❌ PROBLÈME CONFIRMÉ: Bot trouve "Station Shell" au lieu de "Station Shell Lambanyi"');
    } else if (mainResult.nom === 'Station Shell Lambanyi') {
      console.log('✅ PROBLÈME RÉSOLU: Bot trouve correctement "Station Shell Lambanyi"');
    } else {
      console.log(`⚠️ RÉSULTAT INATTENDU: "${mainResult.nom}"`);
    }
  } else {
    console.log('❌ Aucun résultat trouvé');
  }
}

async function testAutresCas(): Promise<void> {
  console.log('\n🧪 === TESTS SUPPLÉMENTAIRES ===');
  
  const testCases = [
    'shell lambayi',
    'lambayi',
    'station shell',
    'shell'
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- TEST: "${testCase}" ---`);
    const result = await searchAdresse(testCase);
    if (result) {
      console.log(`✅ "${result.nom}" (${result.latitude}, ${result.longitude})`);
    } else {
      console.log('❌ Aucun résultat');
    }
  }
}

// ===== FONCTION PRINCIPALE =====

async function main(): Promise<void> {
  console.log('🚀 DÉBUT DES TESTS - SYSTÈME DE RECHERCHE BOT V2');
  console.log(`📅 ${new Date().toISOString()}`);
  
  // Test 1: Authentification
  const authOk = await testAuthentification();
  if (!authOk) {
    console.log('❌ ARRÊT: Impossible de s\'authentifier à Supabase');
    return;
  }
  
  // Test 2: Vue adresses_with_coords
  const vueOk = await testVueAdressesWithCoords();
  if (!vueOk) {
    console.log('⚠️ ATTENTION: Vue adresses_with_coords non accessible');
  }
  
  // Test 3: Cas spécifique problématique
  await testCasSpecifique();
  
  // Test 4: Autres cas pour comparaison
  await testAutresCas();
  
  console.log('\n🏁 FIN DES TESTS');
}

// Exécution
if (import.meta.main) {
  main().catch(console.error);
}