#!/usr/bin/env node

/**
 * Injection directe via données JSON OSM transformées
 * Plus fiable que parsing SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://nmwnibzgvwltipmtwhzo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
);

async function injectDirectData() {
  console.log('🚀 INJECTION DIRECTE DONNÉES OSM GUINÉE');
  console.log('======================================\n');

  try {
    // 1. Charger données OSM brutes
    console.log('📖 Chargement guinea_complete_osm.json...');
    const osmData = JSON.parse(fs.readFileSync('guinea_complete_osm.json', 'utf8'));
    console.log(`📊 ${osmData.elements?.length || 0} éléments OSM chargés`);

    // 2. Transformation et filtrage
    console.log('🔄 Transformation et filtrage Guinée...');
    const locations = transformAndFilter(osmData.elements);
    console.log(`✅ ${locations.length} lieux Guinée filtrés`);

    if (locations.length === 0) {
      console.log('❌ Aucune donnée à injecter');
      return;
    }

    // 3. Nettoyage données OSM existantes  
    console.log('🧹 Nettoyage données OSM existantes...');
    await cleanupOSMData();

    // 4. Injection par chunks
    console.log('💾 Injection par chunks...');
    await injectByChunks(locations);

    // 5. Vérification
    console.log('✅ Vérification finale...');
    await verifyInjection();

    console.log('\n🎉 INJECTION TERMINÉE AVEC SUCCÈS !');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

function transformAndFilter(osmElements) {
  const locations = [];
  const guinea_bounds = {
    north: 12.7,
    south: 7.3,
    east: -7.6,
    west: -15.1
  };

  const priority_cities = [
    'conakry', 'kindia', 'labe', 'boke', 'kankan', 'nzerekore'
  ];

  const AMENITY_MAPPING = {
    'hospital': 'hopital',
    'clinic': 'clinique', 
    'pharmacy': 'pharmacie',
    'school': 'ecole',
    'university': 'universite',
    'bank': 'banque',
    'marketplace': 'marche',
    'fuel': 'station_essence',
    'restaurant': 'restaurant',
    'hotel': 'hotel'
  };

  osmElements.forEach((element, index) => {
    if (index % 10000 === 0) {
      console.log(`🔄 Traitement: ${index}/${osmElements.length}`);
    }

    // Validation base
    if (!element.tags || !element.tags.name) return;

    // Extraction coordonnées
    let lat, lon;
    if (element.type === 'node') {
      lat = element.lat;
      lon = element.lon;
    } else if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    } else {
      return;
    }

    // Filtre géographique Guinée
    if (lat < guinea_bounds.south || lat > guinea_bounds.north ||
        lon < guinea_bounds.west || lon > guinea_bounds.east) {
      return;
    }

    // Détection ville
    const ville = detectCity(element.tags.name, lat, lon, priority_cities);
    if (!ville) return;

    // Détection type
    const typeLieu = detectLocationType(element.tags, AMENITY_MAPPING);
    if (!typeLieu) return;

    // Normalisation nom
    const nomNormalise = element.tags.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    locations.push({
      nom: element.tags.name.trim().substring(0, 200),
      nom_normalise: nomNormalise.substring(0, 200),
      adresse_complete: `${element.tags.name}, ${ville}, Guinée`.substring(0, 500),
      ville: ville.toLowerCase(),
      pays: 'Guinée',
      position: `POINT(${lon} ${lat})`,
      type_lieu: typeLieu,
      actif: true,
      osm_id: element.id,
      latitude: lat,
      longitude: lon
    });
  });

  // Priorisation et limitation à 15,000
  return prioritizeAndLimit(locations);
}

function detectCity(name, lat, lon, priority_cities) {
  // Centres villes principaux
  const cityCoords = {
    'Conakry': { lat: 9.537, lon: -13.679, radius: 0.5 },
    'Kindia': { lat: 10.055, lon: -12.864, radius: 0.3 },
    'Labé': { lat: 11.318, lon: -12.283, radius: 0.3 },
    'Boké': { lat: 10.932, lon: -14.292, radius: 0.3 },
    'Kankan': { lat: 10.389, lon: -9.306, radius: 0.3 },
    'Nzérékoré': { lat: 7.756, lon: -8.817, radius: 0.3 }
  };

  // Test proximité
  for (const [city, coords] of Object.entries(cityCoords)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2)
    );
    if (distance <= coords.radius) {
      return city;
    }
  }

  // Détection par nom
  const nameLower = name.toLowerCase();
  for (const city of priority_cities) {
    if (nameLower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  // Région géographique
  if (lat >= 9.0 && lat <= 10.0 && lon >= -14.5 && lon <= -13.0) {
    return 'Conakry';
  } else if (lat >= 10.5 && lat <= 12.0 && lon >= -13.0 && lon <= -11.5) {
    return 'Labé';
  } else if (lat >= 8.5 && lat <= 10.5 && lon >= -10.5 && lon <= -8.5) {
    return 'Kankan';
  } else if (lat >= 7.0 && lat <= 9.0 && lon >= -9.5 && lon <= -7.5) {
    return 'Nzérékoré';
  }

  return 'Autre';
}

function detectLocationType(tags, mapping) {
  if (tags.amenity && mapping[tags.amenity]) {
    return mapping[tags.amenity];
  }
  
  if (tags.place) {
    return tags.place === 'city' || tags.place === 'town' ? 'ville' : 'village';
  }
  
  if (tags.shop) {
    return 'magasin';
  }
  
  if (tags.tourism) {
    return 'tourisme';
  }
  
  return 'lieu';
}

function prioritizeAndLimit(locations) {
  // Tri par priorité
  locations.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Bonus Conakry
    if (a.ville === 'conakry') scoreA += 10;
    if (b.ville === 'conakry') scoreB += 10;
    
    // Bonus types importants
    const importantTypes = ['hopital', 'ecole', 'banque', 'marche'];
    if (importantTypes.includes(a.type_lieu)) scoreA += 5;
    if (importantTypes.includes(b.type_lieu)) scoreB += 5;
    
    return scoreB - scoreA;
  });

  return locations.slice(0, 15000);
}

async function cleanupOSMData() {
  const { error } = await supabase
    .from('adresses')
    .delete()
    .eq('pays', 'Guinée')
    .not('osm_id', 'is', null);

  if (error) {
    console.log('⚠️ Nettoyage:', error.message);
  } else {
    console.log('✅ Nettoyage terminé');
  }
}

async function injectByChunks(locations) {
  const CHUNK_SIZE = 50; // Plus petit pour éviter timeouts
  const totalChunks = Math.ceil(locations.length / CHUNK_SIZE);
  
  console.log(`📦 ${totalChunks} chunks de ${CHUNK_SIZE} lieux`);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = locations.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

    const supabaseData = chunk.map(loc => ({
      nom: loc.nom,
      nom_normalise: loc.nom_normalise,
      adresse_complete: loc.adresse_complete,
      ville: loc.ville,
      pays: 'Guinée',
      position: loc.position,
      type_lieu: loc.type_lieu,
      actif: true,
      osm_id: loc.osm_id
    }));

    try {
      const { error } = await supabase
        .from('adresses')
        .insert(supabaseData);

      if (error) {
        console.log(`❌ Chunk ${i + 1}/${totalChunks}:`, error.message);
      } else {
        console.log(`✅ Chunk ${i + 1}/${totalChunks} (${chunk.length} lieux)`);
      }

      // Pause anti rate-limit
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.log(`❌ Exception chunk ${i + 1}:`, err.message);
    }
  }
}

async function verifyInjection() {
  const { count, error } = await supabase
    .from('adresses')
    .select('*', { count: 'exact', head: true })
    .eq('pays', 'Guinée');

  if (error) {
    console.error('❌ Vérification:', error.message);
  } else {
    console.log(`📊 Total adresses Guinée: ${count}`);
  }
}

// Exécution
if (require.main === module) {
  injectDirectData();
}

module.exports = { injectDirectData };