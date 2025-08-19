-- 🧪 TEST GREEN API SIMPLE - SQL + Tâche Planifiée
-- Créer une notification directe et lancer ProcessWhatsAppNotifications

-- 1️⃣ CRÉER RÉSERVATION ACCEPTED AVEC CONDUCTEUR
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
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '+33620951645',                                                    -- Votre numéro test
    'moto',
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position Balde
    'Test Green API Simple',
    'Destination Test',
    'accepted',                                                        -- ✅ Déjà accepted
    35000,
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',                         -- ID Balde
    NOW(),
    NOW()
);

-- 2️⃣ CRÉER NOTIFICATION DANS notifications_pending
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' ORDER BY created_at DESC LIMIT 1),
    'reservation_accepted',
    NOW()
);

-- 3️⃣ VÉRIFIER QUE TOUT EST PRÊT
SELECT 
    '🎯 PRÊT POUR TEST' as status,
    r.id as reservation_id,
    r.client_phone,
    r.statut,
    c.nom as conducteur_nom,
    c.telephone as conducteur_tel,
    np.id as notification_id,
    np.type,
    np.processed_at
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
JOIN notifications_pending np ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
AND np.processed_at IS NULL
ORDER BY r.created_at DESC
LIMIT 1;

-- =====================================================
-- 🚀 MAINTENANT EXÉCUTER LA TÂCHE PLANIFIÉE
-- =====================================================
-- 
-- COMMANDE À LANCER :
-- http://localhost/api/ProcessWhatsAppNotifications
-- 
-- OU ENDPOINT_TACHE_PLANIFIEE.cs directement
-- 
-- =====================================================

-- 4️⃣ VÉRIFIER RÉSULTAT APRÈS EXÉCUTION
SELECT 
    '📊 RÉSULTAT TEST' as status,
    np.processed_at,
    CASE 
        WHEN np.processed_at IS NOT NULL THEN '✅ MESSAGE ENVOYÉ' 
        ELSE '❌ PAS ENCORE TRAITÉ' 
    END as resultat,
    r.client_phone,
    r.prix_total
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
ORDER BY np.created_at DESC
LIMIT 1;

-- 📱 MESSAGE WHATSAPP ATTENDU SUR +33620951645 :
-- "🚗 MOTO assignée ! 
-- 🧑‍✈️ Conducteur: balde mamadou souaré
-- 📞 +224622111111 
-- 🚗 toyota yaris (RC-898-54)
-- 💰 35 000 GNF • Arrivée dans ⏰ 0 min
-- Le conducteur vous contactera bientôt. Bon voyage! 🛣️"