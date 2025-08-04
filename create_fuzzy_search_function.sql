-- Création de la fonction de recherche fuzzy pour résoudre "lambayi" vs "lambanyi"
-- Cette fonction utilise pg_trgm pour détecter les variations de 1-2 lettres

-- Vérifier que les extensions sont installées
-- (À exécuter dans Supabase SQL Editor si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Fonction de recherche fuzzy intelligente
CREATE OR REPLACE FUNCTION search_adresse_fuzzy(
  search_query TEXT,
  similarity_threshold FLOAT DEFAULT 0.3,
  limit_results INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  nom VARCHAR(200),
  ville VARCHAR(100), 
  type_lieu VARCHAR(50),
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  position_geo GEOGRAPHY,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id, a.nom, a.ville, a.type_lieu, a.longitude, a.latitude, a.position AS position_geo,
    GREATEST(
      similarity(a.nom_normalise, lower(search_query)),
      similarity(a.nom, search_query)
    ) as similarity_score
  FROM adresses_with_coords a
  WHERE 
    a.actif = true 
    AND (
      -- Recherche exacte ou partielle (ILIKE)
      a.nom_normalise ILIKE '%' || lower(search_query) || '%'
      OR a.nom ILIKE '%' || search_query || '%'
      -- Recherche fuzzy avec similarité
      OR similarity(a.nom_normalise, lower(search_query)) > similarity_threshold
      OR similarity(a.nom, search_query) > similarity_threshold
    )
  ORDER BY similarity_score DESC, char_length(a.nom) DESC, a.nom
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Test de la fonction avec le cas problématique
-- SELECT * FROM search_adresse_fuzzy('station shell lambayi', 0.3, 10);
-- Devrait maintenant trouver "Station Shell Lambanyi"