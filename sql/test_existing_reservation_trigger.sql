-- =====================================================
-- 🧪 TEST TRIGGER AVEC RÉSERVATION EXISTANTE
-- =====================================================
-- 
-- OBJECTIF : Tester le trigger corrigé en modifiant la réservation existante
-- MÉTHODE : Remettre à 'scheduled' puis simuler acceptation
-- RÉSERVATION : 7f5405c5-d590-40b0-bdf6-b22c6e8e6325
--
-- =====================================================

-- 📊 ÉTAPE 1: Vérifier l'état actuel de la réservation
SELECT 
    '📋 ÉTAT ACTUEL DE LA RÉSERVATION' as titre,
    id,
    client_phone,
    statut,
    date_reservation,
    heure_reservation,
    conducteur_id,
    updated_at
FROM reservations 
WHERE id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325';

-- 🔄 ÉTAPE 2: Remettre la réservation à 'scheduled' pour le test
UPDATE reservations 
SET 
    statut = 'scheduled',
    conducteur_id = null,  -- Retirer conducteur pour simuler état initial
    updated_at = now()
WHERE id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325'
RETURNING 
    '🔄 RÉSERVATION REMISE À SCHEDULED' as resultat,
    id,
    statut,
    conducteur_id;

-- 📊 ÉTAPE 3: Vérifier les conducteurs disponibles
SELECT 
    '🚗 CONDUCTEURS DISPONIBLES' as titre,
    id,
    nom,
    telephone,
    vehicle_type,
    statut
FROM conducteurs 
WHERE statut = 'disponible' 
    AND vehicle_type = 'moto'
LIMIT 3;

-- ⏸️ PAUSE - VÉRIFIEZ QUE LE TRIGGER CORRIGÉ A ÉTÉ EXÉCUTÉ AVANT DE CONTINUER
SELECT '⚠️ ASSUREZ-VOUS D''AVOIR EXÉCUTÉ fix_trigger_scheduled_notifications.sql AVANT L''ÉTAPE 4!' as avertissement;

-- 🧪 ÉTAPE 4: SIMULATION ACCEPTATION (décommentez pour exécuter)
/*
UPDATE reservations 
SET 
    conducteur_id = (
        SELECT id FROM conducteurs 
        WHERE statut = 'disponible' 
            AND vehicle_type = 'moto' 
        LIMIT 1
    ),
    statut = 'accepted',
    updated_at = now()
WHERE id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325'
    AND statut = 'scheduled'
RETURNING 
    '🎯 TRIGGER SCHEDULED→ACCEPTED DÉCLENCHÉ!' as resultat,
    id,
    statut as nouveau_statut,
    conducteur_id;
*/

-- 📊 ÉTAPE 5: Vérifier le résultat final (après ÉTAPE 4)
/*
SELECT 
    '📱 NOTIFICATION ENVOYÉE - VÉRIFIEZ WHATSAPP' as titre,
    r.id,
    r.statut,
    r.date_reservation,
    r.heure_reservation,
    r.client_phone,
    c.nom as conducteur_nom,
    c.telephone as conducteur_phone
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325';
*/

-- 📋 INSTRUCTIONS D'EXÉCUTION
SELECT '📋 PROCÉDURE:' as titre;
SELECT '1. Exécuter ÉTAPES 1-3' as etape_1;
SELECT '2. Exécuter fix_trigger_scheduled_notifications.sql' as etape_2;
SELECT '3. Décommenter et exécuter ÉTAPE 4' as etape_3;
SELECT '4. Décommenter et exécuter ÉTAPE 5 pour vérification' as etape_4;
SELECT '5. Vérifier WhatsApp +33620951645' as etape_5;