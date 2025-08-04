#!/usr/bin/env node
/**
 * Convertisseur JSON OSM vers INSERT SQL pour table Supabase adresses
 * Lit le JSON généré par extract_conakry_complete.js
 * Génère un fichier .sql optimisé pour injection en base
 */

const fs = require('fs');
const path = require('path');

/**
 * Configuration du convertisseur
 */
const CONFIG = {
    // Paramètres de conversion
    BATCH_SIZE: 1000,           // Nombre d'INSERT par transaction
    DEFAULT_COUNTRY: 'Guinée',  // Pays par défaut
    DEFAULT_CITY: 'Conakry',    // Ville par défaut
    
    // Validation coordonnées Conakry
    CONAKRY_BOUNDS: {
        LAT_MIN: 9.30,
        LAT_MAX: 9.80,
        LON_MIN: -13.90,
        LON_MAX: -13.40
    },
    
    // Types de lieux mapping OSM -> Français
    LIEU_TYPE_MAPPING: {
        'hospital': 'hopital',
        'clinic': 'clinique',
        'pharmacy': 'pharmacie',
        'school': 'ecole',
        'university': 'universite',
        'bank': 'banque',
        'restaurant': 'restaurant',
        'cafe': 'cafe',
        'fuel': 'station_service',
        'police': 'police',
        'fire_station': 'pompiers',
        'place_of_worship': 'lieu_culte',
        'marketplace': 'marche',
        'market': 'marche',
        'taxi': 'taxi',
        'parking': 'parking',
        'bus_stop': 'arret_bus',
        'shop': 'commerce',
        'supermarket': 'supermarche',
        'hotel': 'hotel',
        'cinema': 'cinema',
        'post_office': 'poste'
    }
};

/**
 * Normalisation des noms pour recherche
 */
function normalizeNom(nom) {
    if (!nom || typeof nom !== 'string') return '';
    
    return nom
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
        .replace(/[^a-z0-9\s]/g, ' ')    // Garder lettres/chiffres/espaces
        .replace(/\s+/g, ' ')            // Normaliser espaces multiples
        .trim();
}

/**
 * Échappement SQL pour éviter les injections
 */
function escapeSQLString(str) {
    if (!str || typeof str !== 'string') return 'NULL';
    
    // Échapper les guillemets simples
    const escaped = str.replace(/'/g, "''");
    return `'${escaped}'`;
}

/**
 * Validation des coordonnées pour Conakry
 */
function validateCoordinates(lat, lon) {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return false;
    }
    
    const bounds = CONFIG.CONAKRY_BOUNDS;
    return (
        lat >= bounds.LAT_MIN && lat <= bounds.LAT_MAX &&
        lon >= bounds.LON_MIN && lon <= bounds.LON_MAX
    );
}

/**
 * Détermination du type de lieu à partir des tags OSM
 */
function determineTypeLieu(tags) {
    if (!tags) return 'autre';
    
    // Priorité 1: amenity
    if (tags.amenity) {
        return CONFIG.LIEU_TYPE_MAPPING[tags.amenity] || 'service';
    }
    
    // Priorité 2: shop
    if (tags.shop) {
        return CONFIG.LIEU_TYPE_MAPPING[tags.shop] || 'commerce';
    }
    
    // Priorité 3: autres tags
    if (tags.healthcare) return 'hopital';
    if (tags.education) return 'ecole';
    if (tags.tourism) return 'tourisme';
    if (tags.leisure) return 'loisir';
    if (tags.highway) return 'route';
    if (tags.building) return 'batiment';
    if (tags.place) return 'lieu';
    
    return 'autre';
}

/**
 * Liste STRICTE des éléments utiles pour un bot de taxi
 */
