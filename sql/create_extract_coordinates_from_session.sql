-- Fonction pour extraire les coordonnées directement depuis la session
-- Évite l'erreur 400 en séparant l'extraction des coordonnées
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
    WHERE s.phone = phone_number
    LIMIT 1;
    
    -- Si aucune session trouvée, retourner 0,0
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.0::FLOAT AS latitude, 0.0::FLOAT AS longitude;
    END IF;
END;
$$ LANGUAGE plpgsql;