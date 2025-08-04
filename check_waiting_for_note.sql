-- Requête pour vérifier toutes les sessions avec waitingForNote
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les sessions du client +33620951645
SELECT 
    id,
    client_phone,
    waiting_for_note AS "waitingForNote",
    waiting_for_comment AS "waitingForComment", 
    reservation_to_rate AS "reservationToRate",
    vehicle_type,
    etat,
    created_at,
    updated_at,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS "minutes_until_expiry"
FROM sessions
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC;

-- 2. Vérifier TOUTES les sessions avec waitingForNote = true
SELECT 
    client_phone,
    waiting_for_note AS "waitingForNote",
    reservation_to_rate AS "reservationToRate",
    created_at,
    updated_at,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'EXPIRÉE'
        ELSE 'ACTIVE'
    END AS status
FROM sessions
WHERE waiting_for_note = true
ORDER BY updated_at DESC;

-- 3. Vérifier la dernière réservation du client
SELECT 
    r.id,
    r.client_phone,
    r.statut,
    r.note_conducteur,
    r.date_code_validation,
    r.date_add_commentaire,
    c.prenom || ' ' || c.nom AS conducteur
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.client_phone = '+33620951645'
ORDER BY r.created_at DESC
LIMIT 5;

-- 4. Debug: Structure de la table sessions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;