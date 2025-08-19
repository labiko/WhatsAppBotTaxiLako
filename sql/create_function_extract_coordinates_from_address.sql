-- =================================================================
-- FONCTION SQL REQUISE - EXTRACTION COORDONNÉES DEPUIS WKB
-- =================================================================
--
-- OBJECTIF : Extraire lat/lng depuis position_depart (format WKB binaire)
--           pour le système de suggestions d'adresses personnelles
--
-- USAGE : Appelée depuis TypeScript via PostgREST RPC
-- FORMAT WKB : 0101000020E610000099620E828EB60440E4709CCA58504840
-- =================================================================

CREATE OR REPLACE FUNCTION extract_coordinates_from_address(address_id UUID)
RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extraire coordonnées depuis WKB binaire vers lat/lng
  RETURN QUERY
  SELECT 
    ST_Y(position_depart::geometry) as lat,
    ST_X(position_depart::geometry) as lng
  FROM client_addresses 
  WHERE id = address_id 
  AND position_depart IS NOT NULL
  AND position_depart != '';
  
  -- Log pour debugging (visible dans logs Supabase)
  RAISE NOTICE 'Extraction coordonnées pour address_id: %', address_id;
  
END;
$$;

-- =================================================================
-- PERMISSIONS ET SÉCURITÉ
-- =================================================================

-- Permettre l'appel via PostgREST (service_role uniquement)
GRANT EXECUTE ON FUNCTION extract_coordinates_from_address(UUID) TO service_role;

-- Commentaire fonction
COMMENT ON FUNCTION extract_coordinates_from_address(UUID) IS 
'Extrait les coordonnées lat/lng depuis position_depart (WKB binaire) pour une adresse client spécifique';

-- =================================================================
-- EXEMPLE D'UTILISATION
-- =================================================================

-- Depuis TypeScript via fetch :
-- POST /rest/v1/rpc/extract_coordinates_from_address
-- Body: {"address_id": "550e8400-e29b-41d4-a716-446655440000"}
-- Retour: {"lat": 9.6412, "lng": -13.5784}

-- Test manuel depuis SQL :
-- SELECT * FROM extract_coordinates_from_address('550e8400-e29b-41d4-a716-446655440000');