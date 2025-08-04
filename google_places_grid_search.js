#!/usr/bin/env node
/**
 * EXTRACTEUR GOOGLE PLACES API - QUADRILLAGE EXHAUSTIF CONAKRY
 * Divise Conakry en grille pour récupérer TOUS les lieux sans exception
 * Combine plusieurs stratégies pour couverture maximale
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const GOOGLE_API_KEY = 'AIzaSyBGDz5BJkcTLY3x_96x8xuTxa7Gxd7BN6M';
const BUDGET_REMAINING = 268.04; // Budget restant après extraction précédente
const COST_NEARBY_SEARCH = 0.017;
const COST_TEXT_SEARCH = 0.032;
const COST_PLACE_DETAILS = 0.032;

// Limites géographiques de Conakry (étendues pour tout couvrir)
const CONAKRY_BOUNDS = {
    north: 9.75,    // Dubréka au nord
    south: 9.35,    // Îles au sud
    east: -13.45,   // Coyah à l'est
    west: -13.85    // Océan à l'ouest
};

// Calcul de la grille
const GRID_SIZE = 0.05; // ~5.5km par cellule (0.05° ≈ 5.5km à cette latitude)
const SEARCH_RADIUS = 4000; // 4km de rayon par cellule (chevauche pour ne rien rater)

// Types de lieux prioritaires
const PLACE_TYPES = [
    'restaurant', 'lodging', 'hospital', 'school', 'bank',
    'pharmacy', 'shopping_mall', 'gas_station', 'tourist_attraction',
    'store', 'supermarket', 'cafe', 'bar', 'night_club',
    'beauty_salon', 'car_repair', 'gym', 'mosque', 'church'
];

// Mots-clés pour recherche textuelle
const TEXT_SEARCHES = [
    // Restaurants par cuisine
    'restaurant Conakry', 'restaurant guinéen', 'restaurant libanais',
    'restaurant chinois', 'restaurant français', 'fast food',
    'poulet braisé', 'attieké poisson', 'restaurant africain',
    
    // Lieux spécifiques
    'lounge Conakry', 'bar lounge', '2LK', 'restaurant lounge',
    'boite de nuit', 'night club', 'discothèque',
    
    // Services
    'hôtel Conakry', 'clinique', 'pharmacie 24h', 'supermarché',
    'station essence', 'salon coiffure', 'pressing', 'cyber café',
    
    // Zones
    'Madina marché', 'Taouyah', 'Kipé', 'Ratoma', 'Matam',
    'Minière', 'Cosa', 'Hamdallaye', 'Bambeto', 'Koloma'
];

let totalCost = 0;
let budgetRemaining = BUDGET_REMAINING;
let allExtractedPlaces = [];
let processedPlaceIds = new Set();

/**
 * Générer les points de grille
 */
function generateGridPoints() {
    const points = [];
    
    for (let lat = CONAKRY_BOUNDS.south; lat <= CONAKRY_BOUNDS.north; lat += GRID_SIZE) {
        for (let lng = CONAKRY_BOUNDS.west; lng <= CONAKRY_BOUNDS.east; lng += GRID_SIZE) {
            points.push({
                lat: parseFloat(lat.toFixed(3)),
                lng: parseFloat(lng.toFixed(3)),
                zone: `Zone_${lat.toFixed(2)}_${lng.toFixed(2)}`
            });
        }
    }
    
    console.log(`📍 Grille générée: ${points.length} points de recherche`);
    console.log(`📏 Couverture: ${((CONAKRY_BOUNDS.north - CONAKRY_BOUNDS.south) * 111).toFixed(0)}km × ${((CONAKRY_BOUNDS.east - CONAKRY_BOUNDS.west) * 111).toFixed(0)}km`);
    
    return points;
}

/**
 * Recherche nearby pour un point de grille
 */
