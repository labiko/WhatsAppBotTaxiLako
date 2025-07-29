-- =====================================
-- SCRIPT DE SAUVEGARDE SIMPLE LOKOTAXI
-- =====================================
-- 🎯 Usage: Sauvegarde rapide des données essentielles
-- 💻 Exécution: Supabase Dashboard > SQL Editor

-- =====================================
-- SAUVEGARDE DES DONNÉES PRINCIPALES
-- =====================================

-- 1. Sessions actives (format JSON pour facilité)
SELECT 'EXPORT SESSIONS' as export_type;
SELECT json_agg(
    json_build_object(
        'client_phone', client_phone,
        'vehicle_type', vehicle_type,
        'position_client', ST_AsText(position_client),
        'destination_nom', destination_nom,
        'destination_id', destination_id,
        'destination_position', ST_AsText(destination_position),
        'distance_km', distance_km,
        'prix_estime', prix_estime,
        'prix_confirme', prix_confirme,
        'etat', etat,
        'conducteur_id', conducteur_id,
        'created_at', created_at,
        'updated_at', updated_at,
        'expires_at', expires_at
    )
) as sessions_backup
FROM sessions
ORDER BY created_at DESC;

-- 2. Conducteurs
SELECT 'EXPORT CONDUCTEURS' as export_type;
SELECT json_agg(
    json_build_object(
        'id', id,
        'nom', nom,
        'prenom', prenom,
        'telephone', telephone,
        'vehicle_type', vehicle_type,
        'vehicle_marque', vehicle_marque,
        'vehicle_modele', vehicle_modele,
        'vehicle_couleur', vehicle_couleur,
        'vehicle_plaque', vehicle_plaque,
        'position_actuelle', ST_AsText(position_actuelle),
        'statut', statut,
        'note_moyenne', note_moyenne,
        'nombre_courses', nombre_courses,
        'date_inscription', date_inscription,
        'derniere_activite', derniere_activite,
        'actif', actif
    )
) as conducteurs_backup
FROM conducteurs
ORDER BY nom, prenom;

-- 3. Adresses
SELECT 'EXPORT ADRESSES' as export_type;
SELECT json_agg(
    json_build_object(
        'id', id,
        'nom', nom,
        'adresse_complete', adresse_complete,
        'latitude', latitude,
        'longitude', longitude,
        'created_at', created_at
    )
) as adresses_backup
FROM adresses
ORDER BY nom;

-- 4. Tarifs
SELECT 'EXPORT TARIFS' as export_type;
SELECT json_agg(
    json_build_object(
        'id', id,
        'vehicle_type', vehicle_type,
        'prix_par_km', prix_par_km,
        'prix_minimum', prix_minimum,
        'actif', actif,
        'created_at', created_at,
        'updated_at', updated_at
    )
) as tarifs_backup
FROM tarifs
ORDER BY vehicle_type;

-- 5. Réservations (historique)
SELECT 'EXPORT RESERVATIONS' as export_type;
SELECT json_agg(
    json_build_object(
        'id', id,
        'client_phone', client_phone,
        'vehicle_type', vehicle_type,
        'pickup_location', ST_AsText(pickup_location),
        'status', status,
        'created_at', created_at
    )
) as reservations_backup
FROM reservations
ORDER BY created_at DESC
-- Limiter aux 1000 dernières réservations
LIMIT 1000;

-- =====================================
-- SAUVEGARDE DES FONCTIONS CRITIQUES
-- =====================================

-- Export des fonctions personnalisées
SELECT 'EXPORT FONCTIONS' as export_type;
SELECT json_agg(
    json_build_object(
        'nom_fonction', proname,
        'definition', pg_get_functiondef(oid)
    )
) as fonctions_backup
FROM pg_proc 
WHERE proname IN (
    'search_adresse',
    'calculer_prix_course', 
    'extract_coordinates_from_session'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =====================================
-- STATISTIQUES RAPIDES
-- =====================================

SELECT 'STATISTIQUES' as export_type;
SELECT json_build_object(
    'timestamp_backup', NOW(),
    'total_sessions', (SELECT COUNT(*) FROM sessions),
    'sessions_actives', (SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()),
    'total_conducteurs', (SELECT COUNT(*) FROM conducteurs),
    'conducteurs_disponibles', (SELECT COUNT(*) FROM conducteurs WHERE statut = 'disponible'),
    'total_adresses', (SELECT COUNT(*) FROM adresses),
    'total_tarifs', (SELECT COUNT(*) FROM tarifs),
    'total_reservations', (SELECT COUNT(*) FROM reservations),
    'repartition_conducteurs', (
        SELECT json_object_agg(
            CONCAT(vehicle_type, '_', statut), 
            count
        )
        FROM (
            SELECT 
                vehicle_type, 
                statut, 
                COUNT(*) as count
            FROM conducteurs 
            GROUP BY vehicle_type, statut
        ) t
    )
) as statistiques_backup;

-- =====================================
-- INSTRUCTIONS DE RESTAURATION
-- =====================================

/*
-- Pour restaurer les données, copier le JSON résultant et utiliser:

-- 1. Restaurer les adresses (exemple):
INSERT INTO adresses (id, nom, adresse_complete, latitude, longitude, created_at)
SELECT 
    (value->>'id')::uuid,
    value->>'nom',
    value->>'adresse_complete',
    (value->>'latitude')::float,
    (value->>'longitude')::float,
    (value->>'created_at')::timestamp
FROM json_array_elements('[COLLER_LE_JSON_ADRESSES_ICI]');

-- 2. Restaurer les conducteurs:
INSERT INTO conducteurs (id, nom, prenom, telephone, vehicle_type, vehicle_marque, vehicle_modele, vehicle_couleur, vehicle_plaque, position_actuelle, statut, note_moyenne, nombre_courses, date_inscription, derniere_activite, actif)
SELECT 
    (value->>'id')::uuid,
    value->>'nom',
    value->>'prenom',
    value->>'telephone',
    value->>'vehicle_type',
    value->>'vehicle_marque',
    value->>'vehicle_modele',
    value->>'vehicle_couleur',
    value->>'vehicle_plaque',
    ST_GeomFromText(value->>'position_actuelle', 4326),
    value->>'statut',
    (value->>'note_moyenne')::float,
    (value->>'nombre_courses')::int,
    (value->>'date_inscription')::timestamp,
    (value->>'derniere_activite')::timestamp,
    (value->>'actif')::boolean
FROM json_array_elements('[COLLER_LE_JSON_CONDUCTEURS_ICI]');

-- 3. Restaurer les tarifs:
INSERT INTO tarifs (id, vehicle_type, prix_par_km, prix_minimum, actif, created_at, updated_at)
SELECT 
    (value->>'id')::uuid,
    value->>'vehicle_type',
    (value->>'prix_par_km')::int,
    (value->>'prix_minimum')::int,
    (value->>'actif')::boolean,
    (value->>'created_at')::timestamp,
    (value->>'updated_at')::timestamp
FROM json_array_elements('[COLLER_LE_JSON_TARIFS_ICI]');

*/

SELECT '✅ Sauvegarde simple terminée - Copiez les résultats JSON' as resultat;