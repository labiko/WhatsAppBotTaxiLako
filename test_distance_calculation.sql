-- Test calcul distance entre Lycée-College Donka et Ecole Moderne de Foulamadina
-- D'après les logs : 
-- departPosition: "0101000020E6100000C5138B29A25C2BC045CBCBAB84142340"
-- destinationPosition: "0101000020E6100000E0F42EDE8F272BC0D576137CD3582340"

-- 1. Extraire les coordonnées des positions PostGIS
SELECT 
  'Lycée-College Donka (DEPART)' as lieu,
  ST_X('0101000020E6100000C5138B29A25C2BC045CBCBAB84142340'::geometry) as longitude,
  ST_Y('0101000020E6100000C5138B29A25C2BC045CBCBAB84142340'::geometry) as latitude
UNION ALL
SELECT 
  'Ecole Moderne de Foulamadina (DESTINATION)' as lieu,
  ST_X('0101000020E6100000E0F42EDE8F272BC0D576137CD3582340'::geometry) as longitude,
  ST_Y('0101000020E6100000E0F42EDE8F272BC0D576137CD3582340'::geometry) as latitude;

-- 2. Calculer la distance réelle entre les deux points
SELECT 
  ST_Distance(
    '0101000020E6100000C5138B29A25C2BC045CBCBAB84142340'::geometry,
    '0101000020E6100000E0F42EDE8F272BC0D576137CD3582340'::geometry
  ) as distance_meters,
  
  ST_Distance(
    '0101000020E6100000C5138B29A25C2BC045CBCBAB84142340'::geometry,
    '0101000020E6100000E0F42EDE8F272BC0D576137CD3582340'::geometry
  ) / 1000.0 as distance_km;

-- 3. Vérifier si ces adresses existent dans la table adresses
SELECT 
  id, nom, ville, 
  ST_X(position) as longitude,
  ST_Y(position) as latitude
FROM adresses 
WHERE nom ILIKE '%donka%' OR nom ILIKE '%foulamadina%'
ORDER BY nom;