// ========================================
// TEST INDIVIDUEL DE CHAQUE FONCTION
// Appelez directement la fonction que vous voulez tester
// ========================================

import { 
  initializeSearchService,
  searchInDatabaseSmart,
  searchInGooglePlaces,
  searchLocationGeneric,
  searchLocation,
  searchLocationWithSuggestions,
  normalizeText,
  generatePermutations
} from './search-service.ts';

// Configuration globale
const CONFIG = {
  supabaseUrl: 'https://nmwnibzgvwltipmtwhzo.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTEyOTgzMCwiZXhwIjoyMDM2NzA1ODMwfQ.4-ccQNbWTDNs9DhHBdYTw2vJlUSP3-VGEu5yzxWnAu8',
  googleApiKey: undefined, // À définir si besoin
  primarySource: 'database' as const,
  fuzzyThreshold: 0.3,
  maxSuggestions: 10,
  logLevel: 'debug' as const
};

// Initialisation automatique
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initializeSearchService(CONFIG);
    initialized = true;
    console.log('✅ Service initialisé');
  }
}

// ========================================
// FONCTIONS DE TEST INDIVIDUELLES
// ========================================

// 1. TEST searchInDatabaseSmart
export async function testSearchInDatabaseSmart(
  query: string, 
  maxResults: number = 5,
  logLevel: 'minimal' | 'detailed' | 'debug' = 'detailed'
) {
  console.log(`🔍 TEST searchInDatabaseSmart("${query}")`);
  console.log('=' .repeat(50));
  
  await ensureInitialized();
  
  const startTime = Date.now();
  const results = await searchInDatabaseSmart(query, { maxResults, logLevel });
  const elapsed = Date.now() - startTime;
  
  console.log(`\n📊 RÉSULTATS: ${results.length} trouvé(s) en ${elapsed}ms`);
  
  results.forEach((r, i) => {
    console.log(`\n${i+1}. 📍 ${r.name}`);
    console.log(`   🎯 Source: ${r.source}`);
    console.log(`   ⭐ Score: ${r.score}`);
    console.log(`   📝 Adresse: ${r.address}`);
    if (r.coords) {
      console.log(`   🌍 GPS: ${r.coords.lat}, ${r.coords.lng}`);
    }
    if (r.matchDetails) {
      console.log(`   🔧 Stratégie: ${r.matchDetails.strategy}`);
      if (r.matchDetails.matchedWith) {
        console.log(`   🔄 Matché avec: "${r.matchDetails.matchedWith}"`);
      }
    }
  });
  
  return results;
}

// 2. TEST searchInGooglePlaces
export async function testSearchInGooglePlaces(
  query: string,
  maxResults: number = 5
) {
  console.log(`🌐 TEST searchInGooglePlaces("${query}")`);
  console.log('=' .repeat(50));
  
  await ensureInitialized();
  
  const results = await searchInGooglePlaces(query, { maxResults });
  
  console.log(`\n📊 RÉSULTATS Google Places: ${results.length}`);
  
  results.forEach((r, i) => {
    console.log(`\n${i+1}. 🌐 ${r.name}`);
    console.log(`   📝 ${r.address}`);
    console.log(`   🌍 GPS: ${r.coords?.lat}, ${r.coords?.lng}`);
  });
  
  return results;
}

// 3. TEST searchLocationGeneric (fonction principale)
export async function testSearchLocationGeneric(
  query: string,
  maxResults: number = 5,
  logLevel: 'minimal' | 'detailed' | 'debug' = 'detailed'
) {
  console.log(`🎯 TEST searchLocationGeneric("${query}")`);
  console.log('=' .repeat(50));
  
  await ensureInitialized();
  
  const results = await searchLocationGeneric(query, { maxResults, logLevel });
  
  console.log(`\n📊 RÉSULTATS COMPLETS: ${results.length}`);
  
  results.forEach((r, i) => {
    console.log(`\n${i+1}. 📍 ${r.name}`);
    console.log(`   🎯 Source: ${r.source}`);
    console.log(`   ⭐ Score: ${r.score}`);
  });
  
  return results;
}

