// Test manual de la fonction calculateDistance avec les coordonnées exactes
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Test avec les coordonnées exactes de notre cas
const departLat = 9.5395142;    // Pharmacie Donka
const departLon = -13.6831975;
const destLat = 10.0025766;     // Ecole primaire de Denki madina  
const destLon = -13.0765668;

const distance = calculateDistance(departLat, departLon, destLat, destLon);

console.log('=== TEST CALCULATEDISTANCE ===');
console.log(`Départ: lat=${departLat}, lon=${departLon}`);
console.log(`Destination: lat=${destLat}, lon=${destLon}`);
console.log(`Distance calculée: ${distance.toFixed(2)} km`);
console.log(`Distance attendue: 83.98 km`);
console.log(`Match: ${Math.abs(distance - 83.98) < 1 ? '✅ OUI' : '❌ NON'}`);

// Test avec des coordonnées nulles pour voir si ça donne 0
const distanceNull = calculateDistance(0, 0, 10.0025766, -13.0765668);
console.log(`Distance avec départ (0,0): ${distanceNull.toFixed(2)} km`);