async function searchNearbyPoint(point, type) {
    if (budgetRemaining < COST_NEARBY_SEARCH) {
        return [];
    }
    
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location: `${point.lat},${point.lng}`,
                radius: SEARCH_RADIUS,
                type: type,
                key: GOOGLE_API_KEY
            }
        });
        
        totalCost += COST_NEARBY_SEARCH;
        budgetRemaining -= COST_NEARBY_SEARCH;
        
        if (response.data.status === 'OK') {
            return response.data.results.map(place => ({
                ...place,
                search_zone: point.zone,
                search_type: type,
                search_method: 'nearby'
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error(`❌ Erreur nearby ${point.zone} ${type}:`, error.message);
        return [];
    }
}

/**
 * Recherche textuelle
 */
async function searchText(query) {
    if (budgetRemaining < COST_TEXT_SEARCH) {
        return [];
    }
    
    console.log(`🔍 Recherche textuelle: "${query}"`);
    
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: query,
                location: '9.537,-13.677', // Centre Conakry
                radius: 50000,
                key: GOOGLE_API_KEY
            }
        });
        
        totalCost += COST_TEXT_SEARCH;
        budgetRemaining -= COST_TEXT_SEARCH;
        
        if (response.data.status === 'OK') {
            console.log(`✅ ${response.data.results.length} résultats pour "${query}"`);
            
            return response.data.results.map(place => ({
                ...place,
                search_query: query,
                search_method: 'text'
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error(`❌ Erreur text search "${query}":`, error.message);
        return [];
    }
}

/**
 * Récupérer les détails d'un lieu
 */
async function getPlaceDetails(placeId) {
    if (budgetRemaining < COST_PLACE_DETAILS) {
        return null;
    }
    
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,price_level,geometry,types,user_ratings_total,business_status',
                language: 'fr',
                key: GOOGLE_API_KEY
            }
        });
        
        totalCost += COST_PLACE_DETAILS;
        budgetRemaining -= COST_PLACE_DETAILS;
        
        if (response.data.status === 'OK') {
            return response.data.result;
        }
        
        return null;
        
    } catch (error) {
        return null;
    }
}

/**
 * Extraction par quadrillage complet
 */
async function gridSearchExtraction() {
    console.log('\n🗺️  PHASE 1: QUADRILLAGE SYSTÉMATIQUE');
    console.log('=====================================');
    
    const gridPoints = generateGridPoints();
    let totalPlacesGrid = 0;
    
    // Pour chaque type de lieu
    for (const type of PLACE_TYPES) {
        console.log(`\n📍 Recherche type: ${type}`);
        console.log(`💰 Budget: $${budgetRemaining.toFixed(2)}`);
        
        let typePlaces = 0;
        
        // Pour chaque point de la grille
        for (let i = 0; i < gridPoints.length; i++) {
            const point = gridPoints[i];
            
            if (budgetRemaining < COST_NEARBY_SEARCH) {
                console.log(`⚠️  Budget épuisé au point ${i}/${gridPoints.length}`);
                break;
            }
            
            const places = await searchNearbyPoint(point, type);
            
            // Filtrer les doublons
            const newPlaces = places.filter(p => !processedPlaceIds.has(p.place_id));
            newPlaces.forEach(p => processedPlaceIds.add(p.place_id));
            
            allExtractedPlaces.push(...newPlaces);
            typePlaces += newPlaces.length;
            
            // Progress
            if ((i + 1) % 10 === 0) {
                console.log(`   Zone ${i + 1}/${gridPoints.length}: ${typePlaces} ${type}(s) trouvé(s)`);
            }
            
            // Pause pour éviter rate limiting
            await sleep(50);
        }
        
        console.log(`✅ Total ${type}: ${typePlaces} lieux uniques`);
        totalPlacesGrid += typePlaces;
    }
    
    console.log(`\n✅ PHASE 1 TERMINÉE: ${totalPlacesGrid} lieux trouvés par quadrillage`);
}

/**
 * Extraction par recherche textuelle
 */
