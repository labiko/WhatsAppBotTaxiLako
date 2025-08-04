// ========================================
// TESTS UNITAIRES - SERVICE DE RECHERCHE
// ========================================

import { 
  initializeSearchService,
  searchLocationGeneric,
  searchInDatabaseSmart,
  searchInGooglePlaces,
  searchLocation,
  searchLocationWithSuggestions,
  normalizeText,
  generatePermutations,
  SearchResult,
  SearchConfig
} from './search-service';

// Configuration de test
const testConfig: SearchConfig = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://test.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || 'test-key',
  googleApiKey: process.env.GOOGLE_API_KEY,
  primarySource: 'database',
  fuzzyThreshold: 0.3,
  maxSuggestions: 10,
  logLevel: 'debug'
};

// ========================================
// TESTS DES FONCTIONS INDIVIDUELLES
// ========================================

// Test direct de searchInGooglePlaces
export async function testSearchInGooglePlacesDirectly() {
  console.log('\n🧪 TEST DIRECT: searchInGooglePlaces');
  
  // Initialiser le service
  initializeSearchService(testConfig);
  
  // Appeler directement la fonction
  const results = await searchInGooglePlaces('restaurant conakry', {
    maxResults: 5
  });
  
  console.log(`📊 ${results.length} résultats Google Places`);
  results.forEach(r => {
    console.log(`  - ${r.name} (${r.source})`);
  });
}

// Test direct de searchInDatabaseSmart
export async function testSearchInDatabaseSmartDirectly() {
  console.log('\n🧪 TEST DIRECT: searchInDatabaseSmart');
  
  initializeSearchService(testConfig);
  
  const results = await searchInDatabaseSmart('marché madina', {
    logLevel: 'detailed'
  });
  
  console.log(`📊 ${results.length} résultats database`);
  results.forEach(r => {
    console.log(`  - ${r.name} (${r.source}, score: ${r.score})`);
  });
}

// Test des fonctions utilitaires
export async function testUtilityFunctions() {
  console.log('\n🧪 TEST: Fonctions utilitaires');
  
  // Test normalizeText
  const normalized = normalizeText('Café-Restaurant "Le Bon Côté"');
  console.log(`Normalisé: "${normalized}"`);
  
  // Test generatePermutations
  const perms = generatePermutations(['marché', 'madina', 'centre']);
  console.log(`Permutations (${perms.length}):`, perms);
}

// Test de la fonction simplifiée pour le bot
export async function testSearchLocationForBot() {
  console.log('\n🧪 TEST: searchLocation (fonction bot)');
  
  const result = await searchLocation('2LK Restaurant', testConfig.supabaseUrl, testConfig.supabaseKey);
  
  if (result) {
    console.log('✅ Résultat trouvé:', {
      nom: result.nom,
      latitude: result.latitude,
      longitude: result.longitude
    });
  } else {
    console.log('❌ Aucun résultat');
  }
}

// ========================================
// SUITE DE TESTS COMPLÈTE
// ========================================

export class SearchServiceTests {
  constructor() {
    // Initialiser le service au démarrage
    initializeSearchService(testConfig);
  }

  // === TEST 1: Recherche exacte ===
  async testExactSearch() {
    console.log('\n🧪 TEST 1: Recherche exacte');
    const results = await this.service.searchLocationGeneric('Marché Madina');
    
    this.assertResults(results, {
      minCount: 1,
      expectedSource: 'database_exact',
      expectedName: 'Marché Madina'
    });
  }

  // === TEST 2: Permutation des mots ===
  async testWordPermutation() {
    console.log('\n🧪 TEST 2: Permutation des mots');
    const results = await this.service.searchLocationGeneric('Madina Marché');
    
    this.assertResults(results, {
      minCount: 1,
      expectedSource: 'database_permutation',
      expectedName: 'Marché Madina'
    });
  }

  // === TEST 3: Fautes de frappe ===
  async testFuzzyTypo() {
    console.log('\n🧪 TEST 3: Fautes de frappe');
    const results = await this.service.searchLocationGeneric('mardina marché');
    
    this.assertResults(results, {
      minCount: 1,
      expectedSources: ['database_fuzzy', 'database_permutation'],
      nameContains: 'Madina'
    });
  }

  // === TEST 4: Recherche partielle ===
  async testPartialSearch() {
    console.log('\n🧪 TEST 4: Recherche partielle');
    const results = await this.service.searchLocationGeneric('hôpital ignace');
    
    this.assertResults(results, {
      minCount: 1,
      expectedSource: 'database_partial',
      nameContains: 'Ignace Deen'
    });
  }

  // === TEST 5: Limite de résultats ===
  async testMaxResults() {
    console.log('\n🧪 TEST 5: Limite de résultats');
    const results = await this.service.searchLocationGeneric('restaurant', {
      maxResults: 5
    });
    
    console.assert(results.length <= 5, `❌ Attendu max 5 résultats, reçu ${results.length}`);
    console.log(`✅ Limite respectée: ${results.length} résultats`);
  }

  // === TEST 6: Mots multiples ===
  async testMultipleWords() {
    console.log('\n🧪 TEST 6: Recherche multi-mots');
    const results = await this.service.searchLocationGeneric('centre commercial carrefour');
    
    this.assertResults(results, {
      minCount: 0, // Peut ne pas exister
      logMatches: true
    });
  }

  // === TEST 7: Recherche vide ===
  async testEmptySearch() {
    console.log('\n🧪 TEST 7: Recherche vide');
    const results = await this.service.searchLocationGeneric('');
    
    console.assert(results.length === 0, '❌ Recherche vide devrait retourner 0 résultats');
    console.log('✅ Recherche vide gérée correctement');
  }

