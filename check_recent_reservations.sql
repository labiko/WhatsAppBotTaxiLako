-- Vérifier les réservations récentes
-- Exécuter dans Supabase SQL Editor

-- 1. Voir les 10 dernières réservations
SELECT 
    id,
    client_phone,
    vehicle_type,
    statut,
    created_at,
    destination_nom,
    prix_total
FROM reservations 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Vérifier spécifiquement pour le numéro de test
SELECT 
    id,
    client_phone,
    vehicle_type,
    statut,
    created_at,
    destination_nom,
    prix_total,
    distance_km
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Compter les réservations d'aujourd'hui
SELECT 
    COUNT(*) as total_today,
    statut,
    vehicle_type
FROM reservations 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY statut, vehicle_type
ORDER BY total_today DESC;