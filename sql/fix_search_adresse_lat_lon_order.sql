-- Script pour corriger l'inversion latitude/longitude dans la fonction search_adresse
-- PROBLÈME: La fonction retournait longitude, latitude au lieu de latitude, longitude
-- RÉSULTAT: Distance calculée de 5401.9 km au lieu de ~12 km
-- 
-- Date: 2025-07-23
-- Bug identifié: Fonction search_adresse retourne ST_X (longitude) puis ST_Y (latitude)
-- Mais le bot TypeScript attend adresse.latitude puis adresse.longitude

-- 1. Supprimer l'ancienne fonction avec le mauvais ordre des paramètres
DROP FUNCTION IF EXISTS search_adresse(text);

-- 2. Recréer la fonction avec l'ordre correct: latitude PUIS longitude
CREATE OR REPLACE FUNCTION search_adresse(search_term TEXT)
RETURNS TABLE (
  id UUID,
  nom VARCHAR,
  adresse_complete TEXT,
  distance_levenshtein INT,
  latitude FLOAT,
  longitude FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.nom,
    a.adresse_complete,
    levenshtein(normalize_text(search_term), a.nom_normalise) as distance_levenshtein,
    ST_Y(a.position::geometry) as latitude,   -- CORRECTION: ST_Y = latitude en premier
    ST_X(a.position::geometry) as longitude   -- CORRECTION: ST_X = longitude en second
  FROM adresses a
  WHERE 
    a.actif = TRUE
    AND (
      -- Recherche exacte
      a.nom_normalise = normalize_text(search_term)
      -- Recherche partielle
      OR a.nom_normalise LIKE '%' || normalize_text(search_term) || '%'
      -- Recherche avec tolérance (distance de Levenshtein <= 3)
      OR levenshtein(normalize_text(search_term), a.nom_normalise) <= 3
    )
  ORDER BY 
    CASE 
      WHEN a.nom_normalise = normalize_text(search_term) THEN 0
      WHEN a.nom_normalise LIKE normalize_text(search_term) || '%' THEN 1
      WHEN a.nom_normalise LIKE '%' || normalize_text(search_term) || '%' THEN 2
      ELSE 3
    END,
    levenshtein(normalize_text(search_term), a.nom_normalise)
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;