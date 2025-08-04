#!/usr/bin/env node
/**
 * EXTRACTEUR GOOGLE PLACES API - VERSION BUDGET OPTIMISÉ
 * Utilise exactement $300 de crédit gratuit Google Cloud
 * Maximise le nombre de lieux avec le budget disponible
 */

const axios = require('axios');
const fs = require('fs');

// Configuration Budget
const GOOGLE_API_KEY = 'AIzaSyBGDz5BJkcTLY3x_96x8xuTxa7Gxd7BN6M';
const BUDGET_MAX = 300; // $300 crédit gratuit
const COST_NEARBY_SEARCH = 0.017; // $ par recherche
const COST_PLACE_DETAILS = 0.032; // $ par détail

const CONAKRY_CENTER = { lat: 9.537, lng: -13.677 };
const SEARCH_RADIUS = 50000; // 50km

// Types prioritaires (dans l'ordre d'importance pour taxi)
const PLACE_TYPES_PRIORITY = [
    'restaurant',           // Priorité 1 - Inclus 2LK
    'hospital',            // Priorité 1 - Destinations fréquentes
    'school',              // Priorité 1 - Destinations fréquentes  
    'bank',                // Priorité 1 - Destinations fréquentes
    'shopping_mall',       // Priorité 2
    'pharmacy',            // Priorité 2
    'lodging',             // Priorité 2 - Hôtels
    'gas_station',         // Priorité 3
    'tourist_attraction',  // Priorité 3
    'airport',             // Priorité 3
    'bus_station',         // Priorité 3
    'subway_station',      // Priorité 3
    'government',          // Priorité 4
    'place_of_worship'     // Priorité 4
];

let totalCost = 0;
let budgetRemaining = BUDGET_MAX;
let extractedPlaces = [];

/**
 * Calculer coût estimé avant recherche
 */
function estimateCost(expectedPlaces) {
    const searchCost = COST_NEARBY_SEARCH;
    const detailsCost = expectedPlaces * COST_PLACE_DETAILS;
    return searchCost + detailsCost;
}

/**
 * Recherche avec monitoring budget
 */
async function searchPlacesByTypeWithBudget(type) {
    console.log(`\n🔍 Recherche: ${type}`);
    console.log(`💰 Budget restant: $${budgetRemaining.toFixed(2)}`);
    
    // Coût minimum pour une recherche (1 résultat)
    const minCost = COST_NEARBY_SEARCH + COST_PLACE_DETAILS;
    
    if (budgetRemaining < minCost) {
        console.log(`⚠️  Budget insuffisant pour ${type} (min $${minCost.toFixed(3)})`);
        return [];
    }
    
    try {
        // Faire la recherche nearby
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location: `${CONAKRY_CENTER.lat},${CONAKRY_CENTER.lng}`,
                radius: SEARCH_RADIUS,
                type: type,
                key: GOOGLE_API_KEY
            }
        });
        
        // Décompter coût recherche
        totalCost += COST_NEARBY_SEARCH;
        budgetRemaining -= COST_NEARBY_SEARCH;
        
        if (response.data.status !== 'OK') {
            console.log(`❌ Erreur ${type}: ${response.data.status}`);
            return [];
        }
        
        const places = response.data.results;
        console.log(`📍 ${places.length} lieux trouvés pour ${type}`);
        
        // Calculer combien de détails on peut récupérer avec le budget restant
        const maxDetails = Math.floor(budgetRemaining / COST_PLACE_DETAILS);
        const placesToDetail = Math.min(places.length, maxDetails);
        
        console.log(`💸 Récupération détails: ${placesToDetail}/${places.length} lieux (budget: $${budgetRemaining.toFixed(2)})`);
        
        // Récupérer détails dans la limite du budget
        const detailedPlaces = [];
        for (let i = 0; i < placesToDetail; i++) {
            const place = places[i];
            const details = await getPlaceDetails(place.place_id);
            
            if (details) {
                detailedPlaces.push({
                    ...place,
                    details: details,
                    search_type: type
                });
            }
            
            // Décompter coût détail
            totalCost += COST_PLACE_DETAILS;
            budgetRemaining -= COST_PLACE_DETAILS;
            
            // Pause pour éviter rate limiting
            await sleep(100);
            
            // Vérifier budget restant
            if (budgetRemaining < COST_PLACE_DETAILS) {
                console.log(`⚠️  Budget épuisé après ${i + 1} détails`);
                break;
            }
        }
        
        console.log(`✅ ${detailedPlaces.length} lieux détaillés pour ${type}`);
        console.log(`💰 Coût ${type}: $${((placesToDetail * COST_PLACE_DETAILS) + COST_NEARBY_SEARCH).toFixed(2)}`);
        
        return detailedPlaces;
        
    } catch (error) {
        console.error(`❌ Erreur API ${type}:`, error.message);
        return [];
    }
}

