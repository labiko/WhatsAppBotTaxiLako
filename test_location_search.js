#!/usr/bin/env node

/**
 * Test de la fonction de recherche d'adresses
 * Teste la fonction SQL search_adresses_intelligent directement
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmwnibzgvwltipmtwhzo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
);

async function testLocationSearch() {
  console.log('🔍 TEST SYSTÈME RECHERCHE INTELLIGENT');
  console.log('====================================\n');

  // Test 1: Comptage total données Guinée
  console.log('📊 Test 1: Vérification données injectées');
  const { data: countData, error: countError } = await supabase
    .from('adresses')
    .select('id', { count: 'exact', head: true })
    .eq('pays', 'Guinée');

  if (countError) {
    console.error('❌ Erreur comptage:', countError.message);
    return;
  }

  console.log(`✅ Total adresses Guinée: ${countData}`);

  if (countData === 0) {
    console.log('⚠️ Aucune donnée trouvée - Veuillez d\'abord exécuter l\'injection SQL');
    return;
  }

  // Test 2: Répartition par ville
  console.log('\n🏙️ Test 2: Répartition par ville');
  const { data: cities, error: citiesError } = await supabase
    .from('adresses')
    .select('ville')
    .eq('pays', 'Guinée');

  if (citiesError) {
    console.error('❌ Erreur villes:', citiesError.message);
  } else {
    const cityCount = {};
    cities.forEach(row => {
      cityCount[row.ville] = (cityCount[row.ville] || 0) + 1;
    });
    
    Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .forEach(([city, count]) => {
        console.log(`  ${city}: ${count} lieux`);
      });
  }

  // Test 3: Fonction de recherche exacte
  console.log('\n🎯 Test 3: Recherche exacte "hopital"');
  await testSearch('hopital', 'conakry', 5);

  // Test 4: Recherche fuzzy
  console.log('\n🔍 Test 4: Recherche fuzzy "ecol" (école)');
  await testSearch('ecol', 'conakry', 3);

  // Test 5: Recherche multi-ville
  console.log('\n🌍 Test 5: Recherche multi-ville "marche"');
  await testSearch('marche', 'all', 5);

  // Test 6: Recherche avec typos
  console.log('\n✏️ Test 6: Recherche avec typos "banqu" (banque)');
  await testSearch('banqu', 'conakry', 3);

  console.log('\n🎉 Tests terminés !');
  console.log('\n📋 Prochaine étape: Créer Edge Function location-search');
}

async function testSearch(query, city, limit) {
  try {
    const { data, error } = await supabase.rpc('search_adresses_intelligent', {
      search_query: query,
      target_city: city,
      limit_results: limit
    });

    if (error) {
      console.error(`❌ Erreur recherche "${query}":`, error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ Aucun résultat pour "${query}" dans ${city}`);
      return;
    }

    console.log(`✅ ${data.length} résultats pour "${query}" dans ${city}:`);
    data.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.nom} (${result.ville}) - Score: ${result.similarity_score.toFixed(2)} - Type: ${result.match_type}`);
    });

  } catch (err) {
    console.error(`❌ Exception recherche "${query}":`, err.message);
  }
}

// Test des extensions PostgreSQL
async function testExtensions() {
  console.log('\n🔧 Vérification extensions PostgreSQL:');
  
  try {
    // Test pg_trgm
    const { error: trgmError } = await supabase.rpc('similarity', {
      text1: 'test',
      text2: 'test'
    });
    
    if (trgmError) {
      console.log('❌ pg_trgm non installé ou non fonctionnel');
    } else {
      console.log('✅ pg_trgm opérationnel');
    }
  } catch (err) {
    console.log('❌ pg_trgm: erreur test');
  }

  try {
    // Test unaccent
    const { error: unaccentError } = await supabase.rpc('unaccent', {
      text: 'café'
    });
    
    if (unaccentError) {
      console.log('⚠️ unaccent non installé (optionnel)');
    } else {
      console.log('✅ unaccent opérationnel');
    }
  } catch (err) {
    console.log('⚠️ unaccent: non testé (optionnel)');
  }
}

// Exécution des tests
if (require.main === module) {
  testLocationSearch()
    .then(() => {
      console.log('\n✅ Tous les tests sont terminés');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erreur lors des tests:', error.message);
      process.exit(1);
    });
}

module.exports = { testLocationSearch };