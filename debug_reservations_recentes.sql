-- ================================================
-- 🔍 DIAGNOSTIC RÉSERVATIONS RÉCENTES
-- ================================================

-- 1. Dernières tentatives de réservation pour l'utilisateur test
SELECT 
    id,
    client_phone,
    vehicle_type,
    ST_AsText(position_depart::geometry) as depart_coords,
    ST_AsText(position_arrivee::geometry) as arrivee_coords,  
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id,
    created_at,
    updated_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Réservations avec erreurs potentielles (champs NULL)
SELECT 
    id,
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    destination_nom,
    distance_km,
    prix_total,
    conducteur_id,
    statut,
    created_at,
    CASE 
        WHEN position_depart IS NULL THEN 'position_depart_NULL'
        WHEN position_arrivee IS NULL THEN 'position_arrivee_NULL'
        WHEN destination_nom IS NULL THEN 'destination_nom_NULL'
        WHEN vehicle_type IS NULL THEN 'vehicle_type_NULL'
        WHEN prix_total IS NULL THEN 'prix_total_NULL'
        ELSE 'OK'
    END as erreur_potentielle
FROM reservations 
WHERE client_phone = '+33620951645'
   OR created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier les conducteurs disponibles pour diagnostic
SELECT 
    id,
    nom,
    telephone,
    vehicle_type,
    statut,
    ST_AsText(position::geometry) as position_readable,
    note_moyenne,
    nb_courses
FROM conducteurs 
WHERE vehicle_type = 'moto' 
  AND statut = 'disponible'
LIMIT 5;