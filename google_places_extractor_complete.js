#!/usr/bin/env node
/**
 * EXTRACTEUR GOOGLE PLACES API - VERSION COMPLÈTE
 * Utilise la pagination pour récupérer TOUS les lieux (pas seulement 20)
 * Budget restant: $292.66 après première extraction
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const GOOGLE_API_KEY = 'AIzaSyBGDz5BJkcTLY3x_96x8xuTxa7Gxd7BN6M';
const BUDGET_MAX = 292.66; // Budget restant après première extraction
const COST_NEARBY_SEARCH = 0.017;
const COST_PLACE_DETAILS = 0.032;

const CONAKRY_CENTER = { lat: 9.537, lng: -13.677 };
const SEARCH_RADIUS = 50000; // 50km

// Types prioritaires avec pagination complète
const PLACE_TYPES_PRIORITY = [
    'restaurant',           // Priorité 1 - TOUS les restaurants
    'hospital',            // Priorité 1 - TOUS les hôpitaux
    'school',              // Priorité 1 - TOUTES les écoles
    'bank',                // Priorité 1 - TOUTES les banques
    'shopping_mall',       // Priorité 2
    'pharmacy',            // Priorité 2 - TOUTES les pharmacies
    'lodging',             // Priorité 2 - TOUS les hôtels
    'gas_station',         // Priorité 3
    'tourist_attraction',  // Priorité 3
    'airport',             // Priorité 3
    'bus_station',         // Priorité 3
    'government',          // Priorité 4
    'place_of_worship',    // Priorité 4
    'establishment',       // Catégorie générale (tous commerces)
    'point_of_interest'    // Tous points d'intérêt
];

let totalCost = 0;
let budgetRemaining = BUDGET_MAX;
let extractedPlaces = [];

/**
 * Recherche avec pagination complète
 */
async function searchAllPlacesByType(type) {
    console.log(`\n🔍 Recherche COMPLÈTE: ${type}`);
    console.log(`💰 Budget restant: $${budgetRemaining.toFixed(2)}`);
    
    let allPlaces = [];
    let nextPageToken = null;
    let pageCount = 0;
    
    do {
        // Vérifier budget minimum
        if (budgetRemaining < COST_NEARBY_SEARCH) {
            console.log(`⚠️  Budget insuffisant pour continuer ${type}`);
            break;
        }
        
        pageCount++;
        console.log(`📄 Page ${pageCount} pour ${type}...`);
        
        try {
            const params = {
                location: `${CONAKRY_CENTER.lat},${CONAKRY_CENTER.lng}`,
                radius: SEARCH_RADIUS,
                type: type,
                key: GOOGLE_API_KEY
            };
            
            if (nextPageToken) {
                params.pagetoken = nextPageToken;
                // Attendre 2 secondes obligatoires pour pagetoken
                await sleep(2000);
            }
            
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
                params: params
            });
            
            // Décompter coût recherche
            totalCost += COST_NEARBY_SEARCH;
            budgetRemaining -= COST_NEARBY_SEARCH;
            
            if (response.data.status !== 'OK') {
                if (response.data.status === 'ZERO_RESULTS') {
                    console.log(`❌ Aucun résultat pour ${type}`);
                } else {
                    console.log(`❌ Erreur ${type}: ${response.data.status}`);
                }
                break;
            }
            
            const places = response.data.results;
            allPlaces.push(...places);
            nextPageToken = response.data.next_page_token;
            
            console.log(`📍 ${places.length} lieux trouvés (page ${pageCount})`);
            console.log(`📊 Total ${type}: ${allPlaces.length} lieux`);
            
            // Pause entre requêtes pour éviter rate limiting
            await sleep(100);
            
        } catch (error) {
            console.error(`❌ Erreur API ${type} page ${pageCount}:`, error.message);
            break;
        }
        
    } while (nextPageToken && budgetRemaining > COST_NEARBY_SEARCH);
    
    console.log(`✅ ${allPlaces.length} lieux TOTAL pour ${type} (${pageCount} pages)`);
    
    // Récupérer détails dans la limite du budget
    const maxDetails = Math.floor(budgetRemaining / COST_PLACE_DETAILS);
    const placesToDetail = Math.min(allPlaces.length, maxDetails);
    
    console.log(`💸 Récupération détails: ${placesToDetail}/${allPlaces.length} lieux`);
    
    const detailedPlaces = [];
    for (let i = 0; i < placesToDetail; i++) {
        const place = allPlaces[i];
        const details = await getPlaceDetails(place.place_id);
        
        if (details) {
            detailedPlaces.push({
                ...place,
                details: details,
                search_type: type
            });
        }
        
        totalCost += COST_PLACE_DETAILS;
        budgetRemaining -= COST_PLACE_DETAILS;
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
            console.log(`   Détails récupérés: ${i + 1}/${placesToDetail}`);
        }
        
        await sleep(50);
        
        if (budgetRemaining < COST_PLACE_DETAILS) {
            console.log(`⚠️  Budget épuisé après ${i + 1} détails`);
            break;
        }
    }
    
    console.log(`✅ ${detailedPlaces.length} lieux avec détails pour ${type}`);
    console.log(`💰 Coût total ${type}: $${((detailedPlaces.length * COST_PLACE_DETAILS) + (pageCount * COST_NEARBY_SEARCH)).toFixed(2)}`);
    
    return detailedPlaces;
}

