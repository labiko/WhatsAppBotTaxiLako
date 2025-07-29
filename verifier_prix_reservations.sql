-- Script pour vérifier les prix dans les réservations récentes
-- Exécuter dans Supabase SQL Editor

-- 1. Voir la dernière réservation avec tous les prix
SELECT 
    id,
    client_phone,
    vehicle_type,
    destination_nom,
    distance_km,
    prix_total,        -- Prix final stocké (affiché par C#)
    statut,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Vérifier toutes les colonnes prix disponibles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name LIKE '%prix%'
ORDER BY column_name;

-- 3. Voir les différentes colonnes prix si elles existent
SELECT 
    id,
    client_phone,
    prix_total,
    prix_estime,      -- Si cette colonne existe
    prix_confirme,    -- Si cette colonne existe
    distance_km,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Calculer le prix selon la formule bot Pular
SELECT 
    id,
    distance_km,
    prix_total,
    -- Formule bot principal: tarifBase + (distance * tarifKm)
    CASE 
        WHEN vehicle_type = 'moto' THEN 5000 + (distance_km * 1500)
        WHEN vehicle_type = 'voiture' THEN 8000 + (distance_km * 2000)
        ELSE 0
    END as prix_calcule_bot_principal,
    -- Formule bot Pular: distance * 4000
    (distance_km * 4000) as prix_calcule_bot_pular,
    vehicle_type
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;