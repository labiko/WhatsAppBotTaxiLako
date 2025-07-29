-- Déploiement immédiat de la fonction extract_coordinates_from_session
-- Cette fonction utilise ST_X/ST_Y pour extraire les coordonnées du format binaire PostGIS

CREATE OR REPLACE FUNCTION extract_coordinates_from_session(phone_number TEXT)
RETURNS TABLE (
    latitude FLOAT,
    longitude FLOAT
) AS $$
BEGIN
    -- Log pour debugging
    RAISE NOTICE 'Recherche session pour: %', phone_number;
    
    -- Extraire latitude et longitude depuis la géographie PostGIS dans les sessions
    RETURN QUERY 
    SELECT 
        CASE 
            WHEN s.position_client IS NOT NULL THEN ST_Y(s.position_client::geometry)::FLOAT
            ELSE 0.0::FLOAT
        END AS latitude,
        CASE 
            WHEN s.position_client IS NOT NULL THEN ST_X(s.position_client::geometry)::FLOAT
            ELSE 0.0::FLOAT
        END AS longitude
    FROM sessions s
    WHERE s.client_phone = phone_number
      AND s.position_client IS NOT NULL
      AND s.updated_at > NOW() - INTERVAL '2 hours'  -- Sessions récentes
    ORDER BY s.updated_at DESC
    LIMIT 1;
    
    -- Log si aucune session trouvée
    IF NOT FOUND THEN
        RAISE NOTICE 'Aucune session trouvée pour: %', phone_number;
        RETURN QUERY SELECT 0.0::FLOAT AS latitude, 0.0::FLOAT AS longitude;
    END IF;
END;
$$ LANGUAGE plpgsql;