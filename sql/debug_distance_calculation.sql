-- Script de diagnostic pour vérifier le calcul de distance
-- Basé sur le test rs1.png.jpg avec distance erronée de 5401.9 km

-- 1. Vérifier les coordonnées de "Gare de Melun" dans la table adresses
SELECT 
  nom,
  ST_X(position::geometry) as longitude,
  ST_Y(position::geometry) as latitude,
  ST_AsText(position) as position_text
FROM adresses 
WHERE nom ILIKE '%gare%melun%' OR nom ILIKE '%melun%gare%';

-- 2. Test de calcul de distance avec coordonnées manuelles
-- Position Moissy-Cramayel (approximative depuis la carte): 48.6276, 2.5934
-- Position Gare de Melun (de la table): 48.5264, 2.6545

-- Fonction de calcul de distance PostgreSQL (en mètres)
SELECT 
  ST_Distance(
    ST_GeomFromText('POINT(2.5934 48.6276)', 4326)::geography,  -- Moissy-Cramayel
    ST_GeomFromText('POINT(2.6545 48.5264)', 4326)::geography   -- Gare de Melun
  ) / 1000.0 as distance_km_postgis;

-- 3. Fonction JavaScript Haversine (reproduire le calcul du bot)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION, 
  lon1 DOUBLE PRECISION, 
  lat2 DOUBLE PRECISION, 
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371; -- Rayon de la Terre en km
  dLat DOUBLE PRECISION;
  dLon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLon/2) * sin(dLon/2);
       
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- 4. Test avec la fonction Haversine (même que dans le bot JavaScript)
SELECT haversine_distance(
  48.6276, 2.5934,  -- Moissy-Cramayel (client)
  48.5264, 2.6545   -- Gare de Melun (destination)
) as distance_km_haversine;

-- 5. Vérifier si les coordonnées sont inversées (lon/lat au lieu de lat/lon)
SELECT haversine_distance(
  2.5934, 48.6276,  -- Coordonnées inversées
  2.6545, 48.5264   -- Coordonnées inversées
) as distance_km_coordonnees_inversees;

-- 6. Diagnostic complet avec toutes les destinations
SELECT 
  nom,
  ST_X(position::geometry) as longitude,
  ST_Y(position::geometry) as latitude,
  haversine_distance(48.6276, 2.5934, ST_Y(position::geometry), ST_X(position::geometry)) as distance_depuis_moissy_km,
  ST_Distance(
    ST_GeomFromText('POINT(2.5934 48.6276)', 4326)::geography,
    position
  ) / 1000.0 as distance_postgis_km
FROM adresses 
WHERE nom ILIKE '%melun%'
ORDER BY distance_depuis_moissy_km;

-- 7. Test du calcul de prix avec la vraie distance
SELECT 
  8.5 as distance_km_reelle,
  8.5 * 3000 as prix_calcule,
  CEIL((8.5 * 3000) / 1000) * 1000 as prix_arrondi_millier
;