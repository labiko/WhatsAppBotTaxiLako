-- 🧪 TEST ANNULATION AUTOMATIQUE - Notifications clients
-- Test du système d'annulation avec notifications multi-provider

-- 1️⃣ NETTOYER ANCIENS TESTS
DELETE FROM notifications_pending 
WHERE reservation_id IN (
    SELECT id FROM reservations WHERE client_phone = '+33620951645'
);

DELETE FROM reservations WHERE client_phone = '+33620951645';

-- 2️⃣ CRÉER RÉSERVATION POUR ANNULATION
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
    'voiture',                                                        -- Type voiture
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position test
    'Test Annulation',                                                -- Départ
    'Destination Annulée',                                            -- Destination
    'pending',                                                        -- Statut initial
    65000,                                                           -- Prix
    NOW() - INTERVAL '10 minutes',                                   -- Créée il y a 10 min
    NOW() - INTERVAL '5 minutes'                                     -- Modifiée il y a 5 min
);

-- 3️⃣ SIMULER ANNULATION AUTOMATIQUE (timeout, refus, etc.)
UPDATE reservations 
SET statut = 'canceled',
    updated_at = NOW()
WHERE client_phone = '+33620951645' 
AND statut = 'pending';

-- 4️⃣ CRÉER NOTIFICATION D'ANNULATION MANUELLE
-- (Simuler ce que ferait le système d'annulation automatique)
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' ORDER BY created_at DESC LIMIT 1),
    'auto_cancellation',                                              -- 🔥 Type annulation
    NOW()
);

-- 5️⃣ VÉRIFIER PRÉPARATION TEST ANNULATION
SELECT 
    '❌ TEST ANNULATION PRÊT' as status,
    r.id as reservation_id,
    r.client_phone,
    r.vehicle_type,
    r.statut,
    r.prix_total,
    np.id as notification_id,
    np.type as notification_type,
    np.processed_at
FROM reservations r
JOIN notifications_pending np ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND r.statut = 'canceled'
AND np.type = 'auto_cancellation'
ORDER BY r.created_at DESC
LIMIT 1;

-- =====================================================
-- 🚀 LANCER ProcessWhatsAppNotifications POUR ANNULATION
-- =====================================================
-- URL: http://localhost/api/ProcessWhatsAppNotifications
-- 
-- RÉSULTAT ATTENDU (Message d'annulation) :
-- 
-- ❌ *RÉSERVATION ANNULÉE*
-- 
-- 🚫 Votre demande de taxi n'a pas pu être satisfaite
-- 💰 Montant: 65 000 GNF
-- 
-- 🔄 Vous pouvez refaire une demande immédiatement
-- 📱 Merci de votre compréhension
-- 
-- =====================================================

-- 6️⃣ VÉRIFIER RÉSULTAT APRÈS TRAITEMENT
SELECT 
    '📱 RÉSULTAT TEST ANNULATION' as status,
    np.processed_at,
    CASE 
        WHEN np.processed_at IS NOT NULL THEN '✅ MESSAGE ANNULATION ENVOYÉ' 
        ELSE '❌ PAS ENCORE TRAITÉ' 
    END as resultat,
    r.statut,
    r.prix_total
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'auto_cancellation'
ORDER BY np.created_at DESC
LIMIT 1;

-- 7️⃣ CRÉER AUSSI UN TEST DE NOTATION (bonus)
-- Simuler une réservation terminée qui attend notation

INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    position_depart,
    depart_nom,
    destination_nom,
    statut,
    prix_total,
    conducteur_id,
    date_code_validation,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '+33620951645',
    'moto',
    '0101000020E6100000795160A692B604405083B3A558504840',
    'Test Notation',
    'Destination Validée',
    'completed',
    35000,
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- Balde
    NOW(),                                    -- Course validée maintenant
    NOW() - INTERVAL '30 minutes',
    NOW()
);

-- Créer notification de demande de notation
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' AND statut = 'completed' ORDER BY created_at DESC LIMIT 1),
    'course_validated',                       -- 🔥 Type notation
    NOW()
);

-- 8️⃣ STATISTIQUES FINALES
SELECT 
    '📊 TYPES DE NOTIFICATIONS À TRAITER' as info,
    type,
    COUNT(*) as count,
    COUNT(CASE WHEN processed_at IS NULL THEN 1 END) as pending_count
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
GROUP BY type
ORDER BY type;