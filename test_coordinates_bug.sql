-- Test coordonnées pour ID depart_id depuis les logs
-- ID trouvé dans les logs: 5b70b314-d287-4722-aeed-0ba5856a64cc

SELECT 
  id,
  nom,
  ville,
  latitude,
  longitude,
  position
FROM adresses_with_coords 
WHERE id = '5b70b314-d287-4722-aeed-0ba5856a64cc';

-- Test aussi si l'ID existe dans la table normale
SELECT 
  id,
  nom,
  ville,
  ST_X(position::geometry) as longitude_direct,
  ST_Y(position::geometry) as latitude_direct
FROM adresses 
WHERE id = '5b70b314-d287-4722-aeed-0ba5856a64cc';