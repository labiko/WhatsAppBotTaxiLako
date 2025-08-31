-- ✅ CORRECTION - Vue conducteurs_with_coords avec extraction PostGIS correcte
-- 🎯 Problème: latitude/longitude pas extraites de position_actuelle
-- 📍 Solution: Utiliser ST_Y et ST_X pour extraire coordonnées

DROP VIEW IF EXISTS conducteurs_with_coords;

CREATE VIEW conducteurs_with_coords AS
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
  position_actuelle,
  statut,
  note_moyenne,
  nombre_courses,
  date_inscription,
  derniere_activite,
  actif,
  entreprise_id,
  date_update_position,
  accuracy,
  motif_blocage,
  date_blocage,
  bloque_par,
  player_id,
  rayon_km_reservation,
  first_login,
  -- 🔧 CORRECTION CRITIQUE: Extraction coordonnées PostGIS
  ST_Y(position_actuelle::geometry) as latitude,
  ST_X(position_actuelle::geometry) as longitude
FROM conducteurs
WHERE actif = true;

-- ✅ Test de validation
SELECT 
  nom, prenom, vehicle_type, statut,
  latitude, longitude,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ COORDONNÉES MANQUANTES'
    ELSE '✅ COORDONNÉES OK'
  END as status_coords
FROM conducteurs_with_coords 
WHERE vehicle_type = 'moto' AND statut = 'disponible'
LIMIT 5;