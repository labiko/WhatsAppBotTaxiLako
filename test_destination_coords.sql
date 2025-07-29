-- Test coordonnées destination "Ecole primaire de Denki madina"
-- Cherchons son ID et ses coordonnées

SELECT 
  id,
  nom,
  ville,
  latitude,
  longitude,
  position
FROM adresses_with_coords 
WHERE nom ILIKE '%denki%madina%' 
   OR nom ILIKE '%ecole%denki%'
ORDER BY nom;