-- 🧪 RESERVATION DE TEST - Position identique à conducteur Balde
-- Position GPS de Balde : 0101000020E6100000795160A692B604405083B3A558504840
-- Pour tester le système multi-provider WhatsApp

INSERT INTO reservations (
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
    '+33620951645',                                                    -- Numéro test français
    'moto',                                                           -- Même type que Balde
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position EXACTE de Balde
    'Position Test Balde',                                            -- Nom départ
    'Destination Test',                                               -- Nom destination  
    'pending',                                                        -- Statut pour déclencher notification
    25000,                                                           -- Prix test 25,000 GNF
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',                         -- ID conducteur Balde
    NOW(),                                                           -- Date création
    NOW()                                                            -- Date mise à jour
);

-- 📋 VERIFICATION - Afficher la réservation créée
SELECT 
    id,
    client_phone,
    vehicle_type,
    depart_nom,
    destination_nom,
    statut,
    prix_total,
    conducteur_id,
    ST_X(position_depart) as longitude,
    ST_Y(position_depart) as latitude,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
AND statut = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- 📱 MESSAGE WHATSAPP ATTENDU :
-- "🚗 MOTO assignée ! 
-- 🧑‍✈️ Conducteur: balde mamadou souaré
-- 📞 +224622111111 
-- 🚗 toyota yaris (RC-898-54)
-- 💰 25 000 GNF • Arrivée dans ⏰ 0 min
-- Le conducteur vous contactera bientôt. Bon voyage! 🛣️"