-- ========================================
-- DUMP STRUCTURE BASE DE DONNÉES LOKOTAXI - VERSION SIMPLE
-- ========================================
-- Description: Génère la structure complète en plusieurs requêtes
-- Usage: Exécuter section par section pour obtenir le dump complet
-- ========================================

-- 📋 ÉTAPE 1: EXTENSIONS
-- ========================================
SELECT '-- EXTENSIONS INSTALLÉES' as info;

SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '"; -- Version ' || extversion as sql_extensions
FROM pg_extension 
WHERE extname NOT IN ('plpgsql')
ORDER BY extname;

-- 📋 ÉTAPE 2: STRUCTURE TABLES
-- ========================================
SELECT '-- STRUCTURE TABLES' as info;

-- Générer CREATE TABLE pour chaque table
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || t.table_name || ' (' ||
    string_agg(
        '    ' || t.column_name || ' ' ||
        CASE 
            WHEN t.data_type = 'character varying' THEN 'VARCHAR(' || t.character_maximum_length || ')'
            WHEN t.data_type = 'character' THEN 'CHAR(' || t.character_maximum_length || ')'
            WHEN t.data_type = 'numeric' THEN 
                CASE 
                    WHEN t.numeric_precision IS NOT NULL THEN 'DECIMAL(' || t.numeric_precision || ',' || COALESCE(t.numeric_scale, 0) || ')'
                    ELSE 'DECIMAL'
                END
            WHEN t.data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN t.data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN t.data_type = 'double precision' THEN 'DOUBLE PRECISION'
            WHEN t.data_type = 'USER-DEFINED' AND t.udt_name = 'geography' THEN 'GEOGRAPHY(POINT, 4326)'
            WHEN t.data_type = 'USER-DEFINED' AND t.udt_name = 'geometry' THEN 'GEOMETRY'
            WHEN t.data_type = 'ARRAY' THEN 'TEXT[]'
            ELSE UPPER(t.data_type)
        END ||
        CASE WHEN t.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN t.column_default IS NOT NULL THEN ' DEFAULT ' || t.column_default
            ELSE ''
        END, 
        ',' || chr(10) ORDER BY t.ordinal_position
    ) || 
    chr(10) || ');' as sql_tables
FROM information_schema.columns t
WHERE t.table_schema = 'public'
  AND t.table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
GROUP BY t.table_name
ORDER BY t.table_name;

-- 📋 ÉTAPE 3: PRIMARY KEYS
-- ========================================
SELECT '-- PRIMARY KEYS' as info;

SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as sql_primary_keys
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 📋 ÉTAPE 4: FOREIGN KEYS
-- ========================================
SELECT '-- FOREIGN KEYS' as info;

SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ') ' ||
    'REFERENCES ' || ccu.table_name || '(' || string_agg(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as sql_foreign_keys
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.table_name, tc.constraint_name, ccu.table_name
ORDER BY tc.table_name;

-- 📋 ÉTAPE 5: UNIQUE CONSTRAINTS
-- ========================================
SELECT '-- UNIQUE CONSTRAINTS' as info;

SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' UNIQUE (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as sql_unique_constraints
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 📋 ÉTAPE 6: CHECK CONSTRAINTS
-- ========================================
SELECT '-- CHECK CONSTRAINTS' as info;

SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' CHECK ' || cc.check_clause || ';' as sql_check_constraints
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;

-- 📋 ÉTAPE 7: INDEX
-- ========================================
SELECT '-- INDEX' as info;

SELECT indexdef || ';' as sql_indexes
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- 📋 ÉTAPE 8: VUES
-- ========================================
SELECT '-- VUES' as info;

SELECT 
    'CREATE OR REPLACE VIEW ' || viewname || ' AS ' || definition as sql_views
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- 📋 ÉTAPE 9: FONCTIONS
-- ========================================
SELECT '-- FONCTIONS PERSONNALISÉES' as info;

SELECT 
    'CREATE OR REPLACE FUNCTION ' || p.proname || '(' ||
    COALESCE(pg_get_function_arguments(p.oid), '') || ') RETURNS ' ||
    pg_get_function_result(p.oid) || ' AS $$ /* Code à extraire manuellement */ $$ LANGUAGE plpgsql;' as sql_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'st_%'
  AND p.proname NOT LIKE '_st_%'
ORDER BY p.proname;

-- 📋 ÉTAPE 10: TRIGGERS
-- ========================================
SELECT '-- TRIGGERS' as info;

SELECT 
    'CREATE TRIGGER ' || tgname || ' ' ||
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 2 = 0 THEN 'AFTER'
    END || ' ' ||
    CASE
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'  
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        WHEN tgtype & 28 = 28 THEN 'INSERT OR UPDATE OR DELETE'
        WHEN tgtype & 20 = 20 THEN 'INSERT OR UPDATE'
        WHEN tgtype & 24 = 24 THEN 'UPDATE OR DELETE'
        WHEN tgtype & 12 = 12 THEN 'INSERT OR DELETE'
    END || ' ON ' || c.relname || ' FOR EACH ROW EXECUTE FUNCTION ' || p.proname || '();' as sql_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 📋 ÉTAPE 11: COMMENTAIRES
-- ========================================
SELECT '-- COMMENTAIRES SUR TABLES' as info;

SELECT 
    'COMMENT ON TABLE ' || c.relname || ' IS ' || quote_literal(d.description) || ';' as sql_comments
FROM pg_class c
JOIN pg_description d ON c.oid = d.objoid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND d.objsubid = 0
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 📋 RÉSUMÉ FINAL
-- ========================================
SELECT 
    '-- RÉSUMÉ STRUCTURE ANALYSÉE' as summary,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname NOT LIKE 'pg_%' AND p.proname NOT LIKE 'st_%') as total_functions,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes;