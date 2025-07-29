-- =====================================
-- SCRIPT DE SAUVEGARDE COMPLÈTE LOKOTAXI
-- =====================================
-- 📅 Généré le: 23 juillet 2025
-- 🎯 Usage: Sauvegarde complète de toutes les tables et données
-- 💾 Exécution: Via Supabase Dashboard > SQL Editor ou psql

-- =====================================
-- 1. EXPORT DES SCHÉMAS ET DONNÉES
-- =====================================

-- Générer un dump complet de la base de données
-- ATTENTION: À exécuter depuis le terminal, pas dans SQL Editor
/*
-- Commande à exécuter dans le terminal:
pg_dump -h db.nmwnibzgvwltipmtwhzo.supabase.co \
        -U postgres \
        -p 5432 \
        -d postgres \
        --no-password \
        --verbose \
        --clean \
        --create \
        --format=custom \
        --compress=9 \
        --file="lokotaxi_backup_$(date +%Y%m%d_%H%M%S).backup"

-- Ou en format SQL lisible:
pg_dump -h db.nmwnibzgvwltipmtwhzo.supabase.co \
        -U postgres \
        -p 5432 \
        -d postgres \
        --no-password \
        --verbose \
        --clean \
        --create \
        --format=plain \
        --file="lokotaxi_backup_$(date +%Y%m%d_%H%M%S).sql"
*/

-- =====================================
-- 2. SAUVEGARDE MANUELLE DES TABLES PRINCIPALES
-- =====================================

-- Table sessions - Données de sessions actives
SELECT 'Sauvegarde table: sessions' as info;
COPY (
    SELECT 
        client_phone,
        vehicle_type,
        ST_AsText(position_client) as position_client_wkt,
        destination_nom,
        destination_id,
        ST_AsText(destination_position) as destination_position_wkt,
        distance_km,
        prix_estime,
        prix_confirme,
        etat,
        conducteur_id,
        created_at,
        updated_at,
        expires_at
    FROM sessions
    ORDER BY created_at DESC
) TO '/tmp/sessions_backup.csv' WITH CSV HEADER;

-- Table conducteurs - Base de données des chauffeurs
SELECT 'Sauvegarde table: conducteurs' as info;
COPY (
    SELECT 
        id,
        nom,
        prenom,
        telephone,
        vehicle_type,
        vehicle_marque,
        vehicle_modele,
        vehicle_couleur,
        vehicle_plaque,
        ST_AsText(position_actuelle) as position_actuelle_wkt,
        statut,
        note_moyenne,
        nombre_courses,
        date_inscription,
        derniere_activite,
        actif
    FROM conducteurs
    ORDER BY nom, prenom
) TO '/tmp/conducteurs_backup.csv' WITH CSV HEADER;

-- Table adresses - Destinations disponibles
SELECT 'Sauvegarde table: adresses' as info;
COPY (
    SELECT 
        id,
        nom,
        adresse_complete,
        latitude,
        longitude,
        created_at
    FROM adresses
    ORDER BY nom
) TO '/tmp/adresses_backup.csv' WITH CSV HEADER;

-- Table tarifs - Configuration des prix
SELECT 'Sauvegarde table: tarifs' as info;
COPY (
    SELECT 
        id,
        vehicle_type,
        prix_par_km,
        prix_minimum,
        actif,
        created_at,
        updated_at
    FROM tarifs
    ORDER BY vehicle_type
) TO '/tmp/tarifs_backup.csv' WITH CSV HEADER;

-- Table reservations - Historique des réservations
SELECT 'Sauvegarde table: reservations' as info;
COPY (
    SELECT 
        id,
        client_phone,
        vehicle_type,
        ST_AsText(pickup_location) as pickup_location_wkt,
        status,
        created_at
    FROM reservations
    ORDER BY created_at DESC
) TO '/tmp/reservations_backup.csv' WITH CSV HEADER;

-- =====================================
-- 3. SAUVEGARDE DES FONCTIONS PERSONNALISÉES
-- =====================================

-- Extraire les définitions des fonctions personnalisées
SELECT 'Sauvegarde des fonctions personnalisées' as info;

-- Fonction search_adresse
SELECT 
    'search_adresse' as fonction_nom,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'search_adresse' 
  AND n.nspname = 'public';

-- Fonction calculer_prix_course  
SELECT 
    'calculer_prix_course' as fonction_nom,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'calculer_prix_course' 
  AND n.nspname = 'public';

-- Fonction extract_coordinates_from_session
SELECT 
    'extract_coordinates_from_session' as fonction_nom,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'extract_coordinates_from_session' 
  AND n.nspname = 'public';

-- =====================================
-- 4. SAUVEGARDE DES VUES
-- =====================================

-- Vue conducteurs_disponibles
SELECT 'Sauvegarde vue: conducteurs_disponibles' as info;
SELECT 
    'conducteurs_disponibles' as vue_nom,
    pg_get_viewdef('conducteurs_disponibles'::regclass, true) as definition;

