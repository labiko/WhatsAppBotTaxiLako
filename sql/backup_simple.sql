-- =====================================
-- SCRIPT DE SAUVEGARDE SIMPLE LOKOTAXI
-- =====================================
-- 📅 Généré le: 23 juillet 2025
-- 🎯 Usage: Export JSON des données principales pour backup rapide
-- 💾 Format: JSON compatible avec les APIs REST

-- =====================================
-- 1. EXPORT JSON DES DONNÉES
-- =====================================

-- Export des conducteurs (format JSON)
SELECT json_agg(
  json_build_object(
    'id', id,
    'nom', nom,
    'prenom', prenom,
    'telephone', telephone,
    'type_vehicule', type_vehicule,
    'marque_vehicule', marque_vehicule,
    'modele_vehicule', modele_vehicule,
    'couleur_vehicule', couleur_vehicule,
    'numero_plaque', numero_plaque,
    'position_wkt', ST_AsText(position),
    'statut', statut,
    'note_moyenne', note_moyenne,
    'nombre_courses', nombre_courses,
    'created_at', created_at,
    'updated_at', updated_at
  )
) as conducteurs_backup
FROM conducteurs;

-- Export des réservations (format JSON)
SELECT json_agg(
  json_build_object(
    'id', id,
    'client_phone', client_phone,
    'vehicle_type', vehicle_type,
    'position_depart_wkt', ST_AsText(position_depart),
    'position_destination_wkt', ST_AsText(position_destination),
    'destination_nom', destination_nom,
    'destination_id', destination_id,
    'distance_km', distance_km,
    'prix_estime', prix_estime,
    'prix_confirme', prix_confirme,
    'conducteur_id', conducteur_id,
    'status', status,
    'created_at', created_at,
    'updated_at', updated_at
  )
) as reservations_backup
FROM reservations;

-- Export des sessions actives (format JSON)
SELECT json_agg(
  json_build_object(
    'id', id,
    'client_phone', client_phone,
    'vehicle_type', vehicle_type,
    'position_client_wkt', ST_AsText(position_client),
    'destination_nom', destination_nom,
    'destination_id', destination_id,
    'position_destination_wkt', ST_AsText(destination_position),
    'distance_km', distance_km,
    'prix_estime', prix_estime,
    'prix_confirme', prix_confirme,
    'conducteur_id', conducteur_id,
    'etat', etat,
    'created_at', created_at,
    'updated_at', updated_at,
    'expires_at', expires_at
  )
) as sessions_backup
FROM sessions
WHERE expires_at > NOW(); -- Seulement les sessions actives

-- Export des adresses (format JSON)
SELECT json_agg(
  json_build_object(
    'id', id,
    'nom', nom,
    'adresse_complete', adresse_complete,
    'position_wkt', ST_AsText(position),
    'latitude', latitude,
    'longitude', longitude,
    'type_lieu', type_lieu,
    'actif', actif,
    'created_at', created_at
  )
) as adresses_backup
FROM adresses;

-- Export des tarifs (format JSON)
SELECT json_agg(
  json_build_object(
    'id', id,
    'type_vehicule', type_vehicule,
    'prix_par_km', prix_par_km,
    'prix_minimum', prix_minimum,
    'actif', actif,
    'description', description,
    'created_at', created_at,
    'updated_at', updated_at
  )
) as tarifs_backup
FROM tarifs;

-- =====================================
-- 2. STATISTIQUES DE SAUVEGARDE
-- =====================================

SELECT 
  'STATISTIQUES BACKUP SIMPLE' as type,
  json_build_object(
    'date_backup', NOW(),
    'nb_conducteurs', (SELECT COUNT(*) FROM conducteurs),
    'nb_conducteurs_disponibles', (SELECT COUNT(*) FROM conducteurs WHERE statut = 'disponible'),
    'nb_reservations', (SELECT COUNT(*) FROM reservations),
    'nb_sessions_actives', (SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()),
    'nb_adresses', (SELECT COUNT(*) FROM adresses WHERE actif = TRUE),
    'nb_tarifs', (SELECT COUNT(*) FROM tarifs WHERE actif = TRUE)
  ) as statistiques;

-- =====================================
-- 3. SCRIPT DE RESTAURATION JSON
-- =====================================

/*
-- Pour restaurer depuis JSON (exemple pour conducteurs):

INSERT INTO conducteurs (
  id, nom, prenom, telephone, type_vehicule, 
  marque_vehicule, modele_vehicule, couleur_vehicule, numero_plaque,
  position, statut, note_moyenne, nombre_courses, created_at, updated_at
)
SELECT 
  (data->>'id')::UUID,
  data->>'nom',
  data->>'prenom', 
  data->>'telephone',
  data->>'type_vehicule',
  data->>'marque_vehicule',
  data->>'modele_vehicule',
  data->>'couleur_vehicule',
  data->>'numero_plaque',
  ST_GeomFromText(data->>'position_wkt', 4326),
  data->>'statut',
  (data->>'note_moyenne')::DECIMAL,
  (data->>'nombre_courses')::INTEGER,
  (data->>'created_at')::TIMESTAMP,
  (data->>'updated_at')::TIMESTAMP
FROM json_array_elements('[BACKUP_JSON_HERE]'::json) as data
ON CONFLICT (telephone) DO NOTHING;

-- Répéter pour les autres tables...
*/

-- =====================================
-- 4. INFORMATIONS SYSTÈME
-- =====================================

SELECT 
  'INFORMATIONS SYSTÈME' as type,
  json_build_object(
    'version_postgresql', version(),
    'extensions', (
      SELECT json_agg(extname) 
      FROM pg_extension 
      WHERE extname IN ('postgis', 'uuid-ossp', 'fuzzystrmatch')
    ),
    'taille_base', pg_size_pretty(pg_database_size(current_database())),
    'nombre_tables', (
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    )
  ) as infos_systeme;

SELECT 'Backup simple terminé avec succès' as status,
       NOW() as timestamp;