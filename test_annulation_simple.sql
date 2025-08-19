-- 🧪 TEST ANNULATION SIMPLE

-- 1️⃣ NETTOYER
DELETE FROM notifications_pending WHERE reservation_id IN (SELECT id FROM reservations WHERE client_phone = '+33620951645');
DELETE FROM reservations WHERE client_phone = '+33620951645';

-- 2️⃣ CRÉER RÉSERVATION ANNULÉE AVEC CONDUCTEUR BALDE
INSERT INTO reservations (
    id,
    client_phone,
    vehicle_type,
    statut,
    prix_total,
    conducteur_id,
    depart_nom,
    destination_nom,
    created_at
) VALUES (
    gen_random_uuid(),
    '+33620951645',
    'moto',
    'canceled',
    50000,
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- ID Balde
    'Test Annulation Départ',
    'Test Annulation Destination',
    NOW()
);

-- 3️⃣ CRÉER NOTIFICATION ANNULATION
INSERT INTO notifications_pending (
    reservation_id,
    type,
    created_at
) VALUES (
    (SELECT id FROM reservations WHERE client_phone = '+33620951645' ORDER BY created_at DESC LIMIT 1),
    'auto_cancellation',
    NOW()
);

-- 4️⃣ VÉRIFIER
SELECT 'PRÊT POUR TEST ANNULATION' as status, 
       np.id, 
       r.client_phone, 
       r.statut,
       c.nom as conducteur,
       np.type
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
JOIN conducteurs c ON c.id = r.conducteur_id
WHERE r.client_phone = '+33620951645' AND np.processed_at IS NULL;

-- 🚀 LANCER: http://localhost/api/ProcessWhatsAppNotifications