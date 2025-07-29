-- Fonction corrigée pour extraire les coordonnées depuis la session
-- FIX: Utilise client_phone au lieu de phone + filtre sessions actives
CREATE OR REPLACE FUNCTION extract_coordinates_from_session(phone_number TEXT)
RETURNS TABLE (
    latitude FLOAT,
    longitude FLOAT
) AS $$
BEGIN
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
    WHERE s.client_phone = phone_number  -- FIX: client_phone au lieu de phone
      AND s.updated_at > NOW() - INTERVAL '1 hour'  -- Sessions récentes seulement
    ORDER BY s.updated_at DESC
    LIMIT 1;
    
    -- Si aucune session trouvée, retourner 0,0
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.0::FLOAT AS latitude, 0.0::FLOAT AS longitude;
    END IF;
END;
$$ LANGUAGE plpgsql;