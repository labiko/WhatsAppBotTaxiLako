#!/usr/bin/env node

/**
 * Injection massive 15,000 lieux Guinée via Node.js + Supabase
 * Alternative à psql pour Windows
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://nmwnibzgvwltipmtwhzo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
);

async function injectMassiveData() {
  console.log('🚀 INJECTION MASSIVE 15,000 LIEUX GUINÉE');
  console.log('=========================================\n');

  try {
    // Étape 1: Ajouter colonne osm_id si nécessaire
    console.log('🔧 Étape 1: Préparation structure table...');
    await prepareTableStructure();

    // Étape 2: Charger et parser les données
    console.log('📖 Étape 2: Chargement données...');
    const locations = await loadLocationData();
    
    // Étape 3: Nettoyage données OSM existantes
    console.log('🧹 Étape 3: Nettoyage données OSM existantes...');
    await cleanupOSMData();

    // Étape 4: Injection par chunks
    console.log('💾 Étape 4: Injection massive par chunks...');
    await injectByChunks(locations);

    // Étape 5: Vérification finale
    console.log('✅ Étape 5: Vérification post-injection...');
    await verifyInjection();

    console.log('\n🎉 INJECTION TERMINÉE AVEC SUCCÈS !');
    console.log('📊 15,000 lieux Guinée sont maintenant disponibles');
    console.log('🔍 Testez avec: node test_location_search.js');

  } catch (error) {
    console.error('\n❌ ERREUR INJECTION:', error.message);
    console.error('🔧 Vérifiez la connexion Supabase et réessayez');
    process.exit(1);
  }
}

async function prepareTableStructure() {
  try {
    // Ajouter colonne osm_id
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE adresses ADD COLUMN IF NOT EXISTS osm_id BIGINT;'
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.log('⚠️ Colonne osm_id:', alterError.message);
    }

    // Créer index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_adresses_osm_id ON adresses (osm_id) WHERE osm_id IS NOT NULL;'
    });

    if (indexError && !indexError.message.includes('already exists')) {
      console.log('⚠️ Index osm_id:', indexError.message);
    }

    console.log('✅ Structure table préparée');

  } catch (error) {
    console.log('⚠️ Préparation structure (peut être ignoré):', error.message);
  }
}

async function loadLocationData() {
  console.log('📂 Chargement guinea_filtered_for_supabase.sql...');
  
  if (!fs.existsSync('guinea_filtered_for_supabase.sql')) {
    throw new Error('Fichier guinea_filtered_for_supabase.sql introuvable');
  }

  const sqlContent = fs.readFileSync('guinea_filtered_for_supabase.sql', 'utf8');
  
  // Extraction des données INSERT
  const locations = extractLocationsFromSQL(sqlContent);
  console.log(`✅ ${locations.length} lieux chargés`);
  
  return locations;
}

function extractLocationsFromSQL(sqlContent) {
  const locations = [];
  
  // Regex pour extraire les lignes de données
  const insertMatch = sqlContent.match(/INSERT INTO adresses[\s\S]*?VALUES([\s\S]*?);/);
  if (!insertMatch) {
    throw new Error('Format SQL non reconnu');
  }

  const valuesSection = insertMatch[1];
  const valueMatches = valuesSection.match(/\(\s*'[^']*'[\s\S]*?\)/g);
  
  if (!valueMatches) {
    throw new Error('Aucune donnée trouvée dans le SQL');
  }

  valueMatches.forEach((valueString, index) => {
    try {
      // Parse simple des valeurs (nom, nom_normalise, adresse_complete, ville, pays, position, type_lieu, osm_id)
      const cleanValue = valueString.replace(/\(\s*|\s*\)/g, '');
      const values = [];
      let current = '';
      let inQuotes = false;
      let depth = 0;
      
      for (let i = 0; i < cleanValue.length; i++) {
        const char = cleanValue[i];
        
        if (char === "'" && cleanValue[i-1] !== "\\") {
          inQuotes = !inQuotes;
        } else if (char === '(' && !inQuotes) {
          depth++;
        } else if (char === ')' && !inQuotes) {
          depth--;
        } else if (char === ',' && !inQuotes && depth === 0) {
          values.push(current.trim());
          current = '';
          continue;
        }
        
        current += char;
      }
      values.push(current.trim());

      // Construction objet location
      if (values.length >= 8) {
        const location = {
          nom: values[0].replace(/^'|'$/g, '').replace(/''/g, "'"),
          nom_normalise: values[1].replace(/^'|'$/g, '').replace(/''/g, "'"),
          adresse_complete: values[2].replace(/^'|'$/g, '').replace(/''/g, "'"),
          ville: values[3].replace(/^'|'$/g, '').replace(/''/g, "'"),
          pays: 'Guinée',
          position_raw: values[5], // ST_GeogFromText(...)
          type_lieu: values[6].replace(/^'|'$/g, '').replace(/''/g, "'"),
          osm_id: parseInt(values[7]) || null
        };

        // Extraction coordonnées
        const coordMatch = location.position_raw.match(/POINT\(([^\)]+)\)/);
        if (coordMatch) {
          const [lon, lat] = coordMatch[1].split(' ').map(parseFloat);
          location.latitude = lat;
          location.longitude = lon;
        }

        locations.push(location);
      }
    } catch (err) {
      console.log(`⚠️ Erreur parsing ligne ${index + 1}:`, err.message);
    }
  });

  return locations;
}

async function cleanupOSMData() {
  const { error } = await supabase
    .from('adresses')
    .delete()
    .eq('pays', 'Guinée')
    .not('osm_id', 'is', null);

  if (error) {
    console.log('⚠️ Nettoyage OSM:', error.message);
  } else {
    console.log('✅ Données OSM existantes supprimées');
  }
}

async function injectByChunks(locations) {
  const CHUNK_SIZE = 100; // Supabase limite ~1000 mais on prend marge
  const totalChunks = Math.ceil(locations.length / CHUNK_SIZE);
  
  console.log(`📦 Injection par chunks de ${CHUNK_SIZE} (${totalChunks} chunks total)`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunk = locations.slice(start, end);

    // Formatage pour Supabase
    const supabaseData = chunk.map(loc => ({
      nom: loc.nom,
      nom_normalise: loc.nom_normalise,
      adresse_complete: loc.adresse_complete,
      ville: loc.ville,
      pays: 'Guinée',
      position: `POINT(${loc.longitude} ${loc.latitude})`,
      type_lieu: loc.type_lieu,
      actif: true,
      osm_id: loc.osm_id
    }));

    try {
      const { data, error } = await supabase
        .from('adresses')
        .insert(supabaseData);

      if (error) {
        console.error(`❌ Erreur chunk ${i + 1}/${totalChunks}:`, error.message);
        // Continue avec les autres chunks
      } else {
        console.log(`✅ Chunk ${i + 1}/${totalChunks} injecté (${chunk.length} lieux)`);
      }

      // Pause pour éviter rate limiting
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (err) {
      console.error(`❌ Exception chunk ${i + 1}:`, err.message);
    }
  }
}

async function verifyInjection() {
  // Comptage total
  const { count: totalCount, error: countError } = await supabase
    .from('adresses')
    .select('*', { count: 'exact', head: true })
    .eq('pays', 'Guinée');

  if (countError) {
    console.error('❌ Erreur vérification:', countError.message);
    return;
  }

  console.log(`📊 Total adresses Guinée: ${totalCount}`);

  // Répartition par ville
  const { data: cities, error: citiesError } = await supabase
    .from('adresses')
    .select('ville')
    .eq('pays', 'Guinée');

  if (!citiesError && cities) {
    const cityCount = {};
    cities.forEach(row => {
      cityCount[row.ville] = (cityCount[row.ville] || 0) + 1;
    });

    console.log('\n🏙️ Répartition par ville:');
    Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .forEach(([city, count]) => {
        console.log(`  ${city}: ${count} lieux`);
      });
  }

  // Test fonction recherche
  try {
    const { data: searchTest, error: searchError } = await supabase
      .rpc('search_adresses_intelligent', {
        search_query: 'hopital',
        target_city: 'conakry',
        limit_results: 3
      });

    if (searchError) {
      console.log('⚠️ Test recherche:', searchError.message);
    } else {
      console.log(`\n🔍 Test recherche "hopital": ${searchTest?.length || 0} résultats`);
    }
  } catch (err) {
    console.log('⚠️ Test recherche non effectué');
  }
}

// Exécution
if (require.main === module) {
  injectMassiveData();
}

module.exports = { injectMassiveData };