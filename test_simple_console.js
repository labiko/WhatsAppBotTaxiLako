// ========================================
// TEST SIMPLE CONSOLE - NODE.JS COMPATIBLE
// ========================================

console.log('🧪 TEST CONSOLE : Fonctions de recherche');
console.log('========================================\n');

// Test des fonctions utilitaires (sans dépendances)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^a-z0-9\s]/g, ' ')   // Garder que lettres/chiffres
    .replace(/\s+/g, ' ')            // Espaces multiples → simple
    .trim();
}

function generatePermutations(words) {
  if (words.length <= 1) return [words];
  if (words.length > 4) return [words]; // Limiter pour performance
  
  const perms = [];
  
  const permute = (arr, m = []) => {
    if (arr.length === 0) {
      perms.push(m);
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next));
      }
    }
  };
  
  permute(words);
  return perms;
}

// ========================================
// TEST 1: normalizeText
// ========================================

console.log('📝 TEST 1: normalizeText');
console.log('------------------------');

const testTexts = [
  'Café-Restaurant "Le Bon Côté"',
  'Hôpital Ignace Deen',
  'MARCHÉ    MADINA!!!',
  'mardina marché',
  '2LK RESTAURANT-LOUNGE'
];

testTexts.forEach(text => {
  const normalized = normalizeText(text);
  console.log(`"${text}"`);
  console.log(`→ "${normalized}"`);
  console.log('');
});

// ========================================
// TEST 2: generatePermutations
// ========================================

console.log('🔄 TEST 2: generatePermutations');
console.log('------------------------------');

const wordSets = [
  ['mardina', 'marché'],
  ['marché', 'madina'],
  ['hôpital', 'ignace', 'deen']
];

wordSets.forEach(words => {
  const perms = generatePermutations(words);
  console.log(`Mots: [${words.join(', ')}]`);
  console.log(`${perms.length} permutations:`);
  perms.forEach((perm, i) => {
    console.log(`  ${i+1}. "${perm.join(' ')}"`);
  });
  console.log('');
});

// ========================================
// TEST 3: Simulation de recherche
// ========================================

console.log('🔍 TEST 3: Simulation recherche');
console.log('-------------------------------');

// Simuler des données de base
const mockDatabase = [
  { id: '1', nom: 'Marché Madina', nom_normalise: 'marche madina' },
  { id: '2', nom: 'Madina Centre', nom_normalise: 'madina centre' },
  { id: '3', nom: 'Hôpital Ignace Deen', nom_normalise: 'hopital ignace deen' },
  { id: '4', nom: '2LK RESTAURANT-LOUNGE', nom_normalise: '2lk restaurant lounge' }
];

function simulateSearch(query) {
  console.log(`\n🔍 Recherche: "${query}"`);
  console.log('---');
  
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
  
  console.log(`Query normalisée: "${normalizedQuery}"`);
  console.log(`Mots extraits: [${queryWords.join(', ')}]`);
  
  let results = [];
  
  // 1. Recherche exacte
  const exactMatch = mockDatabase.find(item => 
    item.nom_normalise === normalizedQuery
  );
  if (exactMatch) {
    results.push({ ...exactMatch, source: 'exact', score: 100 });
    console.log(`✅ Exact trouvé: "${exactMatch.nom}"`);
  }
  
  // 2. Permutations si pas trouvé
  if (results.length === 0 && queryWords.length > 1) {
    const perms = generatePermutations(queryWords);
    console.log(`🔄 Test ${perms.length} permutations...`);
    
    for (const perm of perms) {
      const permQuery = perm.join(' ');
      if (permQuery === normalizedQuery) continue;
      
      const permMatch = mockDatabase.find(item =>
        item.nom_normalise.includes(permQuery)
      );
      
      if (permMatch) {
        results.push({ ...permMatch, source: 'permutation', score: 90 });
        console.log(`✅ Permutation "${permQuery}" → "${permMatch.nom}"`);
        break;
      }
    }
  }
  
  // 3. Recherche fuzzy/partielle
  if (results.length === 0) {
    console.log(`🔍 Recherche fuzzy...`);
    
    mockDatabase.forEach(item => {
      let matches = 0;
      queryWords.forEach(word => {
        if (item.nom_normalise.includes(word)) {
          matches++;
        }
      });
      
      if (matches > 0) {
        const score = (matches / queryWords.length) * 80;
        results.push({ ...item, source: 'fuzzy', score, matches });
      }
    });
    
    results.sort((a, b) => b.score - a.score);
  }
  
  // Afficher résultats
  if (results.length > 0) {
    console.log(`\n📊 ${results.length} résultat(s):`);
    results.forEach((r, i) => {
      console.log(`${i+1}. ${r.nom} (${r.source}, score: ${r.score})`);
    });
  } else {
    console.log(`\n❌ Aucun résultat trouvé`);
  }
  
  return results;
}

// Tests de recherche
const searchQueries = [
  'Marché Madina',      // Exact
  'mardina marché',     // Fuzzy + permutation
  'madina marché',      // Permutation
  '2LK Restaurant',     // Partiel
  'hopital ignace'      // Partiel
];

searchQueries.forEach(query => {
  simulateSearch(query);
});

console.log('\n🎉 Tests terminés !');
console.log('\n💡 Pour tester avec vraie base Supabase:');
console.log('   1. Installer Deno: https://deno.land/');
console.log('   2. Exécuter: deno run --allow-net test_database_search_only.ts');