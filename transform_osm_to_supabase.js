#!/usr/bin/env node

/**
 * Script de transformation OSM → Supabase
 * Filtre les données de Guinée et les formate pour injection
 */

const fs = require('fs');

// Configuration transformation
const CONFIG = {
  input_file: 'guinea_complete_osm.json',
  output_file: 'guinea_filtered_for_supabase.sql',
  target_country: 'Guinée',
  max_locations: 15000,
  
  // Filtres géographiques Guinée
  guinea_bounds: {
    north: 12.7,
    south: 7.3,
    east: -7.6,
    west: -15.1
  },
  
  // Villes principales à prioriser
  priority_cities: [
    'conakry', 'kindia', 'labe', 'boke', 'kankan', 'nzerekore',
    'faranah', 'siguiri', 'kouroussa', 'mamou', 'dalaba', 'pita'
  ]
};

// Mapping types OSM → types de lieu
const AMENITY_MAPPING = {
  // Santé
  'hospital': 'hopital',
  'clinic': 'clinique', 
  'pharmacy': 'pharmacie',
  'dentist': 'dentiste',
  
  // Éducation
  'school': 'ecole',
  'university': 'universite',
  'college': 'college',
  'kindergarten': 'maternelle',
  
  // Commerce
  'bank': 'banque',
  'post_office': 'poste',
  'marketplace': 'marche',
  'fuel': 'station_essence',
  
  // Administration
  'police': 'police',
  'fire_station': 'pompiers',
  'town_hall': 'mairie',
  
  // Transport
  'bus_stop': 'arret_bus',
  'aerodrome': 'aeroport',
  'airport': 'aeroport',
  
  // Lieux publics
  'community_centre': 'centre_communautaire',
  'library': 'bibliotheque',
  'place_of_worship': 'lieu_culte',
  
  // Commerce détaillé
  'restaurant': 'restaurant',
  'cafe': 'cafe', 
  'bar': 'bar',
  'fast_food': 'fast_food',
  'hotel': 'hotel',
  'shop': 'magasin'
};

const PLACE_MAPPING = {
  'city': 'ville',
  'town': 'ville',
  'village': 'village',
  'hamlet': 'village'
};

function transformOSMToSupabase() {
  console.log('🔄 Début transformation OSM → Supabase...');
  
  if (!fs.existsSync(CONFIG.input_file)) {
    console.error(`❌ Fichier source introuvable: ${CONFIG.input_file}`);
    process.exit(1);
  }
  
  // Lecture données OSM
  console.log(`📖 Lecture ${CONFIG.input_file}...`);
  const osmData = JSON.parse(fs.readFileSync(CONFIG.input_file, 'utf8'));
  console.log(`📊 Éléments bruts: ${osmData.elements?.length || 0}`);
  
  const filteredLocations = [];
  const cityStats = {};
  const typeStats = {};
  
  // Traitement des éléments OSM
  osmData.elements.forEach((element, index) => {
    if (index % 5000 === 0) {
      console.log(`🔄 Traitement: ${index}/${osmData.elements.length}`);
    }
    
    // Validation base
    if (!element.tags || !element.tags.name) {
      return; // Skip sans nom
    }
    
    // Extraction coordonnées
    let lat, lon;
    if (element.type === 'node') {
      lat = element.lat;
      lon = element.lon;
    } else if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    } else {
      return; // Skip sans coordonnées
    }
    
    // Filtre géographique Guinée stricte
    if (!isInGuinea(lat, lon)) {
      return;
    }
    
    // Détection ville/zone
    const ville = detectCity(element.tags.name, lat, lon);
    if (!ville) {
      return; // Skip si ville non identifiée
    }
    
    // Détection type de lieu
    const typeLieu = detectLocationType(element.tags);
    if (!typeLieu) {
      return; // Skip si type non mappé
    }
    
    // Normalisation nom
    const nomNormalise = normalizeName(element.tags.name);
    
    // Construction adresse complète
    const adresseComplete = buildCompleteAddress(element.tags, ville);
    
    // Objet location formaté
    const location = {
      nom: element.tags.name.trim(),
      nom_normalise: nomNormalise,
      adresse_complete: adresseComplete,
      ville: ville.toLowerCase(),
      type_lieu: typeLieu,
      latitude: lat,
      longitude: lon,
      osm_id: element.id,
      osm_type: element.type
    };
    
    filteredLocations.push(location);
    
    // Statistiques
    cityStats[ville] = (cityStats[ville] || 0) + 1;
    typeStats[typeLieu] = (typeStats[typeLieu] || 0) + 1;
  });
  
  console.log(`\n✅ Filtrage terminé: ${filteredLocations.length} lieux Guinée`);
  
  // Priorisation et limitation
  const prioritizedLocations = prioritizeLocations(filteredLocations);
  const finalLocations = prioritizedLocations.slice(0, CONFIG.max_locations);
  
  console.log(`📋 Sélection finale: ${finalLocations.length} lieux`);
  
  // Génération SQL
  const sqlContent = generateSQL(finalLocations);
  
  // Sauvegarde
  fs.writeFileSync(CONFIG.output_file, sqlContent, 'utf8');
  
  // Statistiques finales
  displayStats(finalLocations, cityStats, typeStats);
  
  console.log(`\n🎉 Transformation terminée !`);
  console.log(`📁 Fichier SQL: ${CONFIG.output_file}`);
  console.log(`\n🔄 Prochaine étape: Exécuter le SQL dans Supabase`);
}

function isInGuinea(lat, lon) {
  const bounds = CONFIG.guinea_bounds;
  return lat >= bounds.south && lat <= bounds.north &&
         lon >= bounds.west && lon <= bounds.east;
}

