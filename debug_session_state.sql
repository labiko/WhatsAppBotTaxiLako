-- ================================================================
-- DIAGNOSTIC SESSION STATE - Problème sélection numérique "4"
-- ================================================================

-- 1. Vérifier toutes les sessions du client test
SELECT 
    id,
    client_phone,
    etat,
    vehicle_type,
    suggestions_destination,
    created_at,
    updated_at,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN '✅ Active'
        ELSE '❌ Expirée'
    END as status
FROM sessions 
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. Vérifier si il y a des sessions multiples actives (possible conflit)
SELECT 
    COUNT(*) as sessions_actives,
    COUNT(CASE WHEN etat = 'choix_destination_multiple' THEN 1 END) as sessions_choix_multiple,
    COUNT(CASE WHEN etat = 'position_recue' THEN 1 END) as sessions_position_recue
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND expires_at > NOW();

-- 3. Examiner le contenu des suggestions_destination (doit contenir liste numérotée)
SELECT 
    id,
    etat,
    suggestions_destination,
    LENGTH(suggestions_destination) as longueur_suggestions,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND suggestions_destination IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 4. Vérifier s'il y a eu une session sauvée récemment avec état 'choix_destination_multiple'
SELECT 
    id,
    etat,
    vehicle_type,
    destination_nom,
    suggestions_destination IS NOT NULL as a_suggestions,
    updated_at,
    expires_at
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC;

-- 5. Diagnostic: Y a-t-il une session qui devrait être 'choix_destination_multiple' mais ne l'est pas ?
SELECT 
    'DIAGNOSTIC' as type,
    etat,
    CASE 
        WHEN suggestions_destination IS NOT NULL AND etat != 'choix_destination_multiple' 
        THEN '🚨 PROBLÈME: A des suggestions mais pas le bon état'
        WHEN suggestions_destination IS NULL AND etat = 'choix_destination_multiple'
        THEN '🚨 PROBLÈME: État choix_multiple mais pas de suggestions'
        ELSE '✅ OK'
    END as diagnostic,
    updated_at
FROM sessions 
WHERE client_phone = '+33620951645' 
  AND expires_at > NOW()
ORDER BY updated_at DESC
LIMIT 3;