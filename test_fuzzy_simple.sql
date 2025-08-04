-- Test direct de la recherche fuzzy avec similarity
-- Cette requête devrait trouver "Station Shell Lambanyi" quand on cherche "lambayi"

-- Vérifier que pg_trgm est installé
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Test 1: Recherche exacte "lambanyi" (doit trouver)
SELECT nom, nom_normalise, 
       similarity(nom_normalise, 'station shell lambanyi') as score
FROM adresses_with_coords
WHERE nom ILIKE '%shell%lamban%'
ORDER BY score DESC;

-- Test 2: Recherche fuzzy "lambayi" (avec i) pour trouver "lambanyi" (avec y)
SELECT nom, nom_normalise,
       similarity(nom_normalise, 'station shell lambayi') as score_lambayi,
       similarity(nom_normalise, 'station shell lambanyi') as score_lambanyi
FROM adresses_with_coords
WHERE actif = true
  AND (
    nom_normalise ILIKE '%shell%'
    OR similarity(nom_normalise, 'station shell lambayi') > 0.3
  )
ORDER BY score_lambayi DESC
LIMIT 10;

-- Test 3: Vérifier le seuil de similarité nécessaire
SELECT nom, 
       similarity(nom_normalise, 'station shell lambayi') as score
FROM adresses_with_coords
WHERE nom = 'Station Shell Lambanyi';