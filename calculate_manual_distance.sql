-- Calcul manuel de distance entre les deux points

SELECT 
  'Pharmacie Donka' as depart_nom,
  9.5395142 as depart_lat,
  -13.6831975 as depart_lon,
  'Ecole primaire de Denki madina' as destination_nom,
  10.0025766 as dest_lat,
  -13.0765668 as dest_lon,
  -- Calcul distance PostGIS
  ROUND(
    ST_Distance(
      ST_MakePoint(-13.6831975, 9.5395142)::geography,
      ST_MakePoint(-13.0765668, 10.0025766)::geography
    ) / 1000.0, 2
  ) as distance_km_postgis,
  -- Calcul distance formule Haversine manuelle pour comparaison
  ROUND(
    6371 * acos(
      cos(radians(9.5395142)) * cos(radians(10.0025766)) * 
      cos(radians(-13.0765668) - radians(-13.6831975)) + 
      sin(radians(9.5395142)) * sin(radians(10.0025766))
    ), 2
  ) as distance_km_haversine;