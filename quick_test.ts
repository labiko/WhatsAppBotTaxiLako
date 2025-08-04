// ========================================
// TESTS RAPIDES - APPELEZ LA FONCTION QUE VOUS VOULEZ
// ========================================

import { 
  testSearchInDatabaseSmart,
  testSearchInGooglePlaces,
  testSearchLocationGeneric,
  testSearchLocation,
  testSearchLocationWithSuggestions,
  testNormalizeText,
  testGeneratePermutations
} from './test_functions_individual.ts';

// ========================================
// EXEMPLES D'APPELS DIRECTS
// ========================================

console.log('🚀 TESTS RAPIDES DÉMARRÉS');
console.log('========================\n');

// 🔍 TEST 1: Votre cas principal "mardina marché"
console.log('📋 TEST 1: Cas principal');
await testSearchInDatabaseSmart('mardina marché', 5, 'debug');

console.log('\n' + '='.repeat(60) + '\n');

// 🔍 TEST 2: Recherche exacte
console.log('📋 TEST 2: Recherche exacte');
await testSearchInDatabaseSmart('Marché Madina', 3, 'detailed');

console.log('\n' + '='.repeat(60) + '\n');

// 🔍 TEST 3: Format bot (comme dans le code actuel)
console.log('📋 TEST 3: Format bot');
await testSearchLocation('2LK Restaurant');

console.log('\n' + '='.repeat(60) + '\n');

// 🔍 TEST 4: Suggestions multiples
console.log('📋 TEST 4: Suggestions multiples');
await testSearchLocationWithSuggestions('restaurant', 8);

console.log('\n' + '='.repeat(60) + '\n');

// 🔍 TEST 5: Fonction utilitaire
console.log('📋 TEST 5: Normalisation');
testNormalizeText('Café-Restaurant "Le Bon Côté"');

console.log('\n🎉 TESTS TERMINÉS !');