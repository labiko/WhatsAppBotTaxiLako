-- Calcul manuel de distance entre les deux points (version corrigée)

SELECT 
  'Pharmacie Donka' as depart_nom,
  9.5395142 as depart_lat,
  -13.6831975 as depart_lon,
  'Ecole primaire de Denki madina' as destination_nom,
  10.0025766 as dest_lat,
  -13.0765668 as dest_lon,
  -- Calcul distance PostGIS (cast explicite)
  (ST_Distance(
    ST_MakePoint(-13.6831975, 9.5395142)::geography,
    ST_MakePoint(-13.0765668, 10.0025766)::geography
  ) / 1000.0)::numeric(10,2) as distance_km_postgis;