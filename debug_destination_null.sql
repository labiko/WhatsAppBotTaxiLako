-- ========================================
-- 🔍 ANALYSE DESTINATION NULL - REQUÊTES SIMPLES
-- ========================================

-- 1️⃣ SESSIONS RÉCENTES POUR +33620951645
SELECT 
    id,
    client_phone,
    vehicle_type,
    destination_nom,
    destination_id,
    destination_position,
    etat,
    created_at,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645' 
ORDER BY updated_at DESC 
LIMIT 10;

-- 2️⃣ DERNIÈRE SESSION AVEC DESTINATION
SELECT 
    destination_nom,
    destination_id,
    etat,
    suggestions_destination,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND destination_nom IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 5;

-- 3️⃣ SESSIONS AVEC ÉTAT choix_destination_multiple
SELECT 
    etat,
    suggestions_destination,
    destination_nom,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND etat = 'choix_destination_multiple'
ORDER BY updated_at DESC 
LIMIT 3;

-- 4️⃣ RÉSERVATIONS RÉCENTES POUR CE CLIENT
SELECT 
    id,
    client_phone,
    destination_nom,
    destination_position,
    status,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
ORDER BY created_at DESC 
LIMIT 5;

-- 5️⃣ DERNIÈRE SESSION COMPLÈTE (tous les champs)
SELECT *
FROM sessions 
WHERE client_phone = '+33620951645' 
ORDER BY updated_at DESC 
LIMIT 1;