/**
 * Récupérer détails d'un lieu
 */
async function getPlaceDetails(placeId) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,price_level,geometry,types',
                key: GOOGLE_API_KEY
            }
        });
        
        if (response.data.status === 'OK') {
            return response.data.result;
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Erreur détails ${placeId}:`, error.message);
        return null;
    }
}

/**
 * Générer rapport de coût
 */
function generateCostReport() {
    console.log(`\n💰 RAPPORT DE COÛT:`);
    console.log(`================`);
    console.log(`• Budget initial: $${BUDGET_MAX}`);
    console.log(`• Coût total: $${totalCost.toFixed(2)}`);
    console.log(`• Budget restant: $${budgetRemaining.toFixed(2)}`);
    console.log(`• Utilisation: ${((totalCost/BUDGET_MAX)*100).toFixed(1)}%`);
    
    if (budgetRemaining > 20) {
        console.log(`\n💡 SUGGESTION: Il reste $${budgetRemaining.toFixed(2)}`);
        console.log(`   Vous pouvez récupérer ~${Math.floor(budgetRemaining/COST_PLACE_DETAILS)} lieux supplémentaires`);
    }
}

/**
 * Recherche spécifique 2LK dans les résultats
 */
function search2LKRestaurant(places) {
    console.log(`\n🍽️  RECHERCHE 2LK RESTAURANT:`);
    
    const lk2Results = places.filter(place => {
        const name = place.name?.toLowerCase() || '';
        const address = place.details?.formatted_address?.toLowerCase() || '';
        
        return name.includes('2lk') || 
               name.includes('2 lk') ||
               address.includes('2lk') ||
               address.includes('2 lk');
    });
    
    if (lk2Results.length > 0) {
        console.log(`🎯 2LK TROUVÉ! ${lk2Results.length} résultat(s):`);
        lk2Results.forEach((place, index) => {
            console.log(`${index + 1}. ${place.name}`);
            console.log(`   📍 ${place.details?.formatted_address}`);
            console.log(`   📞 ${place.details?.formatted_phone_number || 'N/A'}`);
            console.log(`   ⭐ ${place.details?.rating || 'N/A'}/5`);
        });
    } else {
        console.log(`❌ 2LK RESTAURANT non trouvé`);
        console.log(`💡 Le restaurant pourrait:`);
        console.log(`   • Ne pas être sur Google Maps`);
        console.log(`   • Avoir un nom différent`);
        console.log(`   • Être dans une zone non couverte`);
    }
    
    return lk2Results;
}

/**
 * Convertir vers SQL Supabase
 */
function convertToSQL(places) {
    const sqlInserts = [];
    
    places.forEach((place, index) => {
        const name = (place.name || 'Sans nom').replace(/'/g, "''");
        const normalizedName = name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        const address = (place.details?.formatted_address || place.vicinity || '').replace(/'/g, "''");
        const lat = place.geometry?.location?.lat || place.details?.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng || place.details?.geometry?.location?.lng;
        const phone = (place.details?.formatted_phone_number || '').replace(/'/g, "''");
        const website = (place.details?.website || '').replace(/'/g, "''");
        const rating = place.rating || place.details?.rating || 0;
        const searchType = place.search_type || 'unknown';
        
        if (lat && lng) {
            const sql = `INSERT INTO adresses (
    nom, nom_normalise, adresse_complete, ville, position, type_lieu, 
    actif, popularite, source_donnees, telephone, site_web, note_moyenne
) VALUES (
    '${name}',
    '${normalizedName}',
    '${address}',
    'conakry',
    ST_GeogFromText('POINT(${lng} ${lat})'),
    '${getTypeMapping(place.types || [searchType])}',
    true,
    ${Math.round(rating * 20)},
    'google_places_api_budget',
    '${phone}',
    '${website}',
    ${rating}
) ON CONFLICT (nom, ville) DO UPDATE SET
    nom_normalise = EXCLUDED.nom_normalise,
    adresse_complete = EXCLUDED.adresse_complete,
    telephone = EXCLUDED.telephone,
    site_web = EXCLUDED.site_web,
    note_moyenne = EXCLUDED.note_moyenne;`;
            
            sqlInserts.push(sql);
        }
    });
    
    return sqlInserts;
}

/**
 * Mapper types Google vers nos catégories
 */
function getTypeMapping(googleTypes) {
    if (!googleTypes || googleTypes.length === 0) return 'autre';
    
    const typeMap = {
        'restaurant': 'restaurant',
        'hospital': 'hopital',
        'school': 'ecole',
        'bank': 'banque',
        'shopping_mall': 'centre_commercial',
        'gas_station': 'station_service',
        'pharmacy': 'pharmacie',
        'lodging': 'hotel',
        'tourist_attraction': 'attraction',
        'airport': 'aeroport',
        'bus_station': 'gare',
        'subway_station': 'transport',
        'government': 'administration',
        'place_of_worship': 'lieu_culte'
    };
    
    for (const type of googleTypes) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }
    
    return 'autre';
}

/**
 * Pause pour éviter rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale avec gestion budget
 */
async function main() {
    console.log('🔍 EXTRACTION GOOGLE PLACES API - VERSION BUDGET OPTIMISÉ');
    console.log('========================================================');
    console.log(`💰 Budget disponible: $${BUDGET_MAX}`);
    console.log(`🎯 Objectif: Maximiser les données Conakry`);
    
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
        console.log('\n❌ CONFIGURATION REQUISE:');
        console.log('1. Allez sur: https://console.cloud.google.com/');
        console.log('2. Créez un projet + activez Places API');
        console.log('3. Créez une clé API');
        console.log('4. Remplacez YOUR_GOOGLE_PLACES_API_KEY dans le script');
        console.log('5. Configurez la facturation (crédit $300 gratuit)');
        return;
    }
    
    // Extraction par ordre de priorité
    for (const type of PLACE_TYPES_PRIORITY) {
        if (budgetRemaining < (COST_NEARBY_SEARCH + COST_PLACE_DETAILS)) {
            console.log(`\n⚠️  Budget épuisé! Arrêt extraction`);
            break;
        }
        
        const places = await searchPlacesByTypeWithBudget(type);
        extractedPlaces.push(...places);
        
        // Pause entre types
        await sleep(1000);
    }
    
    console.log(`\n📊 RÉSULTATS FINAUX:`);
    console.log(`==================`);
    console.log(`✅ ${extractedPlaces.length} lieux extraits au total`);
    
    // Dédoublonner
    const uniquePlaces = extractedPlaces.filter((place, index, self) => 
        index === self.findIndex(p => p.place_id === place.place_id)
    );
    
    console.log(`✅ ${uniquePlaces.length} lieux uniques après dédoublonnage`);
    
    // Recherche 2LK
    const lk2Results = search2LKRestaurant(uniquePlaces);
    
    // Génération fichiers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON brut
    const jsonFile = `conakry_google_budget_${timestamp}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(uniquePlaces, null, 2));
    
    // SQL
    const sqlInserts = convertToSQL(uniquePlaces);
    const sqlFile = `conakry_google_budget_${timestamp}.sql`;
    
    const sqlContent = `-- EXTRACTION GOOGLE PLACES API CONAKRY - VERSION BUDGET
-- Date: ${new Date().toISOString()}
-- Lieux: ${uniquePlaces.length}
-- Coût: $${totalCost.toFixed(2)}/${BUDGET_MAX}
-- Source: Google Places API (crédit gratuit)

${sqlInserts.join('\n\n')}

-- Statistiques post-insertion
SELECT 
    type_lieu,
    COUNT(*) as nombre,
    ROUND(AVG(note_moyenne), 2) as note_moyenne,
    ROUND(AVG(popularite), 0) as popularite_moyenne
FROM adresses 
WHERE source_donnees = 'google_places_api_budget'
GROUP BY type_lieu
ORDER BY nombre DESC;

-- Vérification 2LK Restaurant
SELECT nom, adresse_complete, telephone, note_moyenne
FROM adresses 
WHERE nom ILIKE '%2lk%' 
   OR nom ILIKE '%2 lk%'
   AND source_donnees = 'google_places_api_budget';`;
    
    fs.writeFileSync(sqlFile, sqlContent);
    
    // Rapport coût
    generateCostReport();
    
    console.log(`\n📁 FICHIERS GÉNÉRÉS:`);
    console.log(`• Données brutes: ${jsonFile}`);
    console.log(`• Script SQL: ${sqlFile}`);
    
    console.log(`\n🎯 PROCHAINES ÉTAPES:`);
    if (lk2Results.length > 0) {
        console.log(`✅ 2LK trouvé! Exécutez le SQL dans Supabase`);
    } else {
        console.log(`❌ 2LK non trouvé. Options:`);
        console.log(`   1. Extraction complète ($20 supplémentaires)`);
        console.log(`   2. Ajout manuel 2LK en base`);
    }
    
    if (budgetRemaining > 50) {
        console.log(`💡 Budget restant élevé ($${budgetRemaining.toFixed(2)})`);
        console.log(`   Vous pouvez extraire plus de données!`);
    }
}

// Lancer extraction
main().catch(console.error);