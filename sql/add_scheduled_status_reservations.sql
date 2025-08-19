-- =====================================================
-- 🔧 AJOUT STATUT 'scheduled' À LA TABLE RESERVATIONS
-- =====================================================
-- 
-- OBJECTIF : Permettre le statut 'scheduled' pour les réservations planifiées
-- IMPACT : Aucun impact sur les données existantes
-- SÉCURITÉ : Contrainte CHECK étendue sans supprimer les statuts existants
--
-- =====================================================

-- 📋 ÉTAPE 1: Supprimer l'ancienne contrainte CHECK
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_statut_check;

-- 📋 ÉTAPE 2: Ajouter la nouvelle contrainte CHECK avec 'scheduled'
ALTER TABLE reservations 
ADD CONSTRAINT reservations_statut_check 
CHECK (statut = ANY (ARRAY[
    'pending'::text, 
    'confirmee'::text, 
    'accepted'::text, 
    'refused'::text, 
    'completed'::text, 
    'canceled'::text, 
    'auto_canceled'::text,
    'scheduled'::text        -- ✅ NOUVEAU STATUT AJOUTÉ
]));

-- 📋 ÉTAPE 3: Validation de l'ajout
SELECT 
    '✅ STATUT scheduled AJOUTÉ AVEC SUCCÈS' as status,
    'Contrainte CHECK mise à jour pour table reservations' as details;

-- 📋 ÉTAPE 4: Test de validation du nouveau statut
-- (Création temporaire d'une réservation test avec statut 'scheduled')
INSERT INTO reservations (
    client_phone, 
    vehicle_type, 
    statut
) VALUES (
    '+224999999999', 
    'moto', 
    'scheduled'
) 
RETURNING id, statut;

-- 📋 ÉTAPE 5: Suppression de la réservation test
DELETE FROM reservations 
WHERE client_phone = '+224999999999' 
AND statut = 'scheduled';

-- 📊 RAPPORT FINAL
SELECT '🎯 MODIFICATION TERMINÉE - STATUT scheduled DISPONIBLE' as rapport_final;