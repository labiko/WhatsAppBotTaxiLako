-- Fonction pour extraire les coordonnées depuis le format PostGIS
-- Résout le problème d'extraction des coordonnées GPS stockées en format binaire

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

-- Fonction helper pour extraire coordonnées d'une position PostGIS
CREATE OR REPLACE FUNCTION get_coordinates_from_postgis(position_postgis GEOGRAPHY)
RETURNS TABLE (
    latitude FLOAT,
    longitude FLOAT
) AS $$
BEGIN
    IF position_postgis IS NULL THEN
        RETURN QUERY SELECT 0.0::FLOAT AS latitude, 0.0::FLOAT AS longitude;
    ELSE
        RETURN QUERY SELECT 
            ST_Y(position_postgis::geometry)::FLOAT AS latitude,
            ST_X(position_postgis::geometry)::FLOAT AS longitude;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider des coordonnées GPS
CREATE OR REPLACE FUNCTION validate_coordinates(lat FLOAT, lon FLOAT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que les coordonnées sont dans des plages valides
    RETURN (
        lat IS NOT NULL AND lon IS NOT NULL AND
        lat BETWEEN -90 AND 90 AND
        lon BETWEEN -180 AND 180 AND
        NOT (lat = 0 AND lon = 0) -- Éviter les coordonnées (0,0) par défaut
    );
END;
$$ LANGUAGE plpgsql;

-- Vue pour extraire facilement les coordonnées des sessions
CREATE OR REPLACE VIEW sessions_with_coordinates AS
SELECT 
    s.*,
    CASE 
        WHEN s.position_client IS NOT NULL THEN ST_Y(s.position_client::geometry)
        ELSE NULL 
    END AS client_latitude,
    CASE 
        WHEN s.position_client IS NOT NULL THEN ST_X(s.position_client::geometry)
        ELSE NULL 
    END AS client_longitude,
    CASE 
        WHEN s.destination_position IS NOT NULL THEN ST_Y(s.destination_position::geometry)
        ELSE NULL 
    END AS destination_latitude,
    CASE 
        WHEN s.destination_position IS NOT NULL THEN ST_X(s.destination_position::geometry)
        ELSE NULL 
    END AS destination_longitude
FROM sessions s;

-- Vue pour les sessions actives avec coordonnées
CREATE OR REPLACE VIEW sessions_actives AS
SELECT * FROM sessions_with_coordinates
WHERE expires_at > NOW()
ORDER BY updated_at DESC;

-- Commentaires
COMMENT ON FUNCTION extract_coordinates_from_session(TEXT) IS 'Extrait les coordonnées GPS depuis le format PostGIS des sessions';
COMMENT ON FUNCTION get_coordinates_from_postgis(GEOGRAPHY) IS 'Helper pour extraire lat/lng depuis une geography PostGIS';
COMMENT ON FUNCTION validate_coordinates(FLOAT, FLOAT) IS 'Valide que les coordonnées GPS sont dans des plages correctes';
COMMENT ON VIEW sessions_with_coordinates IS 'Vue avec coordonnées extraites des positions PostGIS';

SELECT 'Fonctions d extraction de coordonnées créées avec succès' AS status;