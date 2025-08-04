#!/usr/bin/env node
/**
 * Recherche d'un lieu spécifique dans les données OSM extraites
 * Usage: node search_specific_place.js "2LK RESTAURANT" conakry_overpass_complete.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Recherche fuzzy dans les données OSM
 */
function searchPlace(osmData, searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    const results = [];
    
    console.log(`🔍 Recherche: "${searchQuery}"`);
    console.log(`📊 Dans ${osmData.length} éléments OSM...`);
    
    osmData.forEach((element, index) => {
        if (!element.tags) return;
        
        // Recherche dans différents champs
        const searchFields = [
            element.tags.name,
            element.tags['name:fr'], 
            element.tags['name:en'],
            element.tags.brand,
            element.tags.operator,
            element.tags['addr:street'],
            element.tags.description
        ];
        
        searchFields.forEach(field => {
            if (field && field.toLowerCase().includes(query)) {
                results.push({
                    element: element,
                    matchField: field,
                    matchType: getMatchType(field, query)
                });
            }
        });
        
        // Progress indicator
        if ((index + 1) % 10000 === 0) {
            console.log(`   Analysé: ${index + 1}/${osmData.length}`);
        }
    });
    
    return results;
}

/**
 * Déterminer le type de correspondance
 */
function getMatchType(field, query) {
    const fieldLower = field.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (fieldLower === queryLower) return 'exact';
    if (fieldLower.startsWith(queryLower)) return 'starts_with';
    if (fieldLower.includes(queryLower)) return 'contains';
    return 'partial';
}

/**
 * Recherches multiples pour 2LK RESTAURANT
 */
function search2LKRestaurant(osmData) {
    console.log("🍽️ RECHERCHE SPÉCIFIQUE: 2LK RESTAURANT-LOUNGE");
    console.log("=" .repeat(60));
    
    // Différentes variantes de recherche
    const searchQueries = [
        '2LK RESTAURANT-LOUNGE',
        '2LK RESTAURANT',
        '2LK',
        'RESTAURANT-LOUNGE',
        'lounge',
        '2lk',
        'restaurant lounge'
    ];
    
    const allResults = new Map(); // Éviter doublons
    
    searchQueries.forEach(query => {
        console.log(`\n🔍 Recherche: "${query}"`);
        const results = searchPlace(osmData, query);
        
        if (results.length > 0) {
            console.log(`✅ ${results.length} résultat(s) trouvé(s)`);
            
            results.forEach(result => {
                const key = `${result.element.type}_${result.element.id}`;
                if (!allResults.has(key)) {
                    allResults.set(key, result);
                }
            });
        } else {
            console.log(`❌ Aucun résultat pour "${query}"`);
        }
    });
    
    return Array.from(allResults.values());
}

/**
 * Affichage détaillé des résultats
 */
function displayResults(results) {
    if (results.length === 0) {
        console.log("\n❌ AUCUN RÉSULTAT TROUVÉ");
        console.log("💡 Le restaurant 2LK n'existe pas dans OpenStreetMap");
        return;
    }
    
    console.log(`\n✅ ${results.length} RÉSULTAT(S) TROUVÉ(S):`);
    console.log("=" .repeat(60));
    
    results.forEach((result, index) => {
        const element = result.element;
        const tags = element.tags || {};
        
        console.log(`\n📍 RÉSULTAT #${index + 1}:`);
        console.log(`• Type OSM: ${element.type}`);
        console.log(`• ID OSM: ${element.id}`);
        console.log(`• Nom: ${tags.name || 'Non défini'}`);
        console.log(`• Nom FR: ${tags['name:fr'] || 'Non défini'}`);
        console.log(`• Champ trouvé: ${result.matchField}`);
        console.log(`• Type match: ${result.matchType}`);
        
        // Coordonnées
        if (element.lat && element.lon) {
            console.log(`• Coordonnées: ${element.lat}, ${element.lon}`);
        } else if (element.geometry && element.geometry.length > 0) {
            const first = element.geometry[0];
            console.log(`• Coordonnées: ${first.lat}, ${first.lon}`);
        }
        
        // Informations détaillées
        if (tags.amenity) console.log(`• Amenity: ${tags.amenity}`);
        if (tags.shop) console.log(`• Shop: ${tags.shop}`);
        if (tags.phone) console.log(`• Téléphone: ${tags.phone}`);
        if (tags.website) console.log(`• Site web: ${tags.website}`);
        if (tags['addr:street']) console.log(`• Rue: ${tags['addr:street']}`);
        if (tags.opening_hours) console.log(`• Horaires: ${tags.opening_hours}`);
        
        console.log(`• Correspondance: "${result.matchField}"`);
    });
}

