#!/usr/bin/env node
/**
 * Script d'extraction COMPLÈTE des données géographiques de Conakry
 * Version optimisée pour AUCUN lieu important manqué
 * Extraction MAXIMALE depuis OpenStreetMap
 */

const fs = require('fs');
const path = require('path');

// Configuration Overpass API OpenStreetMap
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

// Coordonnées de Conakry ÉTENDUES (pour ne rien rater)
const CONAKRY_BOUNDS = {
    south: 9.35,   // Étendu vers le sud
    west: -13.85,  // Étendu vers l'ouest  
    north: 9.75,   // Étendu vers le nord
    east: -13.45   // Étendu vers l'est
};

/**
 * Construction de la requête Overpass QL EXHAUSTIVE
 */
function buildCompleteOverpassQuery() {
    const bbox = `${CONAKRY_BOUNDS.south},${CONAKRY_BOUNDS.west},${CONAKRY_BOUNDS.north},${CONAKRY_BOUNDS.east}`;
    
    return `
[out:json][timeout:600][maxsize:2147483648];
(
  // === TOUS LES ÉLÉMENTS NOMMÉS (PRIORITÉ ABSOLUE) ===
  node["name"](${bbox});
  node["name:fr"](${bbox});
  node["name:en"](${bbox});
  node["name:local"](${bbox});
  way["name"](${bbox});
  way["name:fr"](${bbox});
  way["name:en"](${bbox});
  relation["name"](${bbox});
  
  // === TOUS LES LIEUX GÉOGRAPHIQUES ===
  node["place"](${bbox});
  node["place"="city"](${bbox});
  node["place"="town"](${bbox});
  node["place"="village"](${bbox});
  node["place"="neighbourhood"](${bbox});
  node["place"="suburb"](${bbox});
  node["place"="quarter"](${bbox});
  node["place"="hamlet"](${bbox});
  node["place"="locality"](${bbox});
  node["place"="isolated_dwelling"](${bbox});
  
  // === SANTÉ EXHAUSTIVE ===
  node["amenity"="hospital"](${bbox});
  node["amenity"="clinic"](${bbox});
  node["amenity"="pharmacy"](${bbox});
  node["amenity"="doctors"](${bbox});
  node["amenity"="dentist"](${bbox});
  node["amenity"="veterinary"](${bbox});
  node["healthcare"](${bbox});
  node["healthcare"="hospital"](${bbox});
  node["healthcare"="clinic"](${bbox});
  node["healthcare"="pharmacy"](${bbox});
  way["amenity"="hospital"](${bbox});
  way["amenity"="clinic"](${bbox});
  way["building"="hospital"](${bbox});
  way["healthcare"](${bbox});
  
  // === ÉDUCATION EXHAUSTIVE ===
  node["amenity"="school"](${bbox});
  node["amenity"="university"](${bbox});
  node["amenity"="college"](${bbox});
  node["amenity"="kindergarten"](${bbox});
  node["amenity"="library"](${bbox});
  node["education"](${bbox});
  way["amenity"="school"](${bbox});
  way["amenity"="university"](${bbox});
  way["building"="school"](${bbox});
  way["building"="university"](${bbox});
  
  // === SERVICES FINANCIERS ===
  node["amenity"="bank"](${bbox});
  node["amenity"="atm"](${bbox});
  node["amenity"="bureau_de_change"](${bbox});
  node["amenity"="money_transfer"](${bbox});
  way["amenity"="bank"](${bbox});
  
  // === COMMERCE EXHAUSTIF ===
  node["shop"](${bbox});
  node["amenity"="marketplace"](${bbox});
  node["amenity"="market"](${bbox});
  node["market"](${bbox});
  way["amenity"="marketplace"](${bbox});
  way["amenity"="market"](${bbox});
  way["shop"](${bbox});
  way["landuse"="commercial"](${bbox});
  way["landuse"="retail"](${bbox});
  node["shop"="supermarket"](${bbox});
  node["shop"="general"](${bbox});
  node["shop"="convenience"](${bbox});
  
  // === RESTAURATION ET LOISIRS ===
  node["amenity"="restaurant"](${bbox});
  node["amenity"="cafe"](${bbox});
  node["amenity"="fast_food"](${bbox});
  node["amenity"="bar"](${bbox});
  node["amenity"="pub"](${bbox});
  node["amenity"="nightclub"](${bbox});
  node["leisure"](${bbox});
  node["leisure"="park"](${bbox});
  node["leisure"="sports_centre"](${bbox});
  node["sport"](${bbox});
  node["amenity"="cinema"](${bbox});
  node["amenity"="theatre"](${bbox});
  way["leisure"](${bbox});
  
  // === TRANSPORT COMPLET ===
  node["amenity"="fuel"](${bbox});
  node["amenity"="parking"](${bbox});
  node["amenity"="taxi"](${bbox});
  node["public_transport"](${bbox});
  node["highway"="bus_stop"](${bbox});
  node["railway"](${bbox});
  node["railway"="station"](${bbox});
  node["railway"="halt"](${bbox});
  node["aeroway"](${bbox});
  way["highway"](${bbox});
  way["railway"](${bbox});
  way["bridge"](${bbox});
  node["barrier"="toll_booth"](${bbox});
  
  // === SERVICES PUBLICS ET GOUVERNEMENT ===
  node["amenity"="police"](${bbox});
  node["amenity"="fire_station"](${bbox});
  node["amenity"="post_office"](${bbox});
  node["amenity"="townhall"](${bbox});
  node["amenity"="courthouse"](${bbox});
  node["amenity"="prison"](${bbox});
  node["government"](${bbox});
  node["office"="government"](${bbox});
  way["amenity"="police"](${bbox});
  way["government"](${bbox});
  way["building"="government"](${bbox});
  
  // === RELIGION ET CULTURE ===
  node["amenity"="place_of_worship"](${bbox});
  node["amenity"="community_centre"](${bbox});
  node["amenity"="social_centre"](${bbox});
  node["tourism"](${bbox});
  node["historic"](${bbox});
  node["memorial"](${bbox});
  node["cultural"](${bbox});
  way["amenity"="place_of_worship"](${bbox});
  way["building"="religious"](${bbox});
  way["tourism"](${bbox});
  
  // === TOUS LES BÂTIMENTS IMPORTANTS ===
  way["building"](${bbox});
  way["building"="hospital"](${bbox});
  way["building"="school"](${bbox});
  way["building"="commercial"](${bbox});
  way["building"="residential"](${bbox});
  way["building"="industrial"](${bbox});
  way["building"="office"](${bbox});
  way["building"="retail"](${bbox});
  way["building"="warehouse"](${bbox});
  way["building"="government"](${bbox});
  way["building"="religious"](${bbox});
  way["building"="civic"](${bbox});
  way["building"="public"](${bbox});
  way["building"="hotel"](${bbox});
  
  // === UTILISATION DU SOL ===
  way["landuse"](${bbox});
  way["landuse"="residential"](${bbox});
  way["landuse"="commercial"](${bbox});
  way["landuse"="industrial"](${bbox});
  way["landuse"="retail"](${bbox});
  way["landuse"="education"](${bbox});
  way["landuse"="healthcare"](${bbox});
  way["landuse"="military"](${bbox});
  way["landuse"="cemetery"](${bbox});
  
  // === ZONES NATURELLES ET EAU ===
  way["natural"](${bbox});
  way["waterway"](${bbox});
  way["coastline"](${bbox});
  node["natural"="peak"](${bbox});
  node["natural"="beach"](${bbox});
  
  // === TOUS LES ÉLÉMENTS AVEC ADRESSES ===
  node["addr:city"](${bbox});
  node["addr:street"](${bbox});
  node["addr:housenumber"](${bbox});
  way["addr:city"](${bbox});
  way["addr:street"](${bbox});
  way["addr:housenumber"](${bbox});
  
  // === ÉLÉMENTS AVEC CONTACT ===
  node["phone"](${bbox});
  node["website"](${bbox});
  node["email"](${bbox});
  way["phone"](${bbox});
  way["website"](${bbox});
  
  // === ÉLÉMENTS AVEC MARQUES/RÉFÉRENCES ===
  node["brand"](${bbox});
  node["operator"](${bbox});
  node["ref"](${bbox});
  way["brand"](${bbox});
  way["operator"](${bbox});
  way["ref"](${bbox});
  
  // === CATCH-ALL : TOUT ÉLÉMENT AVEC UNE PROPRIÉTÉ UTILE ===
  node["opening_hours"](${bbox});
  node["wheelchair"](${bbox});
  node["internet_access"](${bbox});
  way["opening_hours"](${bbox});
  way["wheelchair"](${bbox});
);
out geom meta;
    `.trim();
}

