// Fonction de calcul de distance Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Position du conducteur
const conducteurLat = 9.5283095;
const conducteurLon = -13.6830708;

// Position de Station Shell Lambanyi
const stationLat = 9.6410198;
const stationLon = -13.6125611;

// Calculer la distance
const distance = calculateDistance(conducteurLat, conducteurLon, stationLat, stationLon);

console.log("Position Conducteur Test:", conducteurLat + "°N, " + conducteurLon + "°W");
console.log("Position Station Shell Lambanyi:", stationLat + "°N, " + stationLon + "°W");
console.log("Distance:", distance.toFixed(2) + " km");
console.log("Dans rayon 5km?", distance <= 5 ? "OUI ✅" : "NON ❌");