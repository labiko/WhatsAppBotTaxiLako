-- =================================================================
-- 🔧 FIX CRITICAL - Erreur SRID Geometry Mixing PostGIS
-- =================================================================
-- 
-- PROBLÈME IDENTIFIÉ DANS LES LOGS :
-- "LWGEOM_dwithin: Operation on mixed SRID geometries (Point, 4326) != (Point, 0)"
-- 
-- CAUSE : Mélange de systèmes de coordonnées dans les géométries
-- - GPS Client : SRID 4326 ✅
-- - Google Places API : SRID 0 ou inconsistant ❌
-- 
-- SOLUTION : Uniformiser toutes les géométries avec SRID 4326
-- =================================================================

-- 1. VÉRIFICATION ÉTAT ACTUEL
SELECT 
    'adresses' as table_name,
    ST_SRID(position) as srid,
    COUNT(*) as count
FROM adresses 
WHERE position IS NOT NULL
GROUP BY ST_SRID(position);

SELECT 
    'reservations_position_depart' as table_name,
    ST_SRID(position_depart) as srid,
    COUNT(*) as count
FROM reservations 
WHERE position_depart IS NOT NULL
GROUP BY ST_SRID(position_depart);

SELECT 
    'reservations_position_arrivee' as table_name,
    ST_SRID(position_arrivee) as srid,
    COUNT(*) as count
FROM reservations 
WHERE position_arrivee IS NOT NULL
GROUP BY ST_SRID(position_arrivee);

-- 2. CORRECTION GÉOMÉTRIES AVEC SRID INCORRECT

-- ✅ Table adresses (si nécessaire)
UPDATE adresses 
SET position = ST_SetSRID(position, 4326)
WHERE position IS NOT NULL 
  AND ST_SRID(position) != 4326;

-- ✅ Table reservations - Position de départ
UPDATE reservations 
SET position_depart = ST_SetSRID(position_depart, 4326)
WHERE position_depart IS NOT NULL 
  AND ST_SRID(position_depart) != 4326;

-- ✅ Table reservations - Position d'arrivée (CRITIQUE - source du bug)
UPDATE reservations 
SET position_arrivee = ST_SetSRID(position_arrivee, 4326)
WHERE position_arrivee IS NOT NULL 
  AND ST_SRID(position_arrivee) != 4326;

-- 3. CONTRAINTES POUR ÉVITER LA RÉGRESSION

-- ✅ Contrainte SRID sur table adresses
ALTER TABLE adresses 
ADD CONSTRAINT check_adresses_srid_4326 
CHECK (position IS NULL OR ST_SRID(position) = 4326);

-- ✅ Contraintes SRID sur table reservations
ALTER TABLE reservations 
ADD CONSTRAINT check_reservations_depart_srid_4326 
CHECK (position_depart IS NULL OR ST_SRID(position_depart) = 4326);

ALTER TABLE reservations 
ADD CONSTRAINT check_reservations_arrivee_srid_4326 
CHECK (position_arrivee IS NULL OR ST_SRID(position_arrivee) = 4326);

-- 4. FONCTION HELPER POUR FUTURES INSERTIONS

CREATE OR REPLACE FUNCTION ensure_srid_4326(geom geometry)
RETURNS geometry AS $$
BEGIN
    IF geom IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Si pas de SRID ou SRID incorrect, forcer 4326
    IF ST_SRID(geom) = 0 OR ST_SRID(geom) != 4326 THEN
        RETURN ST_SetSRID(geom, 4326);
    END IF;
    
    RETURN geom;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. TRIGGER POUR AUTO-CORRECTION (OPTIONNEL)

CREATE OR REPLACE FUNCTION auto_fix_srid()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-corriger SRID pour toutes les géométries
    IF TG_TABLE_NAME = 'reservations' THEN
        NEW.position_depart = ensure_srid_4326(NEW.position_depart);
        NEW.position_arrivee = ensure_srid_4326(NEW.position_arrivee);
    ELSIF TG_TABLE_NAME = 'adresses' THEN
        NEW.position = ensure_srid_4326(NEW.position);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables critiques
DROP TRIGGER IF EXISTS auto_fix_srid_reservations ON reservations;
CREATE TRIGGER auto_fix_srid_reservations
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION auto_fix_srid();

DROP TRIGGER IF EXISTS auto_fix_srid_adresses ON adresses;
CREATE TRIGGER auto_fix_srid_adresses
    BEFORE INSERT OR UPDATE ON adresses
    FOR EACH ROW EXECUTE FUNCTION auto_fix_srid();

-- 6. VÉRIFICATION FINALE

SELECT 'POST-FIX VERIFICATION' as status;

SELECT 
    'adresses_post_fix' as table_name,
    ST_SRID(position) as srid,
    COUNT(*) as count
FROM adresses 
WHERE position IS NOT NULL
GROUP BY ST_SRID(position);

SELECT 
    'reservations_depart_post_fix' as table_name,
    ST_SRID(position_depart) as srid,
    COUNT(*) as count
FROM reservations 
WHERE position_depart IS NOT NULL
GROUP BY ST_SRID(position_depart);

SELECT 
    'reservations_arrivee_post_fix' as table_name,
    ST_SRID(position_arrivee) as srid,
    COUNT(*) as count
FROM reservations 
WHERE position_arrivee IS NOT NULL
GROUP BY ST_SRID(position_arrivee);

-- 7. TEST DE FONCTIONNEMENT

-- Test insertion avec différents formats (devrait tous fonctionner)
INSERT INTO reservations (
    client_phone, 
    vehicle_type, 
    position_depart, 
    position_arrivee,
    destination_nom,
    distance_km,
    prix_total,
    statut
) VALUES (
    'TEST_SRID',
    'moto',
    ST_GeomFromText('POINT(2.5815859 48.6278423)', 4326),  -- GPS Client
    ST_SetSRID(ST_GeomFromText('POINT(-13.6672064 9.5423724)'), 4326),  -- Google Places
    'Test SRID Fix',
    100.5,
    50000,
    'pending'
);

-- Nettoyer le test
DELETE FROM reservations WHERE client_phone = 'TEST_SRID';

-- =================================================================
-- ✅ RÉSULTAT ATTENDU :
-- - Toutes les géométries uniformisées avec SRID 4326
-- - Plus d'erreur "LWGEOM_dwithin: mixed SRID geometries"
-- - Bot fonctionnel pour GPS Client + Google Places API
-- - Protection contre futures régressions avec triggers
-- =================================================================

SELECT '🎯 FIX SRID GEOMETRY MIXING COMPLETED' as result;