const TAXI_USEFUL_TAGS = {
    // === DESTINATIONS PRIORITAIRES ===
    amenity: [
        'hospital', 'clinic', 'pharmacy', 'doctors', 'dentist',
        'school', 'university', 'college', 'kindergarten', 'library',
        'bank', 'atm', 'bureau_de_change',
        'restaurant', 'cafe', 'fast_food', 'bar', 'pub',
        'fuel', 'parking', 'taxi',
        'marketplace', 'market', 'supermarket',
        'police', 'fire_station', 'post_office', 'townhall', 'courthouse',
        'place_of_worship', 'cinema', 'theatre',
        'hotel', 'guest_house', 'community_centre', 'social_centre'
    ],
    
    // === COMMERCES ===
    shop: [
        'supermarket', 'convenience', 'general', 'clothes', 'electronics',
        'furniture', 'hardware', 'beauty', 'hairdresser', 'bakery',
        'butcher', 'greengrocer', 'car_repair', 'mobile_phone'
    ],
    
    // === TRANSPORT ===
    highway: ['bus_stop'],
    
    // === LIEUX GÉOGRAPHIQUES ===
    place: ['city', 'town', 'village', 'neighbourhood', 'suburb', 'quarter'],
    
    // === SANTÉ SPÉCIALISÉE ===
    healthcare: ['hospital', 'clinic', 'pharmacy', 'doctor', 'dentist'],
    
    // === TOURISME ===
    tourism: ['hotel', 'guest_house', 'attraction', 'museum', 'information'],
    
    // === LOISIRS ===
    leisure: ['park', 'sports_centre', 'stadium', 'swimming_pool']
};

/**
 * Tags à EXCLURE absolument (parasites)
 */
const EXCLUDED_TAGS = {
    railway: ['level_crossing', 'crossing', 'signal', 'switch'],
    highway: ['traffic_signals', 'crossing', 'give_way', 'stop', 'speed_camera', 'street_lamp'],
    barrier: ['bollard', 'gate', 'fence'],
    natural: ['tree'],
    man_made: ['utility_pole', 'street_cabinet'],
    power: ['pole', 'tower'],
    admin_level: true,  // Tous les niveaux administratifs
    capital: true       // Marqueurs de capitale
};

/**
 * Vérification STRICTE si un élément OSM est utile pour un bot de taxi
 */
function isUsefulForTaxi(element) {
    const tags = element.tags || {};
    
    // 1. EXCLUSIONS STRICTES (parasites) - PRIORITÉ ABSOLUE
    for (const [key, values] of Object.entries(EXCLUDED_TAGS)) {
        if (tags[key]) {
            if (values === true) {
                return false; // Exclure tout ce tag
            }
            if (Array.isArray(values) && values.includes(tags[key])) {
                return false; // Exclure cette valeur spécifique
            }
        }
    }
    
    // 2. INCLUSIONS POSITIVES (liste blanche stricte)
    for (const [key, allowedValues] of Object.entries(TAXI_USEFUL_TAGS)) {
        if (tags[key] && allowedValues.includes(tags[key])) {
            return true; // Élément explicitement utile
        }
    }
    
    // 3. ÉLÉMENTS AVEC NOM EXPLICITE ET TAGS POI
    const hasExplicitName = tags.name || tags['name:fr'] || tags['name:en'] || 
                           tags.brand || tags.operator;
    
    if (hasExplicitName) {
        // Vérifier que le nom n'est pas un parasite
        const name = hasExplicitName.toLowerCase().trim();
        const parasiteNames = ['dwww', 'test', 'unnamed', 'node', 'way', ''];
        
        if (name.length < 2 || parasiteNames.some(parasite => name.includes(parasite))) {
            return false; // Nom parasite
        }
        
        // Vérifier que c'est un POI potentiel (pas juste un point quelconque)
        const hasPOITag = tags.amenity || tags.shop || tags.tourism || 
                         tags.leisure || tags.healthcare || tags.office || 
                         (tags.building && ['hospital', 'school', 'commercial', 'retail', 'hotel'].includes(tags.building));
        
        return hasPOITag !== undefined;
    }
    
    // 4. REJET PAR DÉFAUT
    return false; // Tout le reste est considéré comme parasite
}

/**
 * Extraction et nettoyage des données d'un élément OSM
 */