/**
 * Récupérer détails d'un lieu
 */
async function getPlaceDetails(placeId) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,price_level,geometry,types,reviews',
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
 * Recherche exhaustive 2LK avec variations
 */
function searchExhaustive2LK(places) {
    console.log(`\n🔍 RECHERCHE EXHAUSTIVE 2LK:`);
    
    const searchVariations = [
        '2lk', '2 lk', 'two lk', 'deux lk',
        'restaurant lounge', 'lounge restaurant',
        'lk restaurant', 'lk lounge'
    ];
    
    const lk2Results = [];
    
    searchVariations.forEach(variation => {
        const matches = places.filter(place => {
            const name = place.name?.toLowerCase() || '';
            const address = place.details?.formatted_address?.toLowerCase() || '';
            const types = place.details?.types?.join(' ').toLowerCase() || '';
            
            return name.includes(variation) || 
                   address.includes(variation) ||
                   types.includes(variation);
        });
        
        if (matches.length > 0) {
            console.log(`✅ "${variation}": ${matches.length} résultat(s)`);
            matches.forEach(match => {
                if (!lk2Results.find(r => r.place_id === match.place_id)) {
                    lk2Results.push(match);
                }
            });
        }
    });
    
    if (lk2Results.length > 0) {
        console.log(`\n🎯 2LK TROUVÉ! ${lk2Results.length} résultat(s) unique(s):`);
        lk2Results.forEach((place, index) => {
            console.log(`${index + 1}. ${place.name}`);
            console.log(`   📍 ${place.details?.formatted_address}`);
            console.log(`   📞 ${place.details?.formatted_phone_number || 'N/A'}`);
            console.log(`   ⭐ ${place.details?.rating || 'N/A'}/5`);
            console.log(`   🏷️  Types: ${place.details?.types?.join(', ') || 'N/A'}`);
        });
    } else {
        console.log(`❌ 2LK toujours non trouvé malgré recherche exhaustive`);
    }
    
    return lk2Results;
}

/**
 * Convertir vers SQL avec gestion des duplicatas
 */
