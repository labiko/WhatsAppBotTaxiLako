-- 🧪 TEST WORKFLOW COMPLET - RÉSERVATIONS PENDING → ACCEPTED
-- Simulation du flux réel : Création pending → Acceptation conducteur → Notification client

-- 1️⃣ NETTOYER ANCIENS TESTS
DELETE FROM notifications_pending 
WHERE reservation_id IN (
    SELECT id FROM reservations WHERE client_phone = '+33620951645'
);

DELETE FROM reservations WHERE client_phone = '+33620951645';

-- 2️⃣ CRÉER RÉSERVATION PENDING (comme le bot)
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    depart_nom,
    destination_nom,
    statut,
    prix_total,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '+33620951645',                                                    -- Client test
    'moto',                                                           -- Type demandé
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position Balde
    'Test Workflow Pending',                                          -- Départ
    'Destination Test Complete',                                      -- Destination
    'pending',                                                        -- ✅ PENDING (réaliste)
    55000,                                                           -- Prix calculé
    NOW(),
    NOW()
);

-- 3️⃣ VÉRIFIER CRÉATION RÉSERVATION PENDING
SELECT 
    '🔄 RÉSERVATION PENDING CRÉÉE' as status,
    id,
    client_phone,
    vehicle_type,
    statut,
    prix_total,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
AND statut = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- =====================================================
-- 🎯 SIMULATION ACCEPTATION PAR CONDUCTEUR
-- =====================================================

-- 4️⃣ RÉCUPÉRER L'ID DE LA RÉSERVATION CRÉÉE
\set reservation_id (SELECT id FROM reservations WHERE client_phone = '+33620951645' AND statut = 'pending' ORDER BY created_at DESC LIMIT 1)

-- 5️⃣ SIMULER ACCEPTATION PAR CONDUCTEUR BALDE
-- (Ceci déclenche automatiquement le trigger qui insert dans notifications_pending)
UPDATE reservations 
SET statut = 'accepted', 
    conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- Balde
    updated_at = NOW()
WHERE client_phone = '+33620951645' 
AND statut = 'pending';

-- 6️⃣ VÉRIFIER QUE LE TRIGGER A CRÉÉ LA NOTIFICATION
SELECT 
    '🔔 NOTIFICATION CRÉÉE PAR TRIGGER' as status,
    np.id as notification_id,
    np.type,
    np.created_at,
    np.processed_at,
    r.id as reservation_id,
    r.statut,
    r.conducteur_id,
    c.nom as conducteur_nom
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
LEFT JOIN conducteurs c ON c.id = r.conducteur_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
ORDER BY np.created_at DESC
LIMIT 1;

-- =====================================================
-- 🚀 MAINTENANT LANCER ProcessWhatsAppNotifications
-- =====================================================
-- URL: http://localhost/api/ProcessWhatsAppNotifications
-- 
-- RÉSULTAT ATTENDU AVEC NOUVEAU FORMATAGE :
-- 
-- 🎯 *TAXI CONFIRMÉ*
-- 
-- 🏍️ *mamadou souaré balde* ★★⭐ (2.7)
-- 📞 +224 62 21 11 111
-- 🚗 Toyota Yaris  
-- 🏷️ RC-898-54
-- 
-- 💰 *55 000 GNF* • ⏱️ *15 min*
-- 
-- 🚀 Votre conducteur arrive !
-- 📱 Il vous contactera bientôt
-- 
-- =====================================================

-- 7️⃣ VÉRIFIER RÉSULTAT FINAL APRÈS TRAITEMENT
SELECT 
    '📱 RÉSULTAT WORKFLOW COMPLET' as status,
    np.processed_at,
    CASE 
        WHEN np.processed_at IS NOT NULL THEN '✅ MESSAGE ENVOYÉ AVEC NOUVEAU FORMAT' 
        ELSE '❌ PAS ENCORE TRAITÉ' 
    END as resultat,
    r.statut,
    r.prix_total,
    c.nom as conducteur
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
JOIN conducteurs c ON c.id = r.conducteur_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
ORDER BY np.created_at DESC
LIMIT 1;

-- 8️⃣ STATISTIQUES DU TEST
SELECT 
    '📊 STATISTIQUES TEST' as info,
    COUNT(*) as total_reservations,
    COUNT(CASE WHEN statut = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN conducteur_id IS NOT NULL THEN 1 END) as with_driver
FROM reservations 
WHERE client_phone = '+33620951645';

SELECT 
    '📊 NOTIFICATIONS GÉNÉRÉES' as info,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed_count
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645';