async function textSearchExtraction() {
    console.log('\n📝 PHASE 2: RECHERCHES TEXTUELLES CIBLÉES');
    console.log('=========================================');
    
    let totalPlacesText = 0;
    
    for (const query of TEXT_SEARCHES) {
        if (budgetRemaining < COST_TEXT_SEARCH) {
            console.log(`⚠️  Budget épuisé`);
            break;
        }
        
        const places = await searchText(query);
        
        // Filtrer doublons
        const newPlaces = places.filter(p => !processedPlaceIds.has(p.place_id));
        newPlaces.forEach(p => processedPlaceIds.add(p.place_id));
        
        allExtractedPlaces.push(...newPlaces);
        totalPlacesText += newPlaces.length;
        
        // Recherche spécifique 2LK
        if (query.toLowerCase().includes('2lk') && newPlaces.length > 0) {
            console.log(`🎯 2LK POTENTIELLEMENT TROUVÉ!`);
            newPlaces.forEach(p => {
                console.log(`   - ${p.name} à ${p.vicinity}`);
            });
        }
        
        await sleep(100);
    }
    
    console.log(`\n✅ PHASE 2 TERMINÉE: ${totalPlacesText} nouveaux lieux par recherche textuelle`);
}

/**
 * Récupération des détails
 */
async function fetchAllDetails() {
    console.log('\n📋 PHASE 3: RÉCUPÉRATION DES DÉTAILS');
    console.log('====================================');
    
    const placesWithDetails = [];
    const totalPlaces = allExtractedPlaces.length;
    
    console.log(`📊 ${totalPlaces} lieux à détailler`);
    console.log(`💰 Budget: $${budgetRemaining.toFixed(2)}`);
    
    for (let i = 0; i < totalPlaces; i++) {
        if (budgetRemaining < COST_PLACE_DETAILS) {
            console.log(`⚠️  Budget épuisé après ${i} détails`);
            break;
        }
        
        const place = allExtractedPlaces[i];
        const details = await getPlaceDetails(place.place_id);
        
        if (details) {
            placesWithDetails.push({
                ...place,
                details: details
            });
        }
        
        // Progress
        if ((i + 1) % 100 === 0) {
            console.log(`   Détails: ${i + 1}/${totalPlaces} (${((i + 1) / totalPlaces * 100).toFixed(1)}%)`);
        }
        
        await sleep(30);
    }
    
    console.log(`✅ ${placesWithDetails.length} lieux avec détails complets`);
    
    return placesWithDetails;
}

/**
 * Recherche exhaustive 2LK
 */
