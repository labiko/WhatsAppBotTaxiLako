-- ⚡ DIAGNOSTIC RAPIDE - Copier/coller dans Supabase SQL Editor

-- 1. 📋 Session utilisateur actuelle
SELECT 
    '=== SESSION UTILISATEUR ===' as debug_section,
    client_phone,
    vehicle_type,
    ST_AsText(position_client::geometry) as gps_client,
    destination_nom,
    distance_km,
    prix_estime,
    etat,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC 
LIMIT 2;

-- 2. 🚨 Dernières réservations (succès/échec)
SELECT 
    '=== RESERVATIONS RECENTES ===' as debug_section,
    id,
    client_phone,
    vehicle_type,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 3;

-- 3. 🔧 Test insertion avec données session
WITH session_data AS (
  SELECT 
    client_phone,
    vehicle_type,
    position_client,
    destination_nom,
    distance_km,
    prix_estime
  FROM sessions 
  WHERE client_phone = '+33620951645' 
    AND etat = 'prix_calcule'
  ORDER BY updated_at DESC 
  LIMIT 1
)
SELECT 
    '=== TEST INSERTION ===' as debug_section,
    CASE 
        WHEN client_phone IS NULL THEN '❌ Pas de session prix_calcule'
        WHEN vehicle_type IS NULL THEN '❌ vehicle_type NULL'
        WHEN position_client IS NULL THEN '❌ position_client NULL'  
        WHEN destination_nom IS NULL THEN '❌ destination_nom NULL'
        WHEN distance_km IS NULL THEN '❌ distance_km NULL'
        WHEN prix_estime IS NULL THEN '❌ prix_estime NULL'
        ELSE '✅ Données session OK pour insertion'
    END as diagnostic,
    client_phone,
    vehicle_type,
    destination_nom,
    distance_km,
    prix_estime
FROM session_data;

-- 4. 🏍️ Conducteurs moto disponibles
SELECT 
    '=== CONDUCTEURS MOTO ===' as debug_section,
    COUNT(*) as nb_conducteurs_moto,
    COUNT(CASE WHEN statut = 'disponible' THEN 1 END) as nb_disponibles
FROM conducteurs 
WHERE vehicle_type = 'moto';