// ========================================
// SCRIPT DE TEST INDIVIDUEL DES FONCTIONS
// ========================================

import { 
  initializeSearchService,
  searchInDatabaseSmart,
  searchInGooglePlaces,
  searchLocationGeneric,
  normalizeText,
  generatePermutations
} from './search-service.ts';

// Configuration avec vos vraies clés
const config = {
  supabaseUrl: 'https://nmwnibzgvwltipmtwhzo.supabase.co', // Votre URL Supabase
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTEyOTgzMCwiZXhwIjoyMDM2NzA1ODMwfQ.4-ccQNbWTDNs9DhHBdYTw2vJlUSP3-VGEu5yzxWnAu8', // Votre clé service
  googleApiKey: undefined, // On teste d'abord sans Google
  primarySource: 'database' as const,
  fuzzyThreshold: 0.3,
  maxSuggestions: 10,
  logLevel: 'debug' as const
};

console.log('🚀 DÉMARRAGE DES TESTS INDIVIDUELS');
console.log('==================================\n');

// ========================================
// TEST 1: searchInDatabaseSmart
// ========================================

async function testSearchInDatabaseSmart() {
  console.log('🧪 TEST 1: searchInDatabaseSmart');
  console.log('--------------------------------');
  
  try {
    // Initialiser le service
    console.log('⚙️ Initialisation du service...');
    await initializeSearchService(config);
    console.log('✅ Service initialisé\n');
    
    // Test avec différentes requêtes
    const testQueries = [
      'Marché Madina',      // Exact (devrait être trouvé)
      'mardina marché',     // Fuzzy + permutation
      '2LK Restaurant',     // Recherche réelle
      'hopital ignace',     // Partiel
      'xyz123nonexistant'   // Aucun résultat
    ];
    
    for (const query of testQueries) {
      console.log(`🔍 Test: "${query}"`);
      console.log('---');
      
      const startTime = Date.now();
      const results = await searchInDatabaseSmart(query, {
        maxResults: 5,
        logLevel: 'detailed'
      });
      const elapsed = Date.now() - startTime;
      
      console.log(`📊 Résultat: ${results.length} trouvé(s) en ${elapsed}ms`);
      
      if (results.length > 0) {
        results.forEach((r, i) => {
          console.log(`  ${i+1}. ${r.name}`);
          console.log(`     Source: ${r.source}`);
          console.log(`     Score: ${r.score}`);
          if (r.matchDetails) {
            console.log(`     Stratégie: ${r.matchDetails.strategy}`);
            if (r.matchDetails.matchedWith) {
              console.log(`     Matché avec: "${r.matchDetails.matchedWith}"`);
            }
          }
          console.log(`     Coordonnées: ${r.coords?.lat}, ${r.coords?.lng}`);
        });
      } else {
        console.log('  ❌ Aucun résultat trouvé');
      }
      
      console.log(''); // Ligne vide
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// ========================================
// TEST 2: Fonctions utilitaires
// ========================================

async function testUtilityFunctions() {
  console.log('🧪 TEST 2: Fonctions utilitaires');
  console.log('--------------------------------');
  
  try {
    // Test normalizeText
    const testTexts = [
      'Café-Restaurant "Le Bon Côté"',
      'Hôpital Ignace Deen',
      'MARCHÉ    MADINA!!!',
      'école primaire andré malraux'
    ];
    
    console.log('📝 Test normalizeText:');
    testTexts.forEach(text => {
      const normalized = normalizeText(text);
      console.log(`  "${text}" → "${normalized}"`);
    });
    
    console.log('');
    
    // Test generatePermutations
    console.log('🔄 Test generatePermutations:');
    const wordSets = [
      ['marché', 'madina'],
      ['hôpital', 'ignace', 'deen'],
      ['centre', 'commercial', 'carrefour', 'sénart']
    ];
    
    wordSets.forEach(words => {
      const perms = generatePermutations(words);
      console.log(`  [${words.join(', ')}] → ${perms.length} permutations:`);
      perms.slice(0, 3).forEach(perm => {
        console.log(`    - "${perm.join(' ')}"`);
      });
      if (perms.length > 3) {
        console.log(`    ... et ${perms.length - 3} autres`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur fonctions utilitaires:', error.message);
  }
}

// ========================================
// TEST 3: searchLocationGeneric (complet)
// ========================================

async function testSearchLocationGeneric() {
  console.log('🧪 TEST 3: searchLocationGeneric (complet)');
  console.log('------------------------------------------');
  
  try {
    const query = 'mardina marché';
    console.log(`🔍 Test workflow complet avec: "${query}"`);
    
    const startTime = Date.now();
    const results = await searchLocationGeneric(query, {
      maxResults: 8,
      logLevel: 'detailed'
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   ${results.length} résultat(s) en ${elapsed}ms`);
    
    if (results.length > 0) {
      console.log(`\n📋 Détails des résultats:`);
      results.forEach((r, i) => {
        console.log(`\n${i+1}. ${r.name}`);
        console.log(`   📍 ${r.address}`);
        console.log(`   🎯 Source: ${r.source}`);
        console.log(`   ⭐ Score: ${r.score}`);
        if (r.coords) {
          console.log(`   🌍 GPS: ${r.coords.lat}, ${r.coords.lng}`);
        }
      });
      
      // Vérifier si "Marché Madina" est dans les résultats
      const foundMadina = results.some(r => 
        r.name.toLowerCase().includes('madina') && 
        r.name.toLowerCase().includes('marché')
      );
      
      if (foundMadina) {
        console.log(`\n✅ SUCCESS: "Marché Madina" trouvé malgré la faute "mardina" !`);
      } else {
        console.log(`\n⚠️ NOTE: "Marché Madina" non trouvé dans les résultats`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur test complet:', error.message);
  }
}

// ========================================
// EXÉCUTION DES TESTS
// ========================================

async function runAllTests() {
  try {
    await testSearchInDatabaseSmart();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testUtilityFunctions();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testSearchLocationGeneric();
    
    console.log('\n🎉 TOUS LES TESTS TERMINÉS !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer les tests
if (import.meta.main) {
  runAllTests();
}

// Exports pour tests individuels
export { 
  testSearchInDatabaseSmart,
  testUtilityFunctions,
  testSearchLocationGeneric
};