  // === TEST 8: Caractères spéciaux ===
  async testSpecialCharacters() {
    console.log('\n🧪 TEST 8: Caractères spéciaux');
    const results = await this.service.searchLocationGeneric('Café-Restaurant "Le Bon Coin"');
    
    console.log(`📊 ${results.length} résultats trouvés`);
    this.printResults(results.slice(0, 3));
  }

  // === TEST 9: Performance ===
  async testPerformance() {
    console.log('\n🧪 TEST 9: Test de performance');
    
    const queries = [
      'marché',
      'hôpital',
      'restaurant',
      'pharmacie',
      'école'
    ];
    
    const times: number[] = [];
    
    for (const query of queries) {
      const start = Date.now();
      await this.service.searchLocationGeneric(query);
      const elapsed = Date.now() - start;
      times.push(elapsed);
      console.log(`⏱️ "${query}": ${elapsed}ms`);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`📊 Temps moyen: ${avg.toFixed(0)}ms`);
    console.assert(avg < 1000, `❌ Performance dégradée: ${avg}ms en moyenne`);
  }

  // === TEST 10: Logs détaillés ===
  async testDetailedLogs() {
    console.log('\n🧪 TEST 10: Vérification des logs');
    
    this.service.clearLogs();
    await this.service.searchLocationGeneric('2LK Restaurant');
    
    const logs = this.service.getLogs();
    console.log(`📝 ${logs.length} entrées de log générées`);
    
    // Vérifier présence de logs clés
    const hasSearchLog = logs.some(l => l.includes('RECHERCHE GÉNÉRIQUE'));
    const hasResultLog = logs.some(l => l.includes('résultats'));
    
    console.assert(hasSearchLog, '❌ Log de recherche manquant');
    console.assert(hasResultLog, '❌ Log de résultat manquant');
    console.log('✅ Logs correctement générés');
  }

  // === HELPERS ===
  
  private assertResults(results: SearchResult[], expectations: {
    minCount?: number;
    expectedSource?: string;
    expectedSources?: string[];
    expectedName?: string;
    nameContains?: string;
    logMatches?: boolean;
  }) {
    // Vérifier le nombre de résultats
    if (expectations.minCount !== undefined) {
      console.assert(
        results.length >= expectations.minCount,
        `❌ Attendu au moins ${expectations.minCount} résultats, reçu ${results.length}`
      );
    }
    
    if (results.length === 0) {
      console.log('⚠️ Aucun résultat trouvé');
      return;
    }
    
    // Vérifier la source
    if (expectations.expectedSource) {
      const hasSource = results.some(r => r.source === expectations.expectedSource);
      console.assert(hasSource, `❌ Source attendue: ${expectations.expectedSource}`);
    }
    
    if (expectations.expectedSources) {
      const hasOneSource = results.some(r => 
        expectations.expectedSources!.includes(r.source)
      );
      console.assert(hasOneSource, `❌ Aucune des sources attendues trouvée`);
    }
    
    // Vérifier le nom
    if (expectations.expectedName) {
      const hasName = results.some(r => r.name === expectations.expectedName);
      console.assert(hasName, `❌ Nom attendu: ${expectations.expectedName}`);
    }
    
    if (expectations.nameContains) {
      const hasPartial = results.some(r => 
        r.name.toLowerCase().includes(expectations.nameContains!.toLowerCase())
      );
      console.assert(hasPartial, `❌ Aucun résultat ne contient: ${expectations.nameContains}`);
    }
    
    // Afficher les résultats
    console.log(`✅ ${results.length} résultats trouvés`);
    this.printResults(results.slice(0, 3));
    
    if (expectations.logMatches) {
      this.printDetailedMatches(results);
    }
  }
  
  private printResults(results: SearchResult[]) {
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (${r.source}, score: ${r.score})`);
      if (r.matchDetails) {
        console.log(`     → Stratégie: ${r.matchDetails.strategy}`);
        if (r.matchDetails.matchedWith) {
          console.log(`     → Matché avec: "${r.matchDetails.matchedWith}"`);
        }
      }
    });
  }
  
  private printDetailedMatches(results: SearchResult[]) {
    console.log('\n📋 Détails des correspondances:');
    results.forEach(r => {
      console.log(`\n• ${r.name}`);
      console.log(`  - Source: ${r.source}`);
      console.log(`  - Score: ${r.score}`);
      console.log(`  - Adresse: ${r.address}`);
      if (r.coords) {
        console.log(`  - Coordonnées: ${r.coords.lat}, ${r.coords.lng}`);
      }
      if (r.matchDetails) {
        console.log(`  - Détails:`, r.matchDetails);
      }
    });
  }

  // === RUNNER ===
  async runAllTests() {
    console.log('🚀 DÉMARRAGE DES TESTS UNITAIRES');
    console.log('================================\n');
    
    const tests = [
      this.testExactSearch,
      this.testWordPermutation,
      this.testFuzzyTypo,
      this.testPartialSearch,
      this.testMaxResults,
      this.testMultipleWords,
      this.testEmptySearch,
      this.testSpecialCharacters,
      this.testPerformance,
      this.testDetailedLogs
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        await test.call(this);
        passed++;
      } catch (error) {
        failed++;
        console.error(`❌ Erreur: ${error.message}`);
      }
    }
    
    console.log('\n================================');
    console.log(`📊 RÉSUMÉ: ${passed} tests réussis, ${failed} échecs`);
    console.log('================================\n');
  }
}

// ========================================
// EXÉCUTION DES TESTS
// ========================================

// Pour exécuter les tests:
/*
const tester = new SearchServiceTests();
await tester.runAllTests();

// Ou exécuter un test spécifique:
await tester.testFuzzyTypo();
*/

// Export pour utilisation
export function runSearchTests() {
  const tester = new SearchServiceTests();
  return tester.runAllTests();
}