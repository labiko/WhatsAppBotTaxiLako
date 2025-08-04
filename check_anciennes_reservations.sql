-- Vérifier le contenu de position_depart dans les anciennes réservations
SELECT 
    id,
    client_phone,
    position_depart,
    position_arrivee,
    created_at,
    CASE 
        WHEN position_depart IS NULL THEN 'NULL'
        WHEN position_depart ~ '^POINT\(' THEN 'TEXT_FORMAT'
        WHEN position_depart ~ '^0101000020' THEN 'BINARY_GEOGRAPHY'
        ELSE 'AUTRE_FORMAT'
    END as format_position_depart
FROM reservations 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;