-- 🧪 TEST MULTI-PROVIDER WHATSAPP - FORCER NOTIFICATION CLIENT
-- Option 1: Forcer insertion dans notifications_pending
-- Option 2: Simuler acceptation complète

-- ==================================================
-- OPTION 1 : FORCER NOTIFICATION CLIENT MANUELLE
-- ==================================================

-- 1️⃣ CRÉER RÉSERVATION DE TEST  
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
    gen_random_uuid(),                                                 -- ID unique
    '+33620951645',                                                    -- Client test
    'moto',                                                           -- Type
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position Balde
    'Test Force WhatsApp',                                            -- Départ
    'Destination Force',                                              -- Destination
    'accepted',                                                       -- ✅ DÉJÀ ACCEPTED
    55000,                                                           -- Prix
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',                         -- Conducteur Balde
    NOW(),
    NOW()
);

-- 2️⃣ FORCER INSERTION DANS notifications_pending
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at,
    processed_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' ORDER BY created_at DESC LIMIT 1),
    'reservation_accepted',
    NOW(),
    NULL  -- NULL = En attente de traitement
)
ON CONFLICT (reservation_id, type) DO NOTHING;

-- 3️⃣ VÉRIFIER QUE TOUT EST PRÊT
SELECT 
    'RÉSERVATION PRÊTE' as status,
    r.id,
    r.client_phone,
    r.statut,
    r.conducteur_id,
    np.type as notification_type,
    np.processed_at
FROM reservations r
JOIN notifications_pending np ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
AND np.processed_at IS NULL
ORDER BY r.created_at DESC
LIMIT 1;

-- ==================================================
-- MAINTENANT EXÉCUTER ProcessWhatsAppNotifications()
-- ==================================================
-- URL: http://localhost/api/ProcessWhatsAppNotifications
-- 
-- RÉSULTAT ATTENDU :
-- ✅ Lecture de notifications_pending
-- ✅ Envoi WhatsApp via provider configuré (Green API/Twilio)
-- ✅ Mise à jour processed_at = NOW()
-- 
-- MESSAGE WHATSAPP ATTENDU :
-- "🚗 MOTO assignée ! 
-- 🧑‍✈️ Conducteur: balde mamadou souaré
-- 📞 +224622111111 
-- 🚗 toyota yaris (RC-898-54)
-- 💰 55 000 GNF • Arrivée dans ⏰ 0 min
-- Le conducteur vous contactera bientôt. Bon voyage! 🛣️"

-- ==================================================
-- VÉRIFICATION POST-TEST
-- ==================================================
SELECT 
    'APRÈS TEST' as status,
    np.processed_at,
    np.created_at,
    CASE 
        WHEN np.processed_at IS NOT NULL THEN '✅ TRAITÉ' 
        ELSE '❌ NON TRAITÉ' 
    END as resultat
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
AND np.type = 'reservation_accepted'
ORDER BY np.created_at DESC
LIMIT 1;