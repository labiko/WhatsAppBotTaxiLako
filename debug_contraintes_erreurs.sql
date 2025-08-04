-- ================================================
-- 🔍 DIAGNOSTIC CONTRAINTES ET ERREURS POTENTIELLES
-- ================================================

-- 1. Vérifier les valeurs enum autorisées
SELECT 
    t.typname,
    e.enumlabel as valeur_autorisee
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname IN ('vehicle_type_enum', 'statut_enum', 'reservation_status')
ORDER BY t.typname, e.enumsortorder;

-- 2. Vérifier les contraintes CHECK
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'reservations'::regclass
  AND contype = 'c';  -- CHECK constraints

-- 3. Vérifier les triggers sur la table reservations
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'reservations';

-- 4. Tester les formats de données problématiques
SELECT 
    'Test vehicle_type' as test_name,
    CASE 
        WHEN 'moto' IN ('moto', 'voiture') THEN 'OK'
        ELSE 'ERREUR: valeur non autorisée'
    END as resultat
UNION ALL
SELECT 
    'Test statut',
    CASE 
        WHEN 'pending' IN ('pending', 'accepted', 'completed', 'canceled') THEN 'OK'
        ELSE 'ERREUR: statut non autorisé'
    END
UNION ALL
SELECT 
    'Test prix_total',
    CASE 
        WHEN 13911000::bigint > 0 THEN 'OK'
        ELSE 'ERREUR: prix négatif'
    END
UNION ALL
SELECT 
    'Test distance_km',
    CASE 
        WHEN 4636.9::numeric > 0 THEN 'OK'
        ELSE 'ERREUR: distance négative'
    END;

-- 5. Vérifier les permissions sur la table reservations
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'reservations'
  AND grantee IN ('postgres', 'anon', 'authenticated', 'service_role');

-- 6. Vérifier l'espace disque et limites
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename = 'reservations'
LIMIT 10;