// 4. TEST searchLocation (fonction pour bot)
export async function testSearchLocation(query: string) {
  console.log(`🤖 TEST searchLocation("${query}") - Format Bot`);
  console.log('=' .repeat(50));
  
  const result = await searchLocation(query, CONFIG.supabaseUrl, CONFIG.supabaseKey);
  
  if (result) {
    console.log(`\n✅ RÉSULTAT (format bot):`);
    console.log(`   📍 Nom: ${result.nom}`);
    console.log(`   📝 Adresse: ${result.adresse_complete}`);
    console.log(`   🌍 GPS: ${result.latitude}, ${result.longitude}`);
  } else {
    console.log(`\n❌ Aucun résultat trouvé`);
  }
  
  return result;
}

// 5. TEST searchLocationWithSuggestions
export async function testSearchLocationWithSuggestions(
  query: string,
  maxSuggestions: number = 5
) {
  console.log(`💡 TEST searchLocationWithSuggestions("${query}")`);
  console.log('=' .repeat(50));
  
  const results = await searchLocationWithSuggestions(query, maxSuggestions);
  
  console.log(`\n📊 SUGGESTIONS: ${results.length}`);
  
  results.forEach((r, i) => {
    console.log(`\n${i+1}. 💡 ${r.nom}`);
    console.log(`   🎯 Source: ${r.source}`);
    console.log(`   ⭐ Score: ${r.score}`);
  });
  
  return results;
}

// 6. TEST normalizeText
export function testNormalizeText(text: string) {
  console.log(`📝 TEST normalizeText("${text}")`);
  console.log('=' .repeat(50));
  
  const normalized = normalizeText(text);
  console.log(`\n📝 Original: "${text}"`);
  console.log(`📝 Normalisé: "${normalized}"`);
  
  return normalized;
}

// 7. TEST generatePermutations
export function testGeneratePermutations(words: string[]) {
  console.log(`🔄 TEST generatePermutations([${words.join(', ')}])`);
  console.log('=' .repeat(50));
  
  const perms = generatePermutations(words);
  console.log(`\n🔄 ${perms.length} permutations générées:`);
  
  perms.forEach((perm, i) => {
    console.log(`   ${i+1}. "${perm.join(' ')}"`);
  });
  
  return perms;
}

// ========================================
// EXEMPLES D'UTILISATION
// ========================================

// Décommentez pour tester :

/* 
// Test 1: Recherche en base avec faute de frappe
await testSearchInDatabaseSmart('mardina marché', 5, 'debug');

// Test 2: Google Places
await testSearchInGooglePlaces('restaurant conakry', 3);

// Test 3: Fonction principale
await testSearchLocationGeneric('2LK Restaurant', 8, 'detailed');

// Test 4: Format bot
await testSearchLocation('Hôpital Ignace Deen');

// Test 5: Suggestions multiples
await testSearchLocationWithSuggestions('marché', 10);

// Test 6: Normalisation
testNormalizeText('Café-Restaurant "Le Bon Côté"');

// Test 7: Permutations
testGeneratePermutations(['marché', 'madina', 'centre']);
*/

console.log('🎯 FONCTIONS DE TEST DISPONIBLES:');
console.log('================================');
console.log('• testSearchInDatabaseSmart(query, maxResults?, logLevel?)');
console.log('• testSearchInGooglePlaces(query, maxResults?)');
console.log('• testSearchLocationGeneric(query, maxResults?, logLevel?)');
console.log('• testSearchLocation(query)');
console.log('• testSearchLocationWithSuggestions(query, maxSuggestions?)');
console.log('• testNormalizeText(text)');
console.log('• testGeneratePermutations(words[])');
console.log('\n💡 Exemple:');
console.log('await testSearchInDatabaseSmart("mardina marché", 5, "debug");');