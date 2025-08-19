-- 🧪 TEST GREEN API - FORMAT MESSAGE OPTIMISÉ
-- Test avec formatage spécialement adapté pour Green API

-- 1️⃣ SUPPRIMER ANCIEN TEST
DELETE FROM notifications_pending 
WHERE reservation_id IN (
    SELECT id FROM reservations WHERE client_phone = '+33620951645'
);

DELETE FROM reservations WHERE client_phone = '+33620951645';

-- 2️⃣ CRÉER NOUVELLE RÉSERVATION AVEC MESSAGE OPTIMISÉ
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
    code_validation,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '+33620951645',
    'moto',
    '0101000020E6100000795160A692B604405083B3A558504840',
    'Test Format Green API',
    'Destination Optimisée',
    'accepted',
    45000,
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- Balde
    'ABC123',  -- Code validation
    NOW(),
    NOW()
);

-- 3️⃣ CRÉER NOTIFICATION
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' ORDER BY created_at DESC LIMIT 1),
    'reservation_accepted',
    NOW()
);

-- 4️⃣ VÉRIFIER PRÉPARATION
SELECT 
    '🎯 TEST FORMATAGE GREEN API PRÊT' as status,
    r.id,
    r.client_phone,
    r.code_validation,
    c.nom as conducteur,
    c.telephone,
    c.vehicle_marque,
    c.vehicle_plaque
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.client_phone = '+33620951645'
ORDER BY r.created_at DESC
LIMIT 1;

-- =====================================================
-- 🚀 LANCER LE TEST
-- =====================================================
-- URL: http://localhost/api/ProcessWhatsAppNotifications
-- 
-- NOUVEAU FORMAT MESSAGE ATTENDU (sans indentation excessive) :
-- 
-- ✅ *CONDUCTEUR ASSIGNÉ*
-- 
-- 🚖 *balde mamadou souaré* • ⭐ 2.7/5
-- 📱 622111111
-- 🚗 null toyota yaris
-- 🏷️ RC-898-54
-- 🔐 *Code de validation : ABC123*
-- 
-- 💰 *45 000 GNF*
-- Arrivée dans ⏰ *0 min*
-- 
-- Le conducteur vous contactera bientôt. Bon voyage! 🛣️
-- 
-- =====================================================

-- 5️⃣ VÉRIFIER RÉSULTAT
SELECT 
    '📱 RÉSULTAT FORMAT TEST' as status,
    np.processed_at,
    CASE 
        WHEN np.processed_at IS NOT NULL THEN '✅ MESSAGE FORMATÉ ENVOYÉ' 
        ELSE '❌ PAS ENCORE TRAITÉ' 
    END as resultat
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645'
ORDER BY np.created_at DESC
LIMIT 1;