-- 🔍 SCRIPT DE DIAGNOSTIC COMPLET - STRUCTURE BASE DE DONNÉES
-- Analyser la table sessions et tous ses composants
-- À exécuter dans l'éditeur SQL Supabase

-- ================================================================
-- 1. STRUCTURE DE LA TABLE SESSIONS
-- ================================================================

SELECT 
    'TABLE_STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'sessions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================
-- 2. CONTRAINTES SUR LA TABLE SESSIONS
-- ================================================================

SELECT 
    'CONSTRAINTS' as section,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass;

-- ================================================================
-- 3. INDEX SUR LA TABLE SESSIONS
-- ================================================================

SELECT 
    'INDEXES' as section,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'sessions' 
    AND schemaname = 'public';

-- ================================================================
-- 4. TRIGGERS SUR LA TABLE SESSIONS
-- ================================================================

SELECT 
    'TRIGGERS' as section,
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers 
WHERE event_object_table = 'sessions' 
    AND event_object_schema = 'public';

-- ================================================================
-- 5. POLICIES RLS (ROW LEVEL SECURITY) SUR SESSIONS
-- ================================================================

SELECT 
    'RLS_POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sessions' 
    AND schemaname = 'public';

-- ================================================================
-- 6. VUES UTILISANT LA TABLE SESSIONS
-- ================================================================

SELECT 
    'VIEWS_USING_SESSIONS' as section,
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE view_definition ILIKE '%sessions%' 
    AND table_schema = 'public';

-- ================================================================
-- 7. FONCTIONS/PROCÉDURES UTILISANT SESSIONS
-- ================================================================

SELECT 
    'FUNCTIONS_USING_SESSIONS' as section,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%sessions%' 
    AND routine_schema = 'public'
    AND routine_type IN ('FUNCTION', 'PROCEDURE');

-- ================================================================
-- 8. PERMISSIONS SUR LA TABLE SESSIONS
-- ================================================================

SELECT 
    'TABLE_PERMISSIONS' as section,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'sessions' 
    AND table_schema = 'public';

-- ================================================================
-- 9. ÉTAT ACTUEL RLS (ROW LEVEL SECURITY)
-- ================================================================

SELECT 
    'RLS_STATUS' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'sessions' 
    AND schemaname = 'public';

-- ================================================================
-- 10. DONNÉES RÉELLES DANS SESSIONS (TOUTES, MÊME EXPIRÉES)
-- ================================================================

SELECT 
    'CURRENT_SESSIONS_DATA' as section,
    client_phone,
    vehicle_type,
    etat,
    created_at,
    updated_at,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'ACTIVE' 
        ELSE 'EXPIRED' 
    END as status,
    EXTRACT(EPOCH FROM (expires_at - created_at))/60 as ttl_minutes
FROM sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- ================================================================
-- 11. STATISTIQUES SUR LES SESSIONS
-- ================================================================

SELECT 
    'SESSION_STATISTICS' as section,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_sessions,
    MIN(created_at) as oldest_session,
    MAX(created_at) as newest_session,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))/60) as avg_ttl_minutes
FROM sessions;

-- ================================================================
-- 12. VÉRIFICATION DES CLÉS ÉTRANGÈRES
-- ================================================================

SELECT 
    'FOREIGN_KEYS' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'sessions'
    AND tc.table_schema = 'public';

-- ================================================================
-- 13. TEST D'INSERTION MANUELLE (DIAGNOSTIC)
-- ================================================================

-- Test si on peut insérer une session manuellement
-- ATTENTION: Ne pas exécuter ce bloc automatiquement, 
-- décommentez seulement pour tester l'insertion

/*
INSERT INTO sessions (
    client_phone, 
    vehicle_type, 
    etat, 
    created_at, 
    updated_at, 
    expires_at
) VALUES (
    '+33620951645', 
    'moto', 
    'test_manual', 
    NOW(), 
    NOW(), 
    NOW() + INTERVAL '15 minutes'
) RETURNING 'MANUAL_INSERT_TEST' as section, id, client_phone, created_at;
*/

-- ================================================================
-- FIN DU SCRIPT DE DIAGNOSTIC
-- ================================================================