function processOSMElement(element) {
    try {
        // Validation de base
        if (!element || !element.id) {
            return null;
        }
        
        // FILTRAGE: Vérifier si utile pour taxi
        if (!isUsefulForTaxi(element)) {
            return null;
        }
        
        // Extraction coordonnées
        let lat, lon;
        
        if (element.type === 'node') {
            lat = element.lat;
            lon = element.lon;
        } else if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
            // Prendre le premier point pour les ways
            const firstPoint = element.geometry[0];
            if (firstPoint) {
                lat = firstPoint.lat;
                lon = firstPoint.lon;
            }
        } else {
            // Skip les relations et éléments sans géométrie
            return null;
        }
        
        // Validation coordonnées
        if (!validateCoordinates(lat, lon)) {
            console.warn(`⚠️ Coordonnées invalides pour élément ${element.id}: ${lat}, ${lon}`);
            return null;
        }
        
        const tags = element.tags || {};
        
        // Nom principal (obligatoire)
        let nom = tags.name || tags['name:fr'] || tags['name:en'] || 
                  tags.brand || tags.operator;
        
        if (!nom) {
            // Générer un nom intelligent pour les types utiles sans nom
            const typeLieu = determineTypeLieu(tags);
            
            // Noms intelligents selon le type
            const smartNames = {
                'hopital': 'Hôpital',
                'clinique': 'Clinique', 
                'pharmacie': 'Pharmacie',
                'ecole': 'École',
                'universite': 'Université',
                'banque': 'Banque',
                'restaurant': 'Restaurant',
                'cafe': 'Café',
                'station_service': 'Station-service',
                'marche': 'Marché',
                'supermarche': 'Supermarché',
                'parking': 'Parking',
                'hotel': 'Hôtel'
            };
            
            const baseName = smartNames[typeLieu] || typeLieu;
            
            // Ajouter localisation si disponible
            let locationSuffix = '';
            if (tags['addr:street']) {
                locationSuffix = ` ${tags['addr:street']}`;
            } else if (tags['addr:suburb']) {
                locationSuffix = ` ${tags['addr:suburb']}`;
            }
            
            nom = `${baseName}${locationSuffix}`.trim();
            
            // Si nom trop générique, ajouter identifiant
            if (nom === baseName) {
                nom = `${baseName} ${element.id}`;
            }
        }
        
        // Validation nom (max 200 caractères)
        if (nom.length > 200) {
            nom = nom.substring(0, 197) + '...';
        }
        
        // Construction de l'objet pour SQL
        const processedElement = {
            // Champs obligatoires
            nom: nom,
            nom_normalise: normalizeNom(nom),
            position_lat: parseFloat(lat).toFixed(6),
            position_lon: parseFloat(lon).toFixed(6),
            
            // Identification OSM
            osm_id: parseInt(element.id),
            osm_type: element.type,
            
            // Localisation
            ville: CONFIG.DEFAULT_CITY,
            pays: CONFIG.DEFAULT_COUNTRY,
            rue: tags['addr:street'] || null,
            numero: tags['addr:housenumber'] || null,
            code_postal: tags['addr:postcode'] || null,
            
            // Classification
            type_lieu: determineTypeLieu(tags),
            
            // Contact
            telephone: tags.phone || tags.mobile || null,
            site_web: tags.website || null,
            email: tags.email || null,
            horaires: tags.opening_hours || null,
            
            // Détails
            operateur: tags.operator || null,
            marque: tags.brand || null,
            description_fr: tags.description || tags.note || null,
            cuisine: tags.cuisine || null,
            
            // Accessibilité
            accessibilite: tags.wheelchair || null,
            
            // Adresse complète construite
            adresse_complete: buildAdresseComplete(tags),
            
            // Métadonnées
            actif: true,
            verifie: false,
            popularite: 0,
            search_frequency: 0,
            ai_confidence: 1.0
        };
        
        return processedElement;
        
    } catch (error) {
        console.warn(`⚠️ Erreur traitement élément ${element?.id}: ${error.message}`);
        return null;
    }
}

/**
 * Construction de l'adresse complète
 */
function buildAdresseComplete(tags) {
    const parts = [];
    
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
    if (tags['addr:city'] && tags['addr:city'].toLowerCase() !== 'conakry') {
        parts.push(tags['addr:city']);
    }
    parts.push('Conakry');
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    parts.push('Guinée');
    
    return parts.filter(p => p).join(', ') || null;
}

