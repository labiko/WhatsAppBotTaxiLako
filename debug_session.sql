-- Script de debug pour vérifier les sessions créées par le testeur

-- 1. Vérifier toutes les sessions pour notre numéro test
SELECT 
    'Sessions actuelles:' as info,
    client_phone,
    vehicle_type,
    etat,
    created_at,
    updated_at,
    expires_at,
    -- Calculer le temps restant
    CASE 
        WHEN expires_at > NOW() THEN 
            EXTRACT(EPOCH FROM (expires_at - NOW())) || ' seconds restantes'
        ELSE 'EXPIREE - ' || EXTRACT(EPOCH FROM (NOW() - expires_at)) || ' seconds ago'
    END as expiration_status
FROM public.sessions 
WHERE client_phone = '+33620951645' 
ORDER BY updated_at DESC 
LIMIT 10;

-- 2. Vérifier le format exact du numéro de téléphone
SELECT 
    'Format numéros:' as info,
    DISTINCT client_phone,
    LENGTH(client_phone) as longueur,
    COUNT(*) as nombre_sessions
FROM public.sessions 
WHERE client_phone LIKE '%33620951645%'
GROUP BY client_phone
ORDER BY updated_at DESC;

-- 3. Sessions créées dans les 5 dernières minutes
SELECT 
    'Sessions récentes (5 min):' as info,
    client_phone,
    etat,
    vehicle_type,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'ACTIVE'
        ELSE 'EXPIREE'
    END as status
FROM public.sessions 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;