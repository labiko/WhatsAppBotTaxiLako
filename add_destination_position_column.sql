-- =====================================================
-- Script d'ajout de la colonne destination_position 
-- dans la table reservations
-- =====================================================

-- 1. Ajouter la colonne destination_position à la table reservations
-- Type GEOGRAPHY pour cohérence avec la table sessions
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS destination_position GEOGRAPHY(POINT, 4326);

-- 2. Créer un index spatial pour optimiser les requêtes géographiques
CREATE INDEX IF NOT EXISTS idx_reservations_destination_position 
ON reservations USING GIST(destination_position);

-- 3. Commenter la colonne pour documentation
COMMENT ON COLUMN reservations.destination_position IS 
'Position GPS de destination copiée depuis sessions.destination_position lors de la création de la réservation';

-- 4. Vérifier que la colonne a été ajoutée
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name = 'destination_position';

-- =====================================================
-- NOTES D'IMPLÉMENTATION :
-- =====================================================
-- Cette colonne sera remplie automatiquement par le bot
-- lors de la création d'une réservation en copiant
-- la valeur de sessions.destination_position
--
-- Format attendu : POINT(longitude latitude)
-- Exemple : POINT(2.589 48.627)
--
-- La colonne est de type GEOGRAPHY pour :
-- - Cohérence avec sessions.destination_position
-- - Support des calculs de distance PostGIS
-- - Stockage optimisé des coordonnées GPS
-- =====================================================