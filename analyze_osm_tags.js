const fs = require('fs');

console.log('🔍 ANALYSE DES TAGS OSM UTILES\n');

const data = JSON.parse(fs.readFileSync('guinea_complete_osm.json', 'utf8'));
const tagTypes = new Set();
const examples = {};
const tagCounts = {};

// Analyser les 2000 premiers éléments
data.elements.slice(0, 2000).forEach(item => {
  if (item.tags) {
    Object.keys(item.tags).forEach(tag => {
      tagTypes.add(tag);
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      if (!examples[tag]) {
        examples[tag] = item.tags[tag];
      }
    });
  }
});

console.log('📊 TAGS BUSINESS UTILES:\n');
const businessTags = [
  'phone', 'website', 'opening_hours', 'addr:street', 'addr:housenumber', 
  'contact:phone', 'contact:website', 'operator', 'brand', 'cuisine', 
  'capacity', 'wheelchair', 'description', 'email'
];

businessTags.forEach(tag => {
  if (tagTypes.has(tag)) {
    console.log(`✅ ${tag} (${tagCounts[tag]} fois): "${examples[tag]}"`);
  } else {
    console.log(`❌ ${tag}: Non trouvé`);
  }
});

console.log('\n🏢 TAGS DE CATÉGORIE:\n');
const categoryTags = ['shop', 'amenity', 'tourism', 'leisure', 'office', 'healthcare', 'emergency', 'building'];
categoryTags.forEach(tag => {
  if (tagTypes.has(tag)) {
    console.log(`✅ ${tag} (${tagCounts[tag]} fois): "${examples[tag]}"`);
  }
});

console.log('\n📍 TAGS D\'ADRESSE:\n');
const addressTags = ['addr:street', 'addr:housenumber', 'addr:city', 'addr:postcode', 'addr:country'];
addressTags.forEach(tag => {
  if (tagTypes.has(tag)) {
    console.log(`✅ ${tag} (${tagCounts[tag]} fois): "${examples[tag]}"`);
  }
});

console.log('\n🎯 RECOMMENDATIONS POUR NOUVELLES COLONNES:\n');

const recommendations = [
  { column: 'telephone', source: 'phone || contact:phone', utility: 'Contact direct' },
  { column: 'site_web', source: 'website || contact:website', utility: 'Informations en ligne' },
  { column: 'horaires', source: 'opening_hours', utility: 'Heures d\'ouverture' },
  { column: 'rue', source: 'addr:street', utility: 'Adresse précise' },
  { column: 'numero', source: 'addr:housenumber', utility: 'Numéro de rue' },
  { column: 'operateur', source: 'operator || brand', utility: 'Propriétaire/marque' },
  { column: 'description_fr', source: 'description', utility: 'Informations détaillées' },
  { column: 'capacite', source: 'capacity', utility: 'Nombre de places' },
  { column: 'accessibilite', source: 'wheelchair', utility: 'Accès handicapés' }
];

recommendations.forEach(rec => {
  console.log(`📌 ${rec.column}: ${rec.source} → ${rec.utility}`);
});

console.log(`\n📊 RÉSUMÉ: ${tagTypes.size} tags différents trouvés`);