function search2LKFinal(places) {
    console.log('\n🔍 RECHERCHE FINALE 2LK');
    console.log('======================');
    
    const variations = [
        '2lk', '2 lk', 'deux lk', 'two lk',
        'restaurant lounge', 'lounge restaurant',
        '2lk restaurant', '2lk lounge'
    ];
    
    const results = [];
    
    places.forEach(place => {
        const name = (place.name || '').toLowerCase();
        const address = (place.details?.formatted_address || place.vicinity || '').toLowerCase();
        
        variations.forEach(v => {
            if (name.includes(v) || address.includes(v)) {
                if (!results.find(r => r.place_id === place.place_id)) {
                    results.push(place);
                }
            }
        });
    });
    
    if (results.length > 0) {
        console.log(`🎯 2LK TROUVÉ! ${results.length} résultat(s):`);
        results.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name}`);
            console.log(`   📍 ${p.details?.formatted_address || p.vicinity}`);
            console.log(`   📞 ${p.details?.formatted_phone_number || 'N/A'}`);
            console.log(`   ⭐ ${p.rating || p.details?.rating || 'N/A'}/5`);
        });
    } else {
        console.log(`❌ 2LK non trouvé malgré extraction exhaustive`);
    }
    
    return results;
}

/**
 * Générer SQL optimisé
 */
function generateSQL(places) {
    const sqlInserts = [];
    const seenPlaces = new Set();
    
    places.forEach(place => {
        const name = (place.name || 'Sans nom').replace(/'/g, "''");
        const placeKey = `${name.toLowerCase()}_${place.geometry?.location?.lat}_${place.geometry?.location?.lng}`;
        
        if (seenPlaces.has(placeKey)) return;
        seenPlaces.add(placeKey);
        
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
        const totalRatings = place.user_ratings_total || place.details?.user_ratings_total || 0;
        const searchZone = place.search_zone || '';
        const searchMethod = place.search_method || '';
        
        if (lat && lng) {
            const sql = `INSERT INTO adresses (
    nom, nom_normalise, adresse_complete, ville, position, type_lieu, 
    actif, popularite, source_donnees, telephone, site_web, note_moyenne,
    metadata
) VALUES (
    '${name}',
    '${normalizedName}',
    '${address}',
    'conakry',
    ST_GeogFromText('POINT(${lng} ${lat})'),
    '${getTypeMapping(place.types || [])}',
    true,
    ${Math.round(rating * 20 + Math.min(totalRatings / 10, 20))},
    'google_places_grid_search',
    '${phone}',
    '${website}',
    ${rating},
    '{"zone": "${searchZone}", "method": "${searchMethod}", "ratings": ${totalRatings}}'
) ON CONFLICT (nom, ville) DO UPDATE SET
    nom_normalise = EXCLUDED.nom_normalise,
    adresse_complete = EXCLUDED.adresse_complete,
    position = EXCLUDED.position,
    telephone = EXCLUDED.telephone,
    site_web = EXCLUDED.site_web,
    note_moyenne = EXCLUDED.note_moyenne,
    popularite = GREATEST(adresses.popularite, EXCLUDED.popularite),
    metadata = EXCLUDED.metadata;`;
            
            sqlInserts.push(sql);
        }
    });
    
    return sqlInserts;
}

/**
 * Mapper types Google
 */
function getTypeMapping(googleTypes) {
    if (!googleTypes || googleTypes.length === 0) return 'autre';
    
    const typeMap = {
        'restaurant': 'restaurant',
        'food': 'restaurant',
        'meal_takeaway': 'restaurant',
        'cafe': 'cafe',
        'bar': 'bar',
        'night_club': 'bar',
        'hospital': 'hopital',
        'health': 'hopital',
        'doctor': 'hopital',
        'school': 'ecole',
        'university': 'ecole',
        'bank': 'banque',
        'atm': 'banque',
        'shopping_mall': 'centre_commercial',
        'store': 'magasin',
        'supermarket': 'supermarche',
        'gas_station': 'station_service',
        'pharmacy': 'pharmacie',
        'lodging': 'hotel',
        'tourist_attraction': 'attraction',
        'airport': 'aeroport',
        'bus_station': 'gare',
        'transit_station': 'transport',
        'taxi_stand': 'station_taxi',
        'government': 'administration',
        'local_government_office': 'administration',
        'place_of_worship': 'lieu_culte',
        'church': 'lieu_culte',
        'mosque': 'lieu_culte',
        'beauty_salon': 'salon_beaute',
        'hair_care': 'salon_coiffure',
        'gym': 'sport',
        'car_repair': 'garage'
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
 * Fonction principale
 */
async function main() {
    console.log('🎯 EXTRACTION GOOGLE PLACES - QUADRILLAGE EXHAUSTIF CONAKRY');
    console.log('==========================================================');
    console.log(`💰 Budget disponible: $${BUDGET_REMAINING}`);
    console.log(`🗺️  Stratégie: Quadrillage + Recherche textuelle`);
    
    const startTime = Date.now();
    
    // Phase 1: Quadrillage systématique
    await gridSearchExtraction();
    
    // Phase 2: Recherches textuelles
    if (budgetRemaining > 10) {
        await textSearchExtraction();
    }
    
    // Phase 3: Récupération détails
    const placesWithDetails = await fetchAllDetails();
    
    // Recherche finale 2LK
    const lk2Results = search2LKFinal(placesWithDetails);
    
    // Statistiques finales
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n📊 STATISTIQUES FINALES');
    console.log('======================');
    console.log(`⏱️  Durée: ${duration} minutes`);
    console.log(`📍 Lieux extraits: ${processedPlaceIds.size}`);
    console.log(`📋 Avec détails: ${placesWithDetails.length}`);
    console.log(`💰 Coût total: $${totalCost.toFixed(2)}`);
    console.log(`💸 Budget restant: $${budgetRemaining.toFixed(2)}`);
    console.log(`📈 Coût/lieu: $${(totalCost / placesWithDetails.length).toFixed(4)}`);
    
    // Génération fichiers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON complet
    const jsonFile = `conakry_google_grid_${timestamp}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(placesWithDetails, null, 2));
    
    // SQL
    const sqlInserts = generateSQL(placesWithDetails);
    const sqlFile = `conakry_google_grid_${timestamp}.sql`;
    
    // Statistiques par zone
    const zoneStats = {};
    placesWithDetails.forEach(p => {
        const zone = p.search_zone || 'text_search';
        zoneStats[zone] = (zoneStats[zone] || 0) + 1;
    });
    
    const sqlContent = `-- EXTRACTION GOOGLE PLACES QUADRILLAGE EXHAUSTIF CONAKRY
-- Date: ${new Date().toISOString()}
-- Durée: ${duration} minutes
-- Lieux extraits: ${processedPlaceIds.size}
-- Lieux avec détails: ${placesWithDetails.length}
-- Coût: $${totalCost.toFixed(2)}
-- Méthode: Grille ${GRID_SIZE}° × ${GRID_SIZE}° + Recherches textuelles

-- STATISTIQUES PAR TYPE
${Object.entries(zoneStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([zone, count]) => `-- ${zone}: ${count} lieux`)
    .join('\n')}

${sqlInserts.join('\n\n')}

-- VÉRIFICATIONS POST-INSERTION

-- 1. Statistiques par type
SELECT 
    type_lieu,
    COUNT(*) as nombre,
    ROUND(AVG(note_moyenne), 2) as note_moy,
    ROUND(AVG(popularite), 0) as pop_moy,
    COUNT(CASE WHEN telephone != '' THEN 1 END) as avec_tel,
    COUNT(CASE WHEN site_web != '' THEN 1 END) as avec_web
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
GROUP BY type_lieu
ORDER BY nombre DESC;

-- 2. Couverture géographique
SELECT 
    ROUND(ST_Y(position::geometry), 2) as latitude,
    ROUND(ST_X(position::geometry), 2) as longitude,
    COUNT(*) as nombre_lieux
FROM adresses
WHERE source_donnees = 'google_places_grid_search'
GROUP BY ROUND(ST_Y(position::geometry), 2), ROUND(ST_X(position::geometry), 2)
ORDER BY latitude, longitude;

-- 3. Recherche 2LK et variantes
SELECT nom, adresse_complete, telephone, note_moyenne, 
       ST_Y(position::geometry) as lat, ST_X(position::geometry) as lng
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
  AND (
    nom ILIKE '%2lk%' OR nom ILIKE '%2 lk%' OR
    nom ILIKE '%lounge%' OR nom ILIKE '%restaurant lounge%' OR
    adresse_complete ILIKE '%2lk%'
  )
ORDER BY note_moyenne DESC;

-- 4. Top restaurants par note
SELECT nom, note_moyenne, popularite, telephone, adresse_complete
FROM adresses 
WHERE type_lieu = 'restaurant' 
  AND source_donnees = 'google_places_grid_search'
  AND note_moyenne > 0
ORDER BY note_moyenne DESC, popularite DESC
LIMIT 50;`;
    
    fs.writeFileSync(sqlFile, sqlContent);
    
    console.log(`\n📁 FICHIERS GÉNÉRÉS:`);
    console.log(`• JSON: ${jsonFile}`);
    console.log(`• SQL: ${sqlFile}`);
    
    if (lk2Results.length > 0) {
        console.log(`\n🎯 ACTION: 2LK trouvé! Exécuter le SQL pour l'ajouter`);
    } else {
        console.log(`\n💡 ACTION: Ajouter manuellement 2LK avec script séparé`);
    }
    
    console.log(`\n✅ EXTRACTION TERMINÉE!`);
}

// Lancer
main().catch(console.error);