/**
 * Recherche de restaurants similaires
 */
function findSimilarRestaurants(osmData) {
    console.log("\n🍽️ RESTAURANTS SIMILAIRES TROUVÉS:");
    console.log("=" .repeat(40));
    
    const restaurants = osmData.filter(element => {
        const tags = element.tags || {};
        return tags.amenity === 'restaurant' || 
               tags.amenity === 'cafe' ||
               tags.amenity === 'bar' ||
               (tags.name && tags.name.toLowerCase().includes('restaurant')) ||
               (tags.name && tags.name.toLowerCase().includes('lounge'));
    });
    
    console.log(`📊 ${restaurants.length} restaurants/bars/lounges trouvés dans OSM`);
    
    // Afficher les 10 premiers
    restaurants.slice(0, 10).forEach((element, index) => {
        const tags = element.tags || {};
        console.log(`${index + 1}. ${tags.name || 'Sans nom'} (${tags.amenity || 'type inconnu'})`);
    });
    
    if (restaurants.length > 10) {
        console.log(`... et ${restaurants.length - 10} autres restaurants`);
    }
}

/**
 * Fonction principale
 */
async function main() {
    const searchQuery = process.argv[2] || '2LK RESTAURANT';
    const jsonFile = process.argv[3] || path.join(__dirname, 'conakry_overpass_complete.json');
    
    try {
        console.log("🔍 RECHERCHE LIEU SPÉCIFIQUE DANS DONNÉES OSM");
        console.log("=" .repeat(50));
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(jsonFile)) {
            console.log(`❌ Fichier non trouvé: ${jsonFile}`);
            console.log("💡 Téléchargez d'abord les données avec Overpass Turbo");
            console.log("   ou utilisez: node extract_conakry_complete.js");
            return;
        }
        
        // Charger les données
        console.log(`📂 Chargement: ${jsonFile}`);
        const rawData = fs.readFileSync(jsonFile, 'utf8');
        const osmData = JSON.parse(rawData);
        
        if (!Array.isArray(osmData)) {
            throw new Error('Format JSON invalide - array attendu');
        }
        
        console.log(`✅ ${osmData.length} éléments OSM chargés`);
        
        // Recherche spécifique 2LK
        const results = search2LKRestaurant(osmData);
        
        // Affichage résultats
        displayResults(results);
        
        // Recherche restaurants similaires
        findSimilarRestaurants(osmData);
        
        // Conclusion
        console.log("\n🎯 CONCLUSION:");
        if (results.length === 0) {
            console.log("❌ 2LK RESTAURANT-LOUNGE n'est PAS dans OpenStreetMap");
            console.log("💡 Solutions possibles:");
            console.log("   1. Ajouter manuellement en base");
            console.log("   2. Contribuer à OpenStreetMap");
            console.log("   3. Utiliser Google Places API");
        } else {
            console.log("✅ 2LK RESTAURANT trouvé dans les données OSM");
            console.log("💡 Le restaurant devrait apparaître dans le SQL généré");
        }
        
    } catch (error) {
        console.error(`❌ Erreur: ${error.message}`);
        process.exit(1);
    }
}

// Lancement
main();