-- ================================================
-- 🔍 DIAGNOSTIC CONDUCTEURS DISPONIBLES
-- ================================================

-- 1. Vérifier les conducteurs moto disponibles
SELECT 
    id,
    nom,
    telephone,
    vehicle_type,
    statut,
    ST_AsText(position::geometry) as position_coords,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    note_moyenne,
    nb_courses,
    created_at
FROM conducteurs 
WHERE vehicle_type = 'moto'
ORDER BY statut, note_moyenne DESC;

-- 2. Distance des conducteurs par rapport au client (Paris)
WITH client_position AS (
    SELECT ST_GeogFromText('POINT(2.5891503 48.6276644)') as pos
)
SELECT 
    c.id,
    c.nom,
    c.vehicle_type,
    c.statut,
    ST_AsText(c.position::geometry) as conducteur_coords,
    ROUND(
        ST_Distance(c.position, cp.pos) / 1000.0, 2
    ) as distance_km
FROM conducteurs c, client_position cp
WHERE c.vehicle_type = 'moto'
  AND c.statut = 'disponible'
ORDER BY distance_km
LIMIT 10;

-- 3. Vérifier s'il y a des problèmes de clé étrangère
SELECT 
    r.id,
    r.client_phone,
    r.conducteur_id,
    c.nom as conducteur_nom,
    c.statut as conducteur_statut,
    r.statut as reservation_statut,
    r.created_at
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.created_at > NOW() - INTERVAL '1 day'
  AND (r.conducteur_id IS NOT NULL AND c.id IS NULL)  -- Conducteur manquant
ORDER BY r.created_at DESC;