#!/usr/bin/env node
/**
 * EXTRACTEUR GOOGLE PLACES API POUR CONAKRY
 * Récupère tous les POI importants pour bot taxi
 * Coût estimé: $50-100 pour extraction complète
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const GOOGLE_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY'; // À obtenir sur Google Cloud Console
const CONAKRY_CENTER = { lat: 9.537, lng: -13.677 };
const SEARCH_RADIUS = 50000; // 50km pour couvrir tout Conakry

// Types de lieux importants pour taxi
const PLACE_TYPES = [
    'restaurant',
    'hospital', 
    'school',
    'bank',
    'shopping_mall',
    'gas_station',
    'pharmacy',
    'lodging', // hôtels
    'tourist_attraction',
    'airport',
    'bus_station',
    'subway_station',
    'government',
    'place_of_worship'
];

/**
 * Recherche par type de lieu
 */
async function searchPlacesByType(type) {
    console.log(`🔍 Recherche: ${type}...`);
    
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location: `${CONAKRY_CENTER.lat},${CONAKRY_CENTER.lng}`,
                radius: SEARCH_RADIUS,
                type: type,
                key: GOOGLE_API_KEY
            }
        });
        
        if (response.data.status !== 'OK') {
            console.log(`❌ Erreur ${type}: ${response.data.status}`);
            return [];
        }
        
        const places = response.data.results;
        console.log(`✅ ${places.length} lieux trouvés pour ${type}`);
        
        // Récupérer détails complets pour chaque lieu
        const detailedPlaces = [];
        for (const place of places) {
            const details = await getPlaceDetails(place.place_id);
            if (details) {
                detailedPlaces.push({
                    ...place,
                    details: details
                });
            }
            
            // Pause pour éviter rate limiting
            await sleep(100);
        }
        
        return detailedPlaces;
        
    } catch (error) {
        console.error(`❌ Erreur API ${type}:`, error.message);
        return [];
    }
}

/**
 * Récupérer détails complets d'un lieu
 */
async function getPlaceDetails(placeId) {
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,price_level,geometry',
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
 * Convertir en format SQL Supabase
 */
function convertToSQL(places) {
    const sqlInserts = [];
    
    places.forEach(place => {
        const name = place.name?.replace(/'/g, "''") || 'Sans nom';
        const normalizedName = name.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        const address = place.details?.formatted_address?.replace(/'/g, "''") || place.vicinity?.replace(/'/g, "''") || '';
        const lat = place.geometry?.location?.lat || place.details?.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng || place.details?.geometry?.location?.lng;
        const phone = place.details?.formatted_phone_number?.replace(/'/g, "''") || '';
        const website = place.details?.website?.replace(/'/g, "''") || '';
        const rating = place.rating || place.details?.rating || 0;
        const priceLevel = place.price_level || place.details?.price_level || 1;
        
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
                '${getTypeMapping(place.types)}',
                true,
                ${Math.round(rating * 20)}, -- Convertir note/5 en popularité/100
                'google_places_api',
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
    if (!googleTypes) return 'autre';
    
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
 * Pause (éviter rate limiting)
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale
 */
async function main() {
    console.log('🔍 EXTRACTION GOOGLE PLACES API - CONAKRY');
    console.log('==========================================');
    
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
        console.log('❌ Erreur: Configurez votre GOOGLE_API_KEY');
        console.log('💡 Obtenez une clé sur: https://console.cloud.google.com/');
        console.log('💡 Activez: Places API');
        return;
    }
    
    const allPlaces = [];
    
    // Rechercher par type
    for (const type of PLACE_TYPES) {
        const places = await searchPlacesByType(type);
        allPlaces.push(...places);
        
        // Pause entre types
        await sleep(1000);
    }
    
    console.log(`\n📊 RÉSULTATS:`);
    console.log(`✅ ${allPlaces.length} lieux extraits au total`);
    
    // Dédoublonner par place_id
    const uniquePlaces = allPlaces.filter((place, index, self) => 
        index === self.findIndex(p => p.place_id === place.place_id)
    );
    
    console.log(`✅ ${uniquePlaces.length} lieux uniques après dédoublonnage`);
    
    // Sauvegarder JSON brut
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = `conakry_google_places_${timestamp}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(uniquePlaces, null, 2));
    console.log(`💾 Données brutes: ${jsonFile}`);
    
    // Convertir en SQL
    const sqlInserts = convertToSQL(uniquePlaces);
    const sqlFile = `conakry_google_places_${timestamp}.sql`;
    
    const sqlContent = `-- EXTRACTION GOOGLE PLACES API CONAKRY
-- Date: ${new Date().toISOString()}
-- Lieux: ${uniquePlaces.length}
-- Source: Google Places API

${sqlInserts.join('\n\n')}

-- Vérification post-insertion
SELECT 
    type_lieu,
    COUNT(*) as nombre,
    AVG(note_moyenne) as note_moyenne
FROM adresses 
WHERE source_donnees = 'google_places_api'
GROUP BY type_lieu
ORDER BY nombre DESC;`;
    
    fs.writeFileSync(sqlFile, sqlContent);
    console.log(`💾 Script SQL: ${sqlFile}`);
    
    // Recherche spécifique 2LK
    const lk2Results = uniquePlaces.filter(place => 
        place.name?.toLowerCase().includes('2lk') ||
        place.name?.toLowerCase().includes('2 lk')
    );
    
    if (lk2Results.length > 0) {
        console.log(`\n🎯 2LK RESTAURANT TROUVÉ!`);
        lk2Results.forEach(place => {
            console.log(`✅ ${place.name} - ${place.details?.formatted_address}`);
        });
    } else {
        console.log(`\n❌ 2LK RESTAURANT pas trouvé dans Google Places`);
        console.log(`💡 Le restaurant pourrait ne pas être référencé sur Google Maps`);
    }
    
    console.log(`\n💰 COÛT ESTIMÉ:`);
    console.log(`• Recherches: ${PLACE_TYPES.length} × $0.017 = $${(PLACE_TYPES.length * 0.017).toFixed(2)}`);
    console.log(`• Détails: ${uniquePlaces.length} × $0.032 = $${(uniquePlaces.length * 0.032).toFixed(2)}`);
    console.log(`• TOTAL: ~$${(PLACE_TYPES.length * 0.017 + uniquePlaces.length * 0.032).toFixed(2)}`);
}

// Lancer l'extraction
main().catch(console.error);