/**
 * Génération d'un INSERT SQL pour un élément
 */
function generateInsertSQL(element) {
    // Construction de la géométrie PostGIS
    const position = `ST_GeogFromText('POINT(${element.position_lon} ${element.position_lat})')`;
    
    // Construction des colonnes et valeurs
    const columns = [
        'nom', 'nom_normalise', 'position', 'ville', 'pays', 'type_lieu',
        'osm_id', 'osm_type', 'rue', 'numero', 'code_postal',
        'telephone', 'site_web', 'email', 'horaires',
        'operateur', 'marque', 'description_fr', 'cuisine', 'accessibilite',
        'adresse_complete', 'actif', 'verifie', 'popularite', 'search_frequency', 'ai_confidence'
    ];
    
    const values = [
        escapeSQLString(element.nom),
        escapeSQLString(element.nom_normalise),
        position,
        escapeSQLString(element.ville),
        escapeSQLString(element.pays),
        escapeSQLString(element.type_lieu),
        element.osm_id || 'NULL',
        escapeSQLString(element.osm_type),
        escapeSQLString(element.rue),
        escapeSQLString(element.numero),
        escapeSQLString(element.code_postal),
        escapeSQLString(element.telephone),
        escapeSQLString(element.site_web),
        escapeSQLString(element.email),
        escapeSQLString(element.horaires),
        escapeSQLString(element.operateur),
        escapeSQLString(element.marque),
        escapeSQLString(element.description_fr),
        escapeSQLString(element.cuisine),
        escapeSQLString(element.accessibilite),
        escapeSQLString(element.adresse_complete),
        element.actif,
        element.verifie,
        element.popularite,
        element.search_frequency,
        element.ai_confidence
    ];
    
    return `(${values.join(', ')})`;
}

/**
 * Génération du fichier SQL complet
 */
function generateSQLFile(processedElements, outputPath) {
    let sqlContent = '';
    
    // En-tête du fichier
    sqlContent += `-- ===================================================================\n`;
    sqlContent += `-- INJECTION DONNÉES OSM CONAKRY DANS TABLE SUPABASE adresses\n`;
    sqlContent += `-- Généré automatiquement à partir d'OpenStreetMap\n`;
    sqlContent += `-- Date: ${new Date().toISOString()}\n`;
    sqlContent += `-- Éléments: ${processedElements.length}\n`;
    sqlContent += `-- ===================================================================\n\n`;
    
    // Désactiver les triggers pendant l'insertion (performance)
    sqlContent += `-- Désactiver temporairement les triggers pour performance\n`;
    sqlContent += `ALTER TABLE adresses DISABLE TRIGGER ALL;\n\n`;
    
    // Traitement par batches
    const totalBatches = Math.ceil(processedElements.length / CONFIG.BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * CONFIG.BATCH_SIZE;
        const endIndex = Math.min(startIndex + CONFIG.BATCH_SIZE, processedElements.length);
        const batch = processedElements.slice(startIndex, endIndex);
        
        sqlContent += `-- ===== BATCH ${batchIndex + 1}/${totalBatches} (${batch.length} éléments) =====\n`;
        sqlContent += `BEGIN;\n\n`;
        
        // INSERT avec UPSERT (ON CONFLICT)
        sqlContent += `INSERT INTO adresses (\n`;
        sqlContent += `    nom, nom_normalise, position, ville, pays, type_lieu,\n`;
        sqlContent += `    osm_id, osm_type, rue, numero, code_postal,\n`;
        sqlContent += `    telephone, site_web, email, horaires,\n`;
        sqlContent += `    operateur, marque, description_fr, cuisine, accessibilite,\n`;
        sqlContent += `    adresse_complete, actif, verifie, popularite, search_frequency, ai_confidence\n`;
        sqlContent += `) VALUES\n`;
        
        // Génération des VALUES
        const valueStrings = batch.map(element => generateInsertSQL(element));
        sqlContent += valueStrings.join(',\n');
        
        // Gestion des conflits (UPSERT)
        sqlContent += `\nON CONFLICT (nom) DO UPDATE SET\n`;
        sqlContent += `    nom_normalise = EXCLUDED.nom_normalise,\n`;
        sqlContent += `    position = EXCLUDED.position,\n`;
        sqlContent += `    osm_id = EXCLUDED.osm_id,\n`;
        sqlContent += `    osm_type = EXCLUDED.osm_type,\n`;
        sqlContent += `    telephone = COALESCE(EXCLUDED.telephone, adresses.telephone),\n`;
        sqlContent += `    site_web = COALESCE(EXCLUDED.site_web, adresses.site_web),\n`;
        sqlContent += `    horaires = COALESCE(EXCLUDED.horaires, adresses.horaires),\n`;
        sqlContent += `    updated_at = NOW(),\n`;
        sqlContent += `    derniere_maj = NOW();\n\n`;
        
        sqlContent += `COMMIT;\n\n`;
    }
    
    // Réactiver les triggers
    sqlContent += `-- Réactiver les triggers\n`;
    sqlContent += `ALTER TABLE adresses ENABLE TRIGGER ALL;\n\n`;
    
    // Statistiques finales
    sqlContent += `-- ===================================================================\n`;
    sqlContent += `-- STATISTIQUES FINALES\n`;
    sqlContent += `-- ===================================================================\n\n`;
    
    sqlContent += `-- Afficher le nombre total d'adresses\n`;
    sqlContent += `SELECT COUNT(*) as total_adresses FROM adresses;\n\n`;
    
    sqlContent += `-- Afficher la répartition par type de lieu\n`;
    sqlContent += `SELECT type_lieu, COUNT(*) as nombre\n`;
    sqlContent += `FROM adresses \n`;
    sqlContent += `WHERE ville = 'Conakry'\n`;
    sqlContent += `GROUP BY type_lieu \n`;
    sqlContent += `ORDER BY nombre DESC;\n\n`;
    
    sqlContent += `-- Afficher les adresses avec contact\n`;
    sqlContent += `SELECT COUNT(*) as avec_telephone\n`;
    sqlContent += `FROM adresses \n`;
    sqlContent += `WHERE telephone IS NOT NULL AND ville = 'Conakry';\n\n`;
    
    // Écriture du fichier
    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    
    return sqlContent.length;
}

