-- =====================================================
-- Script d'ajout de la colonne depart_nom 
-- dans la table reservations
-- =====================================================

-- 1. Ajouter la colonne depart_nom à la table reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS depart_nom TEXT;

-- 2. Optionnel : Ajouter aussi depart_id pour référence complète
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS depart_id UUID;

-- 3. Ajouter une contrainte de clé étrangère pour depart_id (optionnel)
-- Commenté par défaut car le départ peut ne pas être dans la table adresses
-- ALTER TABLE reservations 
-- ADD CONSTRAINT fk_reservations_depart 
-- FOREIGN KEY (depart_id) REFERENCES adresses(id);

-- 4. Créer un index sur depart_nom pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_reservations_depart_nom 
ON reservations(depart_nom);

-- 5. Commenter les colonnes pour documentation
COMMENT ON COLUMN reservations.depart_nom IS 
'Nom du lieu de départ copié depuis sessions.depart_nom lors de la création de la réservation';

COMMENT ON COLUMN reservations.depart_id IS 
'ID du lieu de départ si présent dans la table adresses (optionnel)';

-- 6. Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name IN ('depart_nom', 'depart_id')
ORDER BY column_name;

-- =====================================================
-- NOTES D'IMPLÉMENTATION :
-- =====================================================
-- Ces colonnes seront remplies automatiquement par le bot
-- lors de la création d'une réservation en copiant
-- les valeurs depuis la table sessions :
-- - sessions.depart_nom → reservations.depart_nom
-- - sessions.depart_id → reservations.depart_id
--
-- Cela permettra d'avoir l'historique complet du trajet
-- avec les noms des lieux de départ et d'arrivée
-- =====================================================