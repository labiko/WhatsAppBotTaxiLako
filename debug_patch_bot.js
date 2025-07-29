// PATCH TEMPORAIRE pour ajouter des logs debug au bot
// À ajouter dans la fonction searchAdresse et calculateDistance

// 1. DANS searchAdresse (après ligne 600) - AJOUTER CES LOGS:
/*
console.log(`🔍 DEBUG searchAdresse - Résultat:`, JSON.stringify(adresse));
console.log(`📍 DEBUG destination - latitude: ${adresse.latitude}, longitude: ${adresse.longitude}`);
*/

// 2. DANS calculateDistance (après ligne 355) - REMPLACER LA FONCTION PAR:
/*
function calculateDistance(lat1, lon1, lat2, lon2) {
  console.log(`🧮 DEBUG calculateDistance - ENTRÉE:`);
  console.log(`   lat1 (client): ${lat1}`);
  console.log(`   lon1 (client): ${lon1}`);
  console.log(`   lat2 (destination): ${lat2}`);
  console.log(`   lon2 (destination): ${lon2}`);
  
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  console.log(`🧮 DEBUG calculateDistance - CALCULS:`);
  console.log(`   dLat: ${dLat}`);
  console.log(`   dLon: ${dLon}`);
  console.log(`   lat1Rad: ${lat1Rad}`);
  console.log(`   lat2Rad: ${lat2Rad}`);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const result = R * c;
  
  console.log(`🧮 DEBUG calculateDistance - RÉSULTAT: ${result} km`);
  
  return result;
}
*/

// 3. DANS la section calcul de distance (après ligne 596) - AJOUTER:
/*
console.log(`🔎 DEBUG extraction coordonnées client:`);
console.log(`   session.positionClient: ${session.positionClient}`);
console.log(`   positionMatch: ${JSON.stringify(positionMatch)}`);
console.log(`   clientLon extracted: ${clientLon}`);
console.log(`   clientLat extracted: ${clientLat}`);
*/

// INSTRUCTIONS:
// 1. Copier ces logs dans le bot
// 2. Redéployer
// 3. Tester avec "Gare de melun"
// 4. Analyser les logs pour voir où sont les 5401.9 km