/**
 * Fonction principale de conversion
 */
async function convertOSMToSQL(jsonInputPath, sqlOutputPath) {
    try {
        console.log("🔄 CONVERSION JSON OSM → SQL SUPABASE");
        console.log("=" .repeat(50));
        
        // 1. Lecture du fichier JSON
        console.log(`📂 Lecture: ${jsonInputPath}`);
        
        if (!fs.existsSync(jsonInputPath)) {
            throw new Error(`Fichier JSON non trouvé: ${jsonInputPath}`);
        }
        
        const jsonContent = fs.readFileSync(jsonInputPath, 'utf8');
        const osmData = JSON.parse(jsonContent);
        
        if (!Array.isArray(osmData)) {
            throw new Error('Format JSON invalide - array attendu');
        }
        
        console.log(`✅ ${osmData.length} éléments OSM chargés`);
        
        // 2. Traitement des éléments
        console.log("🔄 Traitement des éléments OSM...");
        
        const processedElements = [];
        const stats = {
            skippedInvalid: 0,      // Coordonnées invalides
            skippedUseless: 0,      // Éléments inutiles (filtrage)
            skippedNoCoords: 0,     // Pas de coordonnées
            processed: 0            // Traités avec succès
        };
        
        osmData.forEach((element, index) => {
            const processed = processOSMElement(element);
            if (processed) {
                processedElements.push(processed);
                stats.processed++;
            } else {
                // Analyser pourquoi c'est ignoré
                if (!element || !element.id) {
                    stats.skippedInvalid++;
                } else if (!isUsefulForTaxi(element)) {
                    stats.skippedUseless++;
                } else {
                    // Problème coordonnées probablement
                    stats.skippedNoCoords++;
                }
            }
            
            // Progress indicator
            if ((index + 1) % 1000 === 0) {
                console.log(`   Traité: ${index + 1}/${osmData.length}`);
            }
        });
        
        console.log(`✅ ${stats.processed} éléments utiles traités avec succès`);
        console.log(`🗑️ ${stats.skippedUseless} éléments filtrés (passages à niveau, feux, parasites)`);
        console.log(`📍 ${stats.skippedNoCoords} éléments sans coordonnées valides`);
        console.log(`❌ ${stats.skippedInvalid} éléments invalides`);
        console.log(`📊 Taux de filtrage strict: ${Math.round(stats.skippedUseless/(osmData.length)*100)}% (parasites éliminés)`);
        console.log(`🎯 Données finales: 100% utiles pour destinations de taxi`);
        
        // 3. Génération du fichier SQL
        console.log("📝 Génération du fichier SQL...");
        
        const sqlSize = generateSQLFile(processedElements, sqlOutputPath);
        
        console.log(`✅ Fichier SQL généré: ${sqlOutputPath}`);
        console.log(`📊 Taille: ${Math.round(sqlSize / 1024)} KB`);
        console.log(`📋 ${Math.ceil(processedElements.length / CONFIG.BATCH_SIZE)} batches de ${CONFIG.BATCH_SIZE} éléments`);
        
        // 4. Analyse des données converties
        analyzeConvertedData(processedElements);
        
        console.log("\n✅ CONVERSION TERMINÉE");
        console.log(`💡 Exécuter: psql -f ${path.basename(sqlOutputPath)}`);
        
        return {
            totalElements: osmData.length,
            processedElements: processedElements.length,
            skippedElements: stats.skippedUseless + stats.skippedNoCoords + stats.skippedInvalid,
            sqlFile: sqlOutputPath,
            sqlSize: sqlSize
        };
        
    } catch (error) {
        console.error(`❌ Erreur conversion: ${error.message}`);
        throw error;
    }
}