-- =====================================
-- 5. SAUVEGARDE DES INDEX ET CONTRAINTES
-- =====================================

-- Lister tous les index personnalisés
SELECT 'Sauvegarde des index personnalisés' as info;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname NOT LIKE '%_pkey'
  AND tablename IN ('sessions', 'conducteurs', 'adresses', 'tarifs', 'reservations')
ORDER BY tablename, indexname;

-- Lister toutes les contraintes personnalisées
SELECT 'Sauvegarde des contraintes' as info;
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('sessions', 'conducteurs', 'adresses', 'tarifs', 'reservations')
  AND tc.constraint_type != 'PRIMARY KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================
-- 6. STATISTIQUES DE LA BASE
-- =====================================

SELECT 'Statistiques générales de la base' as info;

-- Nombre d'enregistrements par table
SELECT 
    'sessions' as table_name,
    COUNT(*) as nombre_enregistrements,
    MIN(created_at) as plus_ancien,
    MAX(created_at) as plus_recent
FROM sessions
UNION ALL
SELECT 
    'conducteurs',
    COUNT(*),
    MIN(date_inscription),
    MAX(derniere_activite)
FROM conducteurs
UNION ALL
SELECT 
    'adresses',
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM adresses
UNION ALL
SELECT 
    'tarifs',
    COUNT(*),
    MIN(created_at),
    MAX(updated_at)
FROM tarifs
UNION ALL
SELECT 
    'reservations',
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM reservations;

-- État des conducteurs
SELECT 'État des conducteurs' as info;
SELECT 
    statut,
    vehicle_type,
    COUNT(*) as nombre
FROM conducteurs
GROUP BY statut, vehicle_type
ORDER BY vehicle_type, statut;

-- Sessions par état
SELECT 'Répartition des sessions par état' as info;
SELECT 
    etat,
    vehicle_type,
    COUNT(*) as nombre
FROM sessions
WHERE expires_at > NOW()
GROUP BY etat, vehicle_type
ORDER BY etat, vehicle_type;

-- =====================================
-- 7. COMMANDES DE RESTAURATION
-- =====================================

/*
-- Pour restaurer depuis un backup complet:
pg_restore -h db.nmwnibzgvwltipmtwhzo.supabase.co \
           -U postgres \
           -p 5432 \
           -d postgres \
           --no-password \
           --verbose \
           --clean \
           --create \
           lokotaxi_backup_YYYYMMDD_HHMMSS.backup

-- Pour restaurer une table spécifique depuis CSV:
COPY sessions(client_phone, vehicle_type, position_client, destination_nom, destination_id, destination_position, distance_km, prix_estime, prix_confirme, etat, conducteur_id, created_at, updated_at, expires_at) 
FROM '/path/to/sessions_backup.csv' 
WITH CSV HEADER;

-- Pour restaurer les coordonnées PostGIS depuis WKT:
UPDATE sessions 
SET position_client = ST_GeomFromText(position_client_wkt, 4326)
WHERE position_client_wkt IS NOT NULL;
*/

-- =====================================
-- 8. VÉRIFICATIONS POST-SAUVEGARDE
-- =====================================

-- Vérifier l'intégrité des données spatiales
SELECT 'Vérification des données spatiales' as info;
SELECT 
    'sessions' as table_name,
    COUNT(*) as total_rows,
    COUNT(position_client) as rows_with_position,
    COUNT(CASE WHEN ST_IsValid(position_client) THEN 1 END) as valid_positions
FROM sessions
UNION ALL
SELECT 
    'conducteurs',
    COUNT(*),
    COUNT(position_actuelle),
    COUNT(CASE WHEN ST_IsValid(position_actuelle) THEN 1 END)
FROM conducteurs
UNION ALL
SELECT 
    'reservations',
    COUNT(*),
    COUNT(pickup_location),
    COUNT(CASE WHEN ST_IsValid(pickup_location) THEN 1 END)
FROM reservations;

-- Vérifier la cohérence des données
SELECT 'Vérification de cohérence des données' as info;
SELECT 
    'Sessions avec conducteur inexistant' as verification,
    COUNT(*) as problemes_detectes
FROM sessions s
LEFT JOIN conducteurs c ON s.conducteur_id = c.id
WHERE s.conducteur_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 
    'Sessions avec destination inexistante',
    COUNT(*)
FROM sessions s
LEFT JOIN adresses a ON s.destination_id = a.id
WHERE s.destination_id IS NOT NULL AND a.id IS NULL
UNION ALL
SELECT 
    'Conducteurs avec statut invalide',
    COUNT(*)
FROM conducteurs
WHERE statut NOT IN ('disponible', 'occupé', 'hors_service', 'inactif');

SELECT '✅ Sauvegarde terminée - Vérifiez les fichiers générés' as resultat_final;

-- =====================================
-- FIN DU SCRIPT DE SAUVEGARDE
-- =====================================