function detectCity(name, lat, lon) {
  // Détection basée sur coordonnées pour les principales villes
  const cityCoords = {
    'Conakry': { lat: 9.537, lon: -13.679, radius: 0.5 },
    'Kindia': { lat: 10.055, lon: -12.864, radius: 0.3 },
    'Labé': { lat: 11.318, lon: -12.283, radius: 0.3 },
    'Boké': { lat: 10.932, lon: -14.292, radius: 0.3 },
    'Kankan': { lat: 10.389, lon: -9.306, radius: 0.3 },
    'Nzérékoré': { lat: 7.756, lon: -8.817, radius: 0.3 }
  };
  
  // Test proximité grandes villes
  for (const [city, coords] of Object.entries(cityCoords)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2)
    );
    if (distance <= coords.radius) {
      return city;
    }
  }
  
  // Détection par nom si contient nom de ville
  const nameLower = name.toLowerCase();
  for (const city of CONFIG.priority_cities) {
    if (nameLower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  
  // Ville par défaut selon région géographique
  if (lat >= 9.0 && lat <= 10.0 && lon >= -14.5 && lon <= -13.0) {
    return 'Conakry'; // Région Conakry
  } else if (lat >= 10.5 && lat <= 12.0 && lon >= -13.0 && lon <= -11.5) {
    return 'Labé'; // Région Fouta
  } else if (lat >= 8.5 && lat <= 10.5 && lon >= -10.5 && lon <= -8.5) {
    return 'Kankan'; // Région Haute-Guinée
  } else if (lat >= 7.0 && lat <= 9.0 && lon >= -9.5 && lon <= -7.5) {
    return 'Nzérékoré'; // Région Forestière
  }
  
  return 'Autre'; // Fallback
}

function detectLocationType(tags) {
  // Priority mapping
  if (tags.amenity && AMENITY_MAPPING[tags.amenity]) {
    return AMENITY_MAPPING[tags.amenity];
  }
  
  if (tags.place && PLACE_MAPPING[tags.place]) {
    return PLACE_MAPPING[tags.place];
  }
  
  if (tags.shop) {
    return tags.shop === 'yes' ? 'magasin' : `magasin_${tags.shop}`;
  }
  
  if (tags.tourism) {
    return `tourisme_${tags.tourism}`;
  }
  
  return null; // Non mappé
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime accents
    .replace(/[^a-z0-9\s\-]/g, '') // Garde lettres, chiffres, espaces, traits
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCompleteAddress(tags, ville) {
  const parts = [tags.name];
  
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city'] && tags['addr:city'] !== ville) parts.push(tags['addr:city']);
  
  parts.push(ville);
  parts.push('Guinée');
  
  return parts.filter(Boolean).join(', ');
}

function prioritizeLocations(locations) {
  // Scoring système
  return locations.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    // Bonus ville prioritaire
    if (CONFIG.priority_cities.includes(a.ville.toLowerCase())) scoreA += 10;
    if (CONFIG.priority_cities.includes(b.ville.toLowerCase())) scoreB += 10;
    
    // Bonus Conakry
    if (a.ville.toLowerCase() === 'conakry') scoreA += 5;
    if (b.ville.toLowerCase() === 'conakry') scoreB += 5;
    
    // Bonus types importants
    const importantTypes = ['hopital', 'ecole', 'banque', 'marche', 'aeroport'];
    if (importantTypes.includes(a.type_lieu)) scoreA += 3;
    if (importantTypes.includes(b.type_lieu)) scoreB += 3;
    
    return scoreB - scoreA;
  });
}

function generateSQL(locations) {
  let sql = `-- Injection massive adresses Guinée OSM (${locations.length} lieux)
-- Généré automatiquement le ${new Date().toISOString()}

BEGIN;

-- Nettoyage adresses OSM existantes
DELETE FROM adresses WHERE pays = 'Guinée' AND osm_id IS NOT NULL;

-- Insertion massive
INSERT INTO adresses (
  nom, nom_normalise, adresse_complete, ville, code_postal, pays,
  position, type_lieu, actif, osm_id, created_at, updated_at
) VALUES\n`;

  const sqlRows = locations.map((loc, index) => {
    const isLast = index === locations.length - 1;
    return `  (
    '${escapeSQLString(loc.nom)}',
    '${escapeSQLString(loc.nom_normalise)}', 
    '${escapeSQLString(loc.adresse_complete)}',
    '${escapeSQLString(loc.ville)}',
    NULL,
    'Guinée',
    ST_GeogFromText('POINT(${loc.longitude} ${loc.latitude})'),
    '${escapeSQLString(loc.type_lieu)}',
    true,
    ${loc.osm_id},
    NOW(),
    NOW()
  )${isLast ? ';' : ','}`;
  });

  sql += sqlRows.join('\n');
  sql += `\n\nCOMMIT;\n\n-- Statistiques insertion\nSELECT \n  'Injection terminée' as status,\n  COUNT(*) as total_adresses,\n  COUNT(DISTINCT ville) as villes_couvertes\nFROM adresses \nWHERE pays = 'Guinée' AND osm_id IS NOT NULL;\n`;

  return sql;
}

function escapeSQLString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").substring(0, 200); // Limite 200 chars
}

function displayStats(locations, cityStats, typeStats) {
  console.log('\n📊 STATISTIQUES FINALES');
  console.log('=======================');
  
  console.log(`📍 Total locations: ${locations.length}`);
  
  console.log('\n🏙️ Répartition par ville:');
  Object.entries(cityStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count}`);
    });
  
  console.log('\n🏢 Répartition par type:');
  Object.entries(typeStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
}

// Exécution
if (require.main === module) {
  transformOSMToSupabase();
}

module.exports = { transformOSMToSupabase };