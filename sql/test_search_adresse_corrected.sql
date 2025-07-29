-- Script de test pour vérifier la correction de la fonction search_adresse
-- Après avoir exécuté fix_search_adresse_lat_lon_order.sql
-- 
-- ATTENDU: latitude = 48.5264, longitude = 2.6545 (au lieu de l'inverse)
-- RÉSULTAT BOT: Distance ~12 km au lieu de 5401.9 km

-- Test 1: Vérifier que "Gare de Melun" retourne les bonnes coordonnées
SELECT 
  nom,
  latitude,
  longitude,
  'Coordonnées attendues: lat=48.5264, lon=2.6545' as verification
FROM search_adresse('Gare de melun');

-- Test 2: Vérifier toutes les destinations pour s'assurer de la cohérence
SELECT 
  nom,
  latitude,
  longitude,
  CASE 
    WHEN latitude BETWEEN 48 AND 49 AND longitude BETWEEN 2 AND 3 THEN '✅ Coordonnées France OK'
    ELSE '❌ Coordonnées suspectes'
  END as validation
FROM search_adresse('gare')
ORDER BY nom;

-- Test 3: Calcul de distance avec les nouvelles coordonnées
-- Test direct avec coordonnées client du log: 48.6276658, 2.5891388
WITH test_distance AS (
  SELECT 
    nom,
    latitude as dest_lat,
    longitude as dest_lon
  FROM search_adresse('Gare de melun')
  LIMIT 1
)
SELECT 
  nom,
  dest_lat,
  dest_lon,
  haversine_distance(
    48.6276658, 2.5891388,  -- Position client (Moissy-Cramayel)
    dest_lat, dest_lon      -- Position destination (Gare de Melun)
  ) as distance_km_corrigee,
  CASE 
    WHEN haversine_distance(48.6276658, 2.5891388, dest_lat, dest_lon) BETWEEN 10 AND 15 
    THEN '✅ Distance correcte (~12 km)'
    ELSE '❌ Distance toujours incorrecte'
  END as resultat
FROM test_distance;