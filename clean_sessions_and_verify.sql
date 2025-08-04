-- Script pour nettoyer les sessions et vérifier l'état
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, voir TOUTES les sessions du client
SELECT 
    id,
    waiting_for_note,
    reservation_to_rate,
    etat,
    vehicle_type,
    created_at,
    updated_at,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRÉE'
        ELSE 'ACTIVE'
    END AS status
FROM sessions
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC;

-- 2. Supprimer TOUTES les anciennes sessions (garder seulement la plus récente avec waiting_for_note)
DELETE FROM sessions 
WHERE client_phone = '+33620951645'
AND (waiting_for_note IS NULL OR waiting_for_note = false);

-- 3. Vérifier qu'il reste seulement la session de notation
SELECT 
    id,
    waiting_for_note,
    reservation_to_rate,
    etat,
    created_at,
    updated_at,
    expires_at
FROM sessions
WHERE client_phone = '+33620951645';

-- 4. Si aucune session avec waiting_for_note=true, créer manuellement
INSERT INTO sessions (
    client_phone,
    waiting_for_note,
    waiting_for_comment,
    reservation_to_rate,
    etat,
    expires_at
) VALUES (
    '+33620951645',
    true,
    false,
    'a85d105e-390f-4224-8583-0e9edbf96ab9',
    'waiting_for_note',
    NOW() + INTERVAL '1 hour'
) ON CONFLICT DO NOTHING;