function convertToSQLAdvanced(places) {
    const sqlInserts = [];
    const seenNames = new Set();
    
    places.forEach((place, index) => {
        const name = (place.name || `Lieu ${index + 1}`).replace(/'/g, "''");
        const nameKey = name.toLowerCase().trim();
        
        // Éviter doublons exacts
        if (seenNames.has(nameKey)) {
            return;
        }
        seenNames.add(nameKey);
        
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
        const priceLevel = place.price_level || place.details?.price_level || 1;
        const searchType = place.search_type || 'unknown';
        const types = place.details?.types || [searchType];
        
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
    '${getTypeMapping(types)}',
    true,
    ${Math.round((rating * 20) + (priceLevel * 10))},
    'google_places_api_complete',
    '${phone}',
    '${website}',
    ${rating}
) ON CONFLICT (nom, ville) DO UPDATE SET
    nom_normalise = EXCLUDED.nom_normalise,
    adresse_complete = EXCLUDED.adresse_complete,
    telephone = EXCLUDED.telephone,
    site_web = EXCLUDED.site_web,
    note_moyenne = EXCLUDED.note_moyenne,
    popularite = EXCLUDED.popularite;`;
            
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
        'food': 'restaurant',
        'meal_takeaway': 'restaurant',
        'hospital': 'hopital',
        'health': 'hopital',
        'school': 'ecole',
        'university': 'ecole',
        'bank': 'banque',
        'atm': 'banque',
        'shopping_mall': 'centre_commercial',
        'store': 'magasin',
        'gas_station': 'station_service',
        'pharmacy': 'pharmacie',
        'lodging': 'hotel',
        'tourist_attraction': 'attraction',
        'airport': 'aeroport',
        'bus_station': 'gare',
        'transit_station': 'transport',
        'government': 'administration',
        'local_government_office': 'administration',
        'place_of_worship': 'lieu_culte',
        'church': 'lieu_culte',
        'mosque': 'lieu_culte'
    };
    
    for (const type of googleTypes) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }
    
    return 'autre';
}

/**
 * Pause
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale extraction complète
 */
async function main() {
    console.log('🔍 EXTRACTION GOOGLE PLACES API - VERSION COMPLÈTE');
    console.log('==================================================');
    console.log(`💰 Budget disponible: $${BUDGET_MAX}`);
    console.log(`🎯 Objectif: Extraire TOUS les lieux de Conakry`);
    
    // Extraction complète par type avec pagination
    for (const type of PLACE_TYPES_PRIORITY) {
        if (budgetRemaining < (COST_NEARBY_SEARCH + COST_PLACE_DETAILS)) {
            console.log(`\n⚠️  Budget épuisé! Arrêt extraction`);
            break;
        }
        
        const places = await searchAllPlacesByType(type);
        extractedPlaces.push(...places);
        
        // Pause entre types
        await sleep(1000);
    }
    
    console.log(`\n📊 RÉSULTATS FINAUX:`);
    console.log(`==================`);
    console.log(`✅ ${extractedPlaces.length} lieux extraits au total`);
    
    // Dédoublonner par place_id
    const uniquePlaces = extractedPlaces.filter((place, index, self) => 
        index === self.findIndex(p => p.place_id === place.place_id)
    );
    
    console.log(`✅ ${uniquePlaces.length} lieux uniques après dédoublonnage`);
    
    // Recherche exhaustive 2LK
    const lk2Results = searchExhaustive2LK(uniquePlaces);
    
    // Génération fichiers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON brut complet
    const jsonFile = `conakry_google_complete_${timestamp}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(uniquePlaces, null, 2));
    
    // SQL complet
    const sqlInserts = convertToSQLAdvanced(uniquePlaces);
    const sqlFile = `conakry_google_complete_${timestamp}.sql`;
    
    const sqlContent = `-- EXTRACTION GOOGLE PLACES API CONAKRY - VERSION COMPLÈTE
-- Date: ${new Date().toISOString()}
-- Lieux: ${uniquePlaces.length}
-- Coût: $${totalCost.toFixed(2)}
-- Source: Google Places API (extraction complète)

${sqlInserts.join('\n\n')}

-- Statistiques détaillées post-insertion
SELECT 
    type_lieu,
    COUNT(*) as nombre,
    ROUND(AVG(note_moyenne), 2) as note_moyenne,
    ROUND(AVG(popularite), 0) as popularite_moyenne,
    COUNT(CASE WHEN telephone != '' THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN site_web != '' THEN 1 END) as avec_site_web
FROM adresses 
WHERE source_donnees = 'google_places_api_complete'
GROUP BY type_lieu
ORDER BY nombre DESC;

-- Recherche complète 2LK avec variations
SELECT nom, adresse_complete, telephone, note_moyenne, type_lieu
FROM adresses 
WHERE (
    nom ILIKE '%2lk%' OR nom ILIKE '%2 lk%' OR
    nom ILIKE '%two lk%' OR nom ILIKE '%deux lk%' OR
    adresse_complete ILIKE '%2lk%' OR
    adresse_complete ILIKE '%lounge%'
) AND source_donnees = 'google_places_api_complete';

-- Top 20 restaurants par note
SELECT nom, note_moyenne, telephone, adresse_complete
FROM adresses 
WHERE type_lieu = 'restaurant' 
  AND source_donnees = 'google_places_api_complete'
  AND note_moyenne > 0
ORDER BY note_moyenne DESC, popularite DESC
LIMIT 20;`;
    
    fs.writeFileSync(sqlFile, sqlContent);
    
    // Rapport final
    console.log(`\n💰 RAPPORT FINAL:`);
    console.log(`===============`);
    console.log(`• Budget initial: $${BUDGET_MAX}`);
    console.log(`• Coût total: $${totalCost.toFixed(2)}`);
    console.log(`• Budget restant: $${budgetRemaining.toFixed(2)}`);
    console.log(`• Lieux extraits: ${uniquePlaces.length}`);
    console.log(`• Coût par lieu: $${(totalCost/uniquePlaces.length).toFixed(4)}`);
    
    console.log(`\n📁 FICHIERS GÉNÉRÉS:`);
    console.log(`• Données brutes: ${jsonFile}`);
    console.log(`• Script SQL: ${sqlFile}`);
    
    console.log(`\n🎯 RÉSULTAT 2LK:`);
    if (lk2Results.length > 0) {
        console.log(`✅ 2LK trouvé! Injection SQL recommandée`);
    } else {
        console.log(`❌ 2LK non trouvé même avec extraction complète`);
        console.log(`💡 Recommandation: Ajout manuel avec coordonnées précises`);
    }
}

// Lancer extraction complète
main().catch(console.error);