/**
 * Requête vers l'API Overpass OSM avec retry
 */
async function queryOverpassAPI(query, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🌍 Tentative ${attempt}/${maxRetries} - Requête Overpass API...`);
            console.log(`📍 Zone ÉTENDUE: Conakry (${CONAKRY_BOUNDS.south},${CONAKRY_BOUNDS.west} → ${CONAKRY_BOUNDS.north},${CONAKRY_BOUNDS.east})`);
            
            const response = await fetch(OVERPASS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(query)}`
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ ${data.elements?.length || 0} éléments OSM extraits (tentative ${attempt})`);
            return data.elements || [];
            
        } catch (error) {
            console.error(`❌ Erreur tentative ${attempt}: ${error.message}`);
            if (attempt === maxRetries) {
                throw error;
            }
            // Attendre avant retry
            console.log(`⏳ Attente 30s avant nouvelle tentative...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
}

// Réutiliser les fonctions de traitement du script précédent
// (processOSMData, determineLocationType, exportToCSV, analyzeData restent identiques)

/**
 * Fonction principale avec extraction EXHAUSTIVE
 */
async function main() {
    console.log("🇬🇳 EXTRACTION EXHAUSTIVE CONAKRY - AUCUN LIEU MANQUÉ");
    console.log("=" .repeat(70));
    
    try {
        // 1. Construction requête exhaustive
        const query = buildCompleteOverpassQuery();
        console.log("🔍 Requête construite - Extraction MAXIMALE activée");
        
        // 2. Extraction avec retry
        const rawData = await queryOverpassAPI(query, 3);
        
        if (rawData.length === 0) {
            console.log("❌ Aucune donnée extraite");
            return;
        }
        
        console.log(`📊 RÉSULTAT: ${rawData.length} éléments extraits`);
        console.log("💾 Traitement et export en cours...");
        
        // 3. Export simple en JSON pour inspection
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const jsonPath = path.join(__dirname, `conakry_complete_raw_${timestamp}.json`);
        
        fs.writeFileSync(jsonPath, JSON.stringify(rawData, null, 2), 'utf8');
        console.log(`✅ Données brutes sauvées: ${jsonPath}`);
        
        // 4. Analyse rapide
        const types = {};
        rawData.forEach(element => {
            const type = element.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        
        console.log("\n📊 RÉPARTITION PAR TYPE:");
        Object.entries(types).forEach(([type, count]) => {
            console.log(`  • ${type}: ${count}`);
        });
        
        console.log("\n✅ EXTRACTION EXHAUSTIVE TERMINÉE");
        console.log("💡 Vérifiez le fichier JSON pour analyser la qualité des données");
        
    } catch (error) {
        console.error("❌ Erreur fatale:", error.message);
        process.exit(1);
    }
}

// Vérification fetch API
if (typeof fetch === 'undefined') {
    console.log("❌ ERREUR: fetch API non disponible");
    console.log("💡 Utiliser Node.js 18+ ou installer node-fetch");
    process.exit(1);
}

// Lancement
main();