#!/usr/bin/env node

/**
 * Script d'extraction OSM Guinée complète
 * Télécharge tous les lieux, adresses et POI de Guinée depuis OpenStreetMap
 */

const fs = require('fs');
const https = require('https');

// Configuration extraction
const CONFIG = {
  output_file: 'guinea_complete_osm.json',
  overpass_url: 'https://overpass-api.de/api/interpreter',
  timeout: 300, // 5 minutes
  max_retries: 3
};

// Requête Overpass pour Guinée complète (par coordonnées)
const OVERPASS_QUERY = `
[out:json][timeout:${CONFIG.timeout}];
(
  // Villes et villages dans bbox Guinée
  node[place~"city|town|village|hamlet"](7.3,-15.1,12.7,-7.6);
  way[place~"city|town|village"](7.3,-15.1,12.7,-7.6);
  relation[place~"city|town|village"](7.3,-15.1,12.7,-7.6);
  
  // Santé
  node[amenity~"hospital|clinic|pharmacy|dentist"](7.3,-15.1,12.7,-7.6);
  way[amenity~"hospital|clinic|pharmacy"](7.3,-15.1,12.7,-7.6);
  
  // Éducation  
  node[amenity~"school|university|college|kindergarten"](7.3,-15.1,12.7,-7.6);
  way[amenity~"school|university|college"](7.3,-15.1,12.7,-7.6);
  
  // Commerce et services
  node[amenity~"bank|post_office|police|fire_station|town_hall"](7.3,-15.1,12.7,-7.6);
  node[shop](7.3,-15.1,12.7,-7.6);
  way[shop](7.3,-15.1,12.7,-7.6);
  
  // Transport
  node[amenity~"fuel|parking"](7.3,-15.1,12.7,-7.6);
  node[aeroway~"aerodrome|airport"](7.3,-15.1,12.7,-7.6);
  way[aeroway~"aerodrome|airport"](7.3,-15.1,12.7,-7.6);
  node[highway~"bus_stop"](7.3,-15.1,12.7,-7.6);
  
  // Marchés et lieux publics
  node[amenity~"marketplace|community_centre|library"](7.3,-15.1,12.7,-7.6);
  way[amenity~"marketplace|community_centre"](7.3,-15.1,12.7,-7.6);
  
  // Tourisme et culture
  node[tourism](7.3,-15.1,12.7,-7.6);
  way[tourism](7.3,-15.1,12.7,-7.6);
  node[amenity~"place_of_worship"](7.3,-15.1,12.7,-7.6);
  way[amenity~"place_of_worship"](7.3,-15.1,12.7,-7.6);
  
  // Restaurants et hôtels
  node[amenity~"restaurant|cafe|bar|fast_food|hotel"](7.3,-15.1,12.7,-7.6);
  way[amenity~"restaurant|hotel"](7.3,-15.1,12.7,-7.6);
);
out center meta;
`;

async function extractOSMGuinea() {
  console.log('🌍 Début extraction OSM Guinée...');
  console.log(`📡 URL: ${CONFIG.overpass_url}`);
  console.log(`⏱️  Timeout: ${CONFIG.timeout}s`);
  
  const postData = 'data=' + encodeURIComponent(OVERPASS_QUERY);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'LokoTaxi-OSM-Extractor/1.0'
    },
    timeout: CONFIG.timeout * 1000
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(CONFIG.overpass_url, options, (res) => {
      let data = '';
      let totalSize = 0;
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📦 Content-Type: ${res.headers['content-type']}`);
      
      res.on('data', (chunk) => {
        data += chunk;
        totalSize += chunk.length;
        
        // Progress indicator
        if (totalSize % (1024 * 1024) === 0) {
          console.log(`📥 Téléchargé: ${Math.round(totalSize / 1024 / 1024)}MB`);
        }
      });
      
      res.on('end', () => {
        console.log(`✅ Téléchargement terminé: ${Math.round(totalSize / 1024 / 1024)}MB`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`📍 Éléments trouvés: ${jsonData.elements?.length || 0}`);
          
          // Sauvegarde
          fs.writeFileSync(CONFIG.output_file, JSON.stringify(jsonData, null, 2));
          console.log(`💾 Sauvegardé: ${CONFIG.output_file}`);
          
          // Statistiques
          analyzeOSMData(jsonData);
          resolve(jsonData);
          
        } catch (error) {
          console.error('❌ Erreur parsing JSON:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erreur requête:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error('⏱️ Timeout atteint');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

function analyzeOSMData(osmData) {
  console.log('\n📊 ANALYSE DES DONNÉES OSM');
  console.log('========================');
  
  if (!osmData.elements) {
    console.log('❌ Aucun élément trouvé');
    return;
  }
  
  const stats = {
    total: osmData.elements.length,
    by_type: {},
    by_category: {},
    with_name: 0,
    cities: new Set()
  };
  
  osmData.elements.forEach(element => {
    // Stats par type OSM
    stats.by_type[element.type] = (stats.by_type[element.type] || 0) + 1;
    
    // Stats par catégorie
    if (element.tags) {
      if (element.tags.name) stats.with_name++;
      
      // Détection villes
      if (element.tags.place) {
        stats.by_category[element.tags.place] = (stats.by_category[element.tags.place] || 0) + 1;
        if (element.tags.place === 'city' || element.tags.place === 'town') {
          stats.cities.add(element.tags.name);
        }
      }
      
      // Détection amenities
      if (element.tags.amenity) {
        stats.by_category[element.tags.amenity] = (stats.by_category[element.tags.amenity] || 0) + 1;
      }
      
      // Détection shops
      if (element.tags.shop) {
        stats.by_category['shop_' + element.tags.shop] = (stats.by_category['shop_' + element.tags.shop] || 0) + 1;
      }
    }
  });
  
  console.log(`📍 Total éléments: ${stats.total}`);
  console.log(`📝 Avec nom: ${stats.with_name}`);
  console.log(`🏙️  Villes principales: ${Array.from(stats.cities).slice(0, 10).join(', ')}`);
  
  console.log('\n📊 Répartition par type:');
  Object.entries(stats.by_type).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\n📊 Top catégories:');
  Object.entries(stats.by_category)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
  console.log(`\n✅ Extraction terminée avec succès !`);
  console.log(`📁 Fichier: ${CONFIG.output_file}`);
  console.log(`\n🔄 Prochaine étape: Transformation et injection en base Supabase`);
}

// Execution
if (require.main === module) {
  extractOSMGuinea()
    .then(() => {
      console.log('\n🎉 Extraction OSM Guinée terminée avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erreur extraction:', error.message);
      process.exit(1);
    });
}

module.exports = { extractOSMGuinea, analyzeOSMData };