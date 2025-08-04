-- ========================================
-- GÉNÉRATION DUMP STRUCTURE BASE DE DONNÉES LOKOTAXI
-- ========================================
-- Description: Génère un dump complet de la structure (équivalent pg_dump --schema-only)
-- Version: v1.0
-- Date: 2025-07-31
-- Usage: Exécuter pour obtenir le SQL complet de recréation de la base
-- ========================================

-- 📋 DUMP COMPLET STRUCTURE - TABLES
-- ========================================

SELECT '-- ========================================' as sql_output
UNION ALL SELECT '-- DUMP STRUCTURE COMPLÈTE BASE LOKOTAXI'
UNION ALL SELECT '-- Généré automatiquement le ' || CURRENT_TIMESTAMP::TEXT
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Extensions
SELECT '-- Extensions requises'
UNION ALL
SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '"; -- Version ' || extversion
FROM pg_extension 
WHERE extname NOT IN ('plpgsql')
ORDER BY extname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- TABLES'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Structure complète des tables
SELECT 
    CASE 
        WHEN ordinal_position = 1 THEN 
            '-- Table: ' || table_name || E'\n' ||
            'CREATE TABLE IF NOT EXISTS ' || table_name || ' ('
        ELSE ''
    END ||
    
    CASE WHEN ordinal_position > 1 THEN ',' ELSE '' END ||
    E'\n    ' || column_name || ' ' ||
    
    -- Type de données complet
    CASE 
        WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
        WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
        WHEN data_type = 'numeric' THEN 
            CASE 
                WHEN numeric_precision IS NOT NULL THEN 'DECIMAL(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                ELSE 'DECIMAL'
            END
        WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
        WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
        WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
        WHEN data_type = 'USER-DEFINED' AND udt_name = 'geography' THEN 'GEOGRAPHY(POINT, 4326)'
        WHEN data_type = 'USER-DEFINED' AND udt_name = 'geometry' THEN 'GEOMETRY'
        WHEN data_type = 'ARRAY' THEN 'TEXT[]'
        ELSE UPPER(data_type)
    END ||
    
    -- NOT NULL
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    
    -- DEFAULT
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END ||
    
    -- Fermeture de table pour la dernière colonne
    CASE 
        WHEN ordinal_position = (
            SELECT MAX(ordinal_position) 
            FROM information_schema.columns c2 
            WHERE c2.table_name = c1.table_name AND c2.table_schema = 'public'
        ) THEN E'\n);' || E'\n'
        ELSE ''
    END as sql_output

FROM information_schema.columns c1
WHERE table_schema = 'public'
  AND table_name IN (
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
  )
ORDER BY table_name, ordinal_position

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- CONTRAINTES PRIMARY KEY'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Primary Keys
SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- CONTRAINTES FOREIGN KEY'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Foreign Keys
SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ') ' ||
    'REFERENCES ' || ccu.table_name || '(' || string_agg(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.table_name, tc.constraint_name, ccu.table_name
ORDER BY tc.table_name

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- CONTRAINTES UNIQUE'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Unique constraints
SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' UNIQUE (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- CONTRAINTES CHECK'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Check constraints
SELECT 
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' CHECK ' || cc.check_clause || ';'
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- INDEX'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Index (en excluant les primary keys)
SELECT indexdef || ';'
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- VUES'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Vues
SELECT 
    '-- Vue: ' || viewname || E'\n' ||
    'CREATE OR REPLACE VIEW ' || viewname || ' AS' || E'\n' ||
    definition || E'\n'
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- FONCTIONS (Structure seulement)'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Fonctions (structure de base)
SELECT 
    '-- Fonction: ' || p.proname || E'\n' ||
    'CREATE OR REPLACE FUNCTION ' || p.proname || '(' ||
    COALESCE(pg_get_function_arguments(p.oid), '') || ')' || E'\n' ||
    'RETURNS ' || pg_get_function_result(p.oid) || ' AS $$' || E'\n' ||
    '-- Code de la fonction (à extraire manuellement)' || E'\n' ||
    '$$ LANGUAGE plpgsql;' || E'\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'st_%'
  AND p.proname NOT LIKE '_st_%'
ORDER BY p.proname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- TRIGGERS'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Triggers
SELECT 
    '-- Trigger: ' || tgname || ' sur table ' || c.relname || E'\n' ||
    'CREATE TRIGGER ' || tgname || E'\n' ||
    '    ' || CASE 
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
    END || ' ON ' || c.relname || E'\n' ||
    '    FOR EACH ROW EXECUTE FUNCTION ' || p.proname || '();' || E'\n'
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- COMMENTAIRES'
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT ''

UNION ALL

-- Commentaires sur les tables
SELECT 
    'COMMENT ON TABLE ' || c.relname || ' IS ' || quote_literal(d.description) || ';'
FROM pg_class c
JOIN pg_description d ON c.oid = d.objoid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND d.objsubid = 0
  AND c.relkind = 'r'
ORDER BY c.relname

UNION ALL SELECT ''
UNION ALL SELECT '-- ========================================'
UNION ALL SELECT '-- FIN DU DUMP STRUCTURE'
UNION ALL SELECT '-- ========================================'

ORDER BY sql_output;