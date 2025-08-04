-- Version 2 : Fonction simplifiée sans types complexes
CREATE OR REPLACE FUNCTION search_adresse_fuzzy_v2(
  search_query TEXT
) RETURNS TABLE (
  id UUID,
  nom VARCHAR,
  ville VARCHAR,
  type_lieu VARCHAR,
  longitude FLOAT8,
  latitude FLOAT8,
  score FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.nom::VARCHAR,
    a.ville::VARCHAR,
    a.type_lieu::VARCHAR,
    a.longitude,
    a.latitude,
    GREATEST(
      similarity(a.nom_normalise, lower(search_query)),
      similarity(a.nom, search_query)
    )::FLOAT8 as score
  FROM adresses_with_coords a
  WHERE 
    a.actif = true 
    AND (
      a.nom_normalise ILIKE '%' || lower(search_query) || '%'
      OR a.nom ILIKE '%' || search_query || '%'
      OR similarity(a.nom_normalise, lower(search_query)) > 0.3
      OR similarity(a.nom, search_query) > 0.3
    )
  ORDER BY score DESC, char_length(a.nom) DESC, a.nom
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Test immédiat
-- SELECT * FROM search_adresse_fuzzy_v2('station shell lambayi');