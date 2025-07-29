-- =======================================
-- VÉRIFICATION COMPLÈTE DES CONDUCTEURS
-- =======================================

-- 1. Compter tous les conducteurs
SELECT 
  COUNT(*) as total_conducteurs,
  COUNT(CASE WHEN actif = 'true' AND statut = 'disponible' THEN 1 END) as conducteurs_disponibles,
  COUNT(CASE WHEN vehicle_type = 'moto' THEN 1 END) as motos,
  COUNT(CASE WHEN vehicle_type = 'voiture' THEN 1 END) as voitures
FROM conducteurs;

-- 2. Liste des conducteurs avec coordonnées
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  actif,
  statut,
  telephone,
  ST_X(position_actuelle::geometry) as longitude,
  ST_Y(position_actuelle::geometry) as latitude,
  note_moyenne,
  nombre_courses
FROM conducteurs
ORDER BY vehicle_type, prenom;

-- 3. Vérifier la vue utilisée par le bot (si elle existe)
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  lat,
  lon,
  note_moyenne,
  nombre_courses
FROM conducteurs_with_coords
WHERE actif = 'true' AND statut = 'disponible'
ORDER BY vehicle_type, prenom;

-- 4. Conducteurs par zone géographique
SELECT 
  vehicle_type,
  COUNT(*) as nombre,
  ROUND(AVG(ST_X(position_actuelle::geometry))::numeric, 4) as longitude_moyenne,
  ROUND(AVG(ST_Y(position_actuelle::geometry))::numeric, 4) as latitude_moyenne
FROM conducteurs
WHERE actif = 'true' AND statut = 'disponible'
GROUP BY vehicle_type;

-- 5. Statuts des conducteurs
SELECT 
  statut,
  COUNT(*) as nombre,
  string_agg(prenom || ' ' || nom, ', ') as conducteurs
FROM conducteurs
GROUP BY statut
ORDER BY nombre DESC;