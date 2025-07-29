-- Script pour ajouter des logs debug au bot et tracer le calcul de distance
-- Objectif: Identifier précisément où se situe l'inversion lat/lon
-- 
-- ÉTAPES À TRACER:
-- 1. Coordonnées reçues de Twilio (latitude, longitude)
-- 2. Coordonnées stockées dans session.positionClient 
-- 3. Coordonnées extraites du POINT()
-- 4. Coordonnées de destination retournées par search_adresse
-- 5. Paramètres passés à calculateDistance
-- 6. Résultat de calculateDistance

-- Test direct pour comparer toutes les possibilités
WITH test_coords AS (
  SELECT 
    48.6276658 as client_lat_correct,
    2.5891388 as client_lon_correct,
    48.5264 as dest_lat_correct,
    2.6545 as dest_lon_correct
)
SELECT 
  'Test 1: Ordre correct (lat,lon,lat,lon)' as test_name,
  haversine_distance(client_lat_correct, client_lon_correct, dest_lat_correct, dest_lon_correct) as distance_km
FROM test_coords

UNION ALL

SELECT 
  'Test 2: Client inversé (lon,lat,lat,lon)' as test_name,
  haversine_distance(client_lon_correct, client_lat_correct, dest_lat_correct, dest_lon_correct) as distance_km
FROM test_coords

UNION ALL

SELECT 
  'Test 3: Destination inversée (lat,lon,lon,lat)' as test_name,
  haversine_distance(client_lat_correct, client_lon_correct, dest_lon_correct, dest_lat_correct) as distance_km
FROM test_coords

UNION ALL

SELECT 
  'Test 4: Tout inversé (lon,lat,lon,lat)' as test_name,
  haversine_distance(client_lon_correct, client_lat_correct, dest_lon_correct, dest_lat_correct) as distance_km
FROM test_coords

UNION ALL

SELECT 
  'Test 5: Bug actuel 5401.9 km - quelle combinaison?' as test_name,
  5401.9 as distance_km

ORDER BY distance_km;