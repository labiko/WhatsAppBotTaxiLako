-- Fonction pour extraire les coordonnées depuis le format binaire PostGIS
CREATE OR REPLACE FUNCTION extract_coordinates(position_data GEOGRAPHY)
RETURNS TABLE (
    latitude FLOAT,
    longitude FLOAT
) AS $$
BEGIN
    -- Vérifier si la position est NULL
    IF position_data IS NULL THEN
        RETURN QUERY SELECT 0.0::FLOAT AS latitude, 0.0::FLOAT AS longitude;
        RETURN;
    END IF;

    -- Extraire latitude et longitude depuis la géographie PostGIS
    RETURN QUERY 
    SELECT 
        ST_Y(position_data::geometry)::FLOAT AS latitude,
        ST_X(position_data::geometry)::FLOAT AS longitude;
END;
$$ LANGUAGE plpgsql;