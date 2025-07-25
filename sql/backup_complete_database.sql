-- Script de sauvegarde complète de la base de données LokoTaxi
-- Génère un dump SQL complet avec toutes les données

-- =================================================================================
-- INSTRUCTIONS D'UTILISATION
-- =================================================================================

-- Pour faire une sauvegarde complète (structure + données) :
-- pg_dump -h localhost -U postgres -d lokotaxi -f backup_lokotaxi_$(date +%Y%m%d_%H%M%S).sql

-- Pour restaurer une sauvegarde :
-- psql -h localhost -U postgres -d lokotaxi_restore < backup_lokotaxi_20250723_123000.sql

-- Pour sauvegarde avec compression :
-- pg_dump -h localhost -U postgres -d lokotaxi -Fc -f backup_lokotaxi_$(date +%Y%m%d_%H%M%S).dump

-- =================================================================================
-- SCRIPT DE SAUVEGARDE AUTOMATISÉ
-- =================================================================================

-- Variables à adapter selon votre environnement
\set DB_HOST 'localhost'
\set DB_USER 'postgres'  
\set DB_NAME 'lokotaxi'
\set BACKUP_DIR '/tmp/backups'

-- Créer le répertoire de sauvegarde s'il n'existe pas
\! mkdir -p /tmp/backups

-- Fonction pour créer un nom de fichier avec timestamp
CREATE OR REPLACE FUNCTION generate_backup_filename()
RETURNS TEXT AS $$
BEGIN
    RETURN '/tmp/backups/lokotaxi_backup_' || 
           to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS') || '.sql';
END;
$$ LANGUAGE plpgsql;

-- =================================================================================
-- SAUVEGARDE DES TABLES PRINCIPALES
-- =================================================================================

-- Export des conducteurs avec leurs positions GPS
\copy (SELECT id, nom, prenom, telephone, type_vehicule, marque_vehicule, modele_vehicule, couleur_vehicule, numero_plaque, ST_AsText(position) as position_wkt, statut, note_moyenne, nombre_courses, created_at, updated_at FROM conducteurs) TO '/tmp/backups/conducteurs_backup.csv' WITH CSV HEADER;

-- Export des réservations
\copy (SELECT id, client_phone, vehicle_type, ST_AsText(position_depart) as position_depart_wkt, ST_AsText(position_destination) as position_destination_wkt, destination_nom, destination_id, distance_km, prix_estime, prix_confirme, conducteur_id, status, created_at, updated_at FROM reservations) TO '/tmp/backups/reservations_backup.csv' WITH CSV HEADER;

-- Export des sessions actives
\copy (SELECT id, client_phone, vehicle_type, ST_AsText(position_client) as position_client_wkt, destination_nom, destination_id, ST_AsText(destination_position) as destination_position_wkt, distance_km, prix_estime, prix_confirme, conducteur_id, etat, created_at, updated_at, expires_at FROM sessions) TO '/tmp/backups/sessions_backup.csv' WITH CSV HEADER;

-- Export des adresses/destinations
\copy (SELECT id, nom, adresse_complete, ST_AsText(position) as position_wkt, latitude, longitude, type_lieu, actif, created_at FROM adresses) TO '/tmp/backups/adresses_backup.csv' WITH CSV HEADER;

-- Export des tarifs
\copy (SELECT * FROM tarifs) TO '/tmp/backups/tarifs_backup.csv' WITH CSV HEADER;

-- =================================================================================
-- INFORMATIONS DE SAUVEGARDE
-- =================================================================================

-- Statistiques de la base de données
SELECT 
    'STATISTIQUES DE SAUVEGARDE' as info,
    NOW() as date_sauvegarde;

SELECT 'conducteurs' as table_name, COUNT(*) as nb_records FROM conducteurs
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations  
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'adresses', COUNT(*) FROM adresses
UNION ALL
SELECT 'tarifs', COUNT(*) FROM tarifs;

-- État des conducteurs
SELECT 
    'ÉTAT CONDUCTEURS' as info,
    statut,
    COUNT(*) as nombre
FROM conducteurs 
GROUP BY statut;

-- Sessions actives
SELECT 
    'SESSIONS ACTIVES' as info,
    etat,
    COUNT(*) as nombre
FROM sessions 
WHERE expires_at > NOW()
GROUP BY etat;

-- =================================================================================
-- SCRIPT DE RESTAURATION (à exécuter séparément)
-- =================================================================================

/*
-- Pour restaurer les données depuis les CSV :

-- 1. Créer les tables (exécuter les scripts create_*.sql d'abord)

-- 2. Importer les conducteurs
\copy conducteurs (id, nom, prenom, telephone, type_vehicule, marque_vehicule, modele_vehicule, couleur_vehicule, numero_plaque, statut, note_moyenne, nombre_courses, created_at, updated_at) FROM '/tmp/backups/conducteurs_backup.csv' WITH CSV HEADER;

-- 3. Mettre à jour les positions PostGIS des conducteurs
UPDATE conducteurs SET position = ST_GeomFromText(position_wkt, 4326) 
FROM (SELECT unnest(...)) -- À adapter selon les données

-- Répéter pour les autres tables...
*/

-- =================================================================================
-- NETTOYAGE ET MAINTENANCE
-- =================================================================================

-- Nettoyer les sessions expirées avant sauvegarde
SELECT clean_expired_sessions() as sessions_supprimees;

-- Vacuum et analyze pour optimiser
VACUUM ANALYZE;

SELECT 'Sauvegarde terminée avec succès' as status,
       NOW() as timestamp;