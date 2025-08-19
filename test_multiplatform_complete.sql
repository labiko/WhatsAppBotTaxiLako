-- 🧪 TEST COMPLET SYSTÈME MULTI-PROVIDER
-- Création réservation + simulation acceptation manuelle

-- 1️⃣ CRÉER RÉSERVATION TEST
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
    '+33620951645',                                                    -- Numéro test
    'moto',                                                           -- Type véhicule
    '0101000020E6100000795160A692B604405083B3A558504840',            -- Position Balde
    'Position Test MultiProvider',                                    -- Départ
    'Destination Test',                                               -- Destination
    'pending',                                                        -- ⚠️ IMPORTANT: Rester en pending
    35000,                                                           -- Prix test
    NOW(),
    NOW()
);

-- 2️⃣ VÉRIFIER RÉSERVATION CRÉÉE
SELECT 
    id,
    client_phone,
    statut,
    notified_at,
    conducteur_id,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
AND statut = 'pending'
ORDER BY created_at DESC 
LIMIT 1;

-- 3️⃣ COMMANDES POUR TESTER LE MULTI-PROVIDER

-- A. COPIER L'ID DE LA RÉSERVATION D'EN HAUT
-- B. REMPLACER 'RESERVATION_ID_ICI' PAR L'ID RÉEL
-- C. EXÉCUTER LA COMMANDE UPDATE

-- 🔥 SIMULATION ACCEPTATION PAR CONDUCTEUR (déclenche le trigger)
UPDATE reservations 
SET statut = 'accepted', 
    conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'  -- ID Balde
WHERE id = 'RESERVATION_ID_ICI'  -- 👈 REMPLACER PAR L'ID RÉEL
AND statut = 'pending';

-- 4️⃣ VÉRIFIER RÉSULTAT FINAL
SELECT 
    id,
    client_phone,
    statut,
    conducteur_id,
    notified_at,
    created_at,
    updated_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;

-- 📱 RÉSULTAT ATTENDU :
-- - statut = 'accepted'
-- - conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa' 
-- - notified_at = [TIMESTAMP RÉCENT] ✅ Mis à jour par le trigger automatique
-- - Message WhatsApp envoyé via Green API (selon web.config)