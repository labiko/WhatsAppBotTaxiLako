-- 🧪 TEST MULTI-PROVIDER WHATSAPP - WORKFLOW COMPLET
-- Ce test simule le flux réel : réservation → notification conducteur → acceptation → message client

-- 1️⃣ CRÉER RÉSERVATION (déclenche notifications conducteurs après 30s)
INSERT INTO reservations (
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
    '+33620951645',                                                    
    'moto',                                                           
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position Balde
    'Test Multi-Provider',                                            
    'Destination WhatsApp',                                           
    'pending',                                                        -- 🔄 Reste pending jusqu'à acceptation
    45000,                                                           
    NOW(),
    NOW()
);

-- 2️⃣ ATTENDRE ~30 SECONDES
-- Le système va automatiquement :
-- - Envoyer notifications OneSignal aux conducteurs
-- - Mettre à jour notified_at = NOW()
-- - MAIS garder statut = 'pending'

-- 3️⃣ VÉRIFIER QUE notified_at EST MIS À JOUR (après 30s)
SELECT 
    id,
    client_phone,
    statut,                    -- Doit être 'pending'
    notified_at,              -- Doit être mis à jour après 30s
    conducteur_id,            -- Doit être NULL encore
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
AND statut = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- 4️⃣ SIMULER ACCEPTATION PAR CONDUCTEUR (déclenche message WhatsApp client)
-- ⚠️ REMPLACER 'RESERVATION_ID_ICI' PAR L'ID RÉEL D'EN HAUT
UPDATE reservations 
SET statut = 'accepted', 
    conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'  -- ID Balde
WHERE id = 'RESERVATION_ID_ICI'  -- 👈 REMPLACER PAR L'ID RÉEL
AND statut = 'pending';

-- 5️⃣ VÉRIFIER RÉSULTAT FINAL
SELECT 
    id,
    client_phone,
    statut,                    -- Doit être 'accepted'
    conducteur_id,            -- Doit être Balde
    notified_at,              -- Mis à jour depuis étape 2
    created_at,
    updated_at                -- Mis à jour depuis étape 4
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;

-- 📊 TIMELINE ATTENDUE :
-- T+0s   : INSERT → statut='pending', notified_at=NULL
-- T+30s  : Auto-process → statut='pending', notified_at=NOW() [notifications conducteurs]  
-- T+??   : Manual UPDATE → statut='accepted' [trigger → message WhatsApp client via Green API]

-- 📱 MESSAGE WHATSAPP CLIENT ATTENDU (après étape 4) :
-- "🚗 MOTO assignée ! 
-- 🧑‍✈️ Conducteur: balde mamadou souaré
-- 📞 +224622111111 
-- 🚗 toyota yaris (RC-898-54)
-- 💰 45 000 GNF • Arrivée dans ⏰ 0 min
-- Le conducteur vous contactera bientôt. Bon voyage! 🛣️"