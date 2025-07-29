-- Script de vérification de la position client en base
-- Vérifier que la position GPS a bien été sauvée dans la session

-- 1. Vérifier la session actuelle avec position
SELECT 
    client_phone,
    vehicle_type,
    etat,
    planned_date,
    planned_hour,
    temporal_planning,
    -- Extraire les coordonnées de la position client
    CASE 
        WHEN position_client IS NOT NULL THEN 
            'Position GPS: ' || ST_X(position_client::geometry) || ', ' || ST_Y(position_client::geometry)
        ELSE 'Position GPS: NULL'
    END as position_info,
    destination_nom,
    created_at,
    updated_at,
    expires_at
FROM public.sessions 
WHERE client_phone = '+33620951645' 
ORDER BY updated_at DESC 
LIMIT 1;

-- 2. Vérifier si la position est valide (coordonnées non nulles)
SELECT 
    'Position GPS détaillée:' as info,
    client_phone,
    CASE 
        WHEN position_client IS NOT NULL THEN
            CONCAT(
                'Latitude: ', ST_Y(position_client::geometry), 
                ' | Longitude: ', ST_X(position_client::geometry),
                ' | Format PostGIS: ', ST_AsText(position_client)
            )
        ELSE 'ERREUR: Position GPS NULL'
    END as coordonnees_completes,
    etat,
    temporal_planning,
    planned_date,
    planned_hour
FROM public.sessions 
WHERE client_phone = '+33620951645' 
    AND position_client IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 1;

-- 3. Vérifier l'historique des sessions pour ce numéro
SELECT 
    'Historique sessions:' as info,
    etat,
    CASE 
        WHEN position_client IS NOT NULL THEN 'GPS OK'
        ELSE 'GPS NULL'
    END as gps_status,
    destination_nom,
    vehicle_type,
    temporal_planning,
    updated_at
FROM public.sessions 
WHERE client_phone = '+33620951645' 
ORDER BY updated_at DESC 
LIMIT 5;

-- 4. Test de distance si position existe
SELECT 
    'Test calcul distance:' as info,
    client_phone,
    -- Distance entre position client et CHU Donka (exemple)
    CASE 
        WHEN position_client IS NOT NULL THEN
            ROUND(
                ST_Distance(
                    position_client,
                    ST_GeogFromText('POINT(-13.6832 9.5395)')  -- CHU Donka
                ) / 1000.0, 2
            ) || ' km vers CHU Donka'
        ELSE 'Impossible: Position client NULL'
    END as distance_test,
    etat,
    planned_date || ' ' || planned_hour || 'h' as reservation_planifiee
FROM public.sessions 
WHERE client_phone = '+33620951645' 
    AND etat = 'position_recue_planifiee'
ORDER BY updated_at DESC 
LIMIT 1;