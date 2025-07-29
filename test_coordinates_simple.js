// Test extraction coordonnées PostGIS depuis les logs
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTkxNzQ3OCwiZXhwIjoyMDM3NDkzNDc4fQ.R5hbeFCGa46OzJoSeOvqajDUaUQvjAO6c8ZMx6dccUM';

// Données des logs
const departPosition = "0101000020E6100000C5138B29A25C2BC045CBCBAB84142340";
const destinationPosition = "0101000020E6100000E0F42EDE8F272BC0D576137CD3582340";

console.log("🔍 TEST EXTRACTION COORDONNÉES PostGIS");
console.log("Départ:", departPosition);
console.log("Destination:", destinationPosition);

// Test fonction getCoordinatesFromPosition (celle du code)
function getCoordinatesFromPosition(position) {
  console.log(`🔧 Extraction depuis: ${position}`);
  const match = position.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (match) {
    const result = {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
    console.log(`✅ Résultat: lat=${result.latitude}, lon=${result.longitude}`);
    return result;
  } else {
    console.log(`❌ Aucun match POINT() trouvé`);
    return { latitude: 0, longitude: 0 };
  }
}

// Test extraction
console.log("\n📍 EXTRACTION DÉPART:");
const departCoords = getCoordinatesFromPosition(departPosition);

console.log("\n📍 EXTRACTION DESTINATION:");
const destCoords = getCoordinatesFromPosition(destinationPosition);

// Calcul distance Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

console.log("\n🧮 CALCUL DISTANCE:");
const distance = calculateDistance(
  departCoords.latitude, departCoords.longitude,
  destCoords.latitude, destCoords.longitude
);
console.log(`📏 Distance calculée: ${distance.toFixed(2)} km`);