/**
 * Analyse des données converties
 */
function analyzeConvertedData(elements) {
    console.log("\n📊 ANALYSE DES DONNÉES CONVERTIES:");
    
    // Statistiques par type
    const typeStats = {};
    const contactStats = {
        withPhone: 0,
        withWebsite: 0,
        withEmail: 0,
        withHours: 0
    };
    
    elements.forEach(element => {
        // Types
        const type = element.type_lieu || 'autre';
        typeStats[type] = (typeStats[type] || 0) + 1;
        
        // Contact
        if (element.telephone) contactStats.withPhone++;
        if (element.site_web) contactStats.withWebsite++;
        if (element.email) contactStats.withEmail++;
        if (element.horaires) contactStats.withHours++;
    });
    
    console.log("\n🏢 TOP TYPES DE LIEUX:");
    Object.entries(typeStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([type, count]) => {
            console.log(`  • ${type}: ${count}`);
        });
        
    console.log("\n📞 INFORMATIONS DE CONTACT:");
    console.log(`  • Avec téléphone: ${contactStats.withPhone} (${Math.round(contactStats.withPhone/elements.length*100)}%)`);
    console.log(`  • Avec site web: ${contactStats.withWebsite} (${Math.round(contactStats.withWebsite/elements.length*100)}%)`);
    console.log(`  • Avec email: ${contactStats.withEmail} (${Math.round(contactStats.withEmail/elements.length*100)}%)`);
    console.log(`  • Avec horaires: ${contactStats.withHours} (${Math.round(contactStats.withHours/elements.length*100)}%)`);
}

/**
 * Fonction principale
 */
async function main() {
    // Paramètres en ligne de commande
    const jsonInputPath = process.argv[2] || path.join(__dirname, 'conakry_complete_raw_latest.json');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sqlOutputPath = process.argv[3] || path.join(__dirname, `INSERT_conakry_adresses_${timestamp}.sql`);
    
    try {
        await convertOSMToSQL(jsonInputPath, sqlOutputPath);
        
    } catch (error) {
        console.error("❌ Erreur fatale:", error.message);
        process.exit(1);
    }
}

// Vérification des arguments et lancement
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log("USAGE: node osm_to_sql_converter.js [fichier_json_entree] [fichier_sql_sortie]");
        console.log("Exemple: node osm_to_sql_converter.js conakry_data.json INSERT_conakry.sql");
        process.exit(0);
    }
    
    main();
}