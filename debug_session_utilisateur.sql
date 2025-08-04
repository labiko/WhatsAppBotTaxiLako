-- ================================================
-- 🔍 DIAGNOSTIC SESSION UTILISATEUR PROBLÉMATIQUE
-- ================================================

-- 1. Récupérer la session de l'utilisateur test
SELECT 
    client_phone,
    vehicle_type,
    position_client,
    destination_nom,
    destination_id,
    destination_position,
    depart_nom,
    depart_id,
    distance_km,
    prix_estime,
    prix_confirme,
    etat,
    created_at,
    updated_at,
    planned_date,
    planned_hour,
    temporal_planning
FROM sessions 
WHERE client_phone = '+33620951645'  -- Numéro de test
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Vérifier les coordonnées GPS stockées
SELECT 
    client_phone,
    ST_AsText(position_client::geometry) as position_readable,
    ST_X(position_client::geometry) as longitude,
    ST_Y(position_client::geometry) as latitude,
    destination_nom,
    ST_AsText(destination_position::geometry) as destination_readable,
    distance_km,
    prix_estime
FROM sessions 
WHERE client_phone = '+33620951645'
  AND position_client IS NOT NULL
ORDER BY updated_at DESC
LIMIT 3;

-- 3. Historique des états de session
SELECT 
    client_phone,
    etat,
    vehicle_type,
    destination_nom,
    prix_estime,
    updated_at,
    created_at
FROM sessions 
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC
LIMIT 10;