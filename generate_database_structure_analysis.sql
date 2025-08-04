-- ========================================
-- GÉNÉRATION STRUCTURE BASE DE DONNÉES LOKOTAXI - ANALYSE COMPLÈTE
-- ========================================
-- Description: Script d'analyse pour générer la structure SQL complète existante
-- Version: v2.0 - Analyse sans modification
-- Date: 2025-07-31
-- Usage: Exécuter pour analyser la structure actuelle et générer le SQL
-- IMPORTANT: CE SCRIPT N'EFFECTUE AUCUNE MODIFICATION - ANALYSE SEULEMENT
-- ========================================

SELECT '🔍 DÉBUT ANALYSE STRUCTURE BASE DE DONNÉES LOKOTAXI' as status,
       'Script d''analyse - Aucune modification apportée' as description;

-- ========================================
-- 📋 ANALYSE 1: TABLES EXISTANTES
-- ========================================

SELECT '📋 TABLES EXISTANTES DANS LA BASE' as section;

SELECT 
    'TABLE: ' || tablename as table_info,
    'SCHEMA: ' || schemaname as schema_info,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille_table
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 🏗️ ANALYSE 2: STRUCTURE DÉTAILLÉE DE CHAQUE TABLE
-- ========================================

-- Générer CREATE TABLE pour chaque table existante
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    constraint_record RECORD;
    create_sql TEXT;
BEGIN
    RAISE NOTICE '🏗️ GÉNÉRATION STRUCTURE SQL POUR TOUTES LES TABLES';
    
    -- Parcourir toutes les tables
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        create_sql := 'CREATE TABLE IF NOT EXISTS ' || table_record.tablename || ' (';
        
        RAISE NOTICE '';
        RAISE NOTICE '-- ========================================';
        RAISE NOTICE '-- TABLE: %', upper(table_record.tablename);
        RAISE NOTICE '-- ========================================';
        RAISE NOTICE '';
        
        -- Ajouter les colonnes
        FOR column_record IN
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns 
            WHERE table_name = table_record.tablename 
              AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            create_sql := create_sql || E'\n    ' || column_record.column_name || ' ';
            
            -- Type de données
            CASE column_record.data_type
                WHEN 'character varying' THEN
                    create_sql := create_sql || 'VARCHAR(' || column_record.character_maximum_length || ')';
                WHEN 'character' THEN
                    create_sql := create_sql || 'CHAR(' || column_record.character_maximum_length || ')';
                WHEN 'text' THEN
                    create_sql := create_sql || 'TEXT';
                WHEN 'integer' THEN
                    create_sql := create_sql || 'INTEGER';
                WHEN 'bigint' THEN
                    create_sql := create_sql || 'BIGINT';
                WHEN 'smallint' THEN
                    create_sql := create_sql || 'SMALLINT';
                WHEN 'numeric' THEN
                    IF column_record.numeric_precision IS NOT NULL THEN
                        create_sql := create_sql || 'DECIMAL(' || column_record.numeric_precision || ',' || COALESCE(column_record.numeric_scale, 0) || ')';
                    ELSE
                        create_sql := create_sql || 'DECIMAL';
                    END IF;
                WHEN 'double precision' THEN
                    create_sql := create_sql || 'DOUBLE PRECISION';
                WHEN 'real' THEN
                    create_sql := create_sql || 'REAL';
                WHEN 'boolean' THEN
                    create_sql := create_sql || 'BOOLEAN';
                WHEN 'timestamp without time zone' THEN
                    create_sql := create_sql || 'TIMESTAMP';
                WHEN 'timestamp with time zone' THEN
                    create_sql := create_sql || 'TIMESTAMPTZ';
                WHEN 'date' THEN
                    create_sql := create_sql || 'DATE';
                WHEN 'time without time zone' THEN
                    create_sql := create_sql || 'TIME';
                WHEN 'uuid' THEN
                    create_sql := create_sql || 'UUID';
                WHEN 'jsonb' THEN
                    create_sql := create_sql || 'JSONB';
                WHEN 'json' THEN
                    create_sql := create_sql || 'JSON';
                WHEN 'geography' THEN
                    create_sql := create_sql || 'GEOGRAPHY(POINT, 4326)';
                WHEN 'geometry' THEN
                    create_sql := create_sql || 'GEOMETRY';
                WHEN 'ARRAY' THEN
                    create_sql := create_sql || 'TEXT[]';
                WHEN 'inet' THEN
                    create_sql := create_sql || 'INET';
                ELSE
                    create_sql := create_sql || column_record.data_type;
            END CASE;
            
            -- NOT NULL
            IF column_record.is_nullable = 'NO' THEN
                create_sql := create_sql || ' NOT NULL';
            END IF;
            
            -- DEFAULT
            IF column_record.column_default IS NOT NULL THEN
                create_sql := create_sql || ' DEFAULT ' || column_record.column_default;
            END IF;
            
            create_sql := create_sql || ',';
        END LOOP;
        
        -- Supprimer la dernière virgule
        create_sql := rtrim(create_sql, ',');
        create_sql := create_sql || E'\n);';
        
        RAISE NOTICE '%', create_sql;
        
    END LOOP;
END $$;

-- ========================================
-- 🔗 ANALYSE 3: CONTRAINTES ET CLÉS ÉTRANGÈRES
-- ========================================

SELECT '🔗 CONTRAINTES ET CLÉS ÉTRANGÈRES' as section;

SELECT
    'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || ' ' ||
    CASE tc.constraint_type
        WHEN 'PRIMARY KEY' THEN 'PRIMARY KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ')'
        WHEN 'FOREIGN KEY' THEN 'FOREIGN KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ') REFERENCES ' || ccu.table_name || '(' || string_agg(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) || ')'
        WHEN 'UNIQUE' THEN 'UNIQUE (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ')'
        WHEN 'CHECK' THEN 'CHECK ' || cc.check_clause
    END || ';' as constraint_sql
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type, ccu.table_name, cc.check_clause
ORDER BY tc.table_name, tc.constraint_type;

-- ========================================
-- 📇 ANALYSE 4: INDEX EXISTANTS
-- ========================================

SELECT '📇 INDEX EXISTANTS' as section;

SELECT 
    'CREATE INDEX IF NOT EXISTS ' || indexname || ' ON ' || tablename || ' ' || 
    REPLACE(REPLACE(indexdef, 'CREATE INDEX ' || indexname || ' ON ' || schemaname || '.' || tablename || ' ', ''), 'CREATE UNIQUE INDEX ' || indexname || ' ON ' || schemaname || '.' || tablename || ' ', 'UNIQUE ') || ';' as index_sql
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'  -- Exclure les index de clé primaire
ORDER BY tablename, indexname;

-- ========================================
-- ⚙️ ANALYSE 5: FONCTIONS PERSONNALISÉES
-- ========================================

SELECT '⚙️ FONCTIONS PERSONNALISÉES' as section;

SELECT 
    'CREATE OR REPLACE FUNCTION ' || p.proname || '(' ||
    COALESCE(pg_get_function_arguments(p.oid), '') || ') RETURNS ' ||
    pg_get_function_result(p.oid) || ' AS $$' || E'\n' ||
    'BEGIN' || E'\n' ||
    '    -- Code fonction à récupérer depuis pg_proc' || E'\n' ||
    'END;' || E'\n' ||
    '$$ LANGUAGE plpgsql;' as function_sql
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'st_%'
ORDER BY p.proname;

-- ========================================
-- 🔄 ANALYSE 6: TRIGGERS
-- ========================================

SELECT '🔄 TRIGGERS EXISTANTS' as section;

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
    END || ' ON ' || c.relname || ' FOR EACH ROW EXECUTE FUNCTION ' || p.proname || '();' as trigger_sql
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ========================================
-- 📊 ANALYSE 7: VUES EXISTANTES
-- ========================================

SELECT '📊 VUES EXISTANTES' as section;

SELECT 
    'CREATE OR REPLACE VIEW ' || viewname || ' AS' || E'\n' ||
    definition as view_sql
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ========================================
-- 🧩 ANALYSE 8: EXTENSIONS INSTALLÉES
-- ========================================

SELECT '🧩 EXTENSIONS INSTALLÉES' as section;

SELECT 
    'CREATE EXTENSION IF NOT EXISTS "' || extname || '";  -- Version ' || extversion as extension_sql
FROM pg_extension 
WHERE extname NOT IN ('plpgsql')  -- Exclure les extensions par défaut
ORDER BY extname;

-- ========================================
-- 📈 ANALYSE 9: STATISTIQUES DONNÉES
-- ========================================

SELECT '📈 STATISTIQUES DONNÉES ACTUELLES' as section;

SELECT 
    tablename,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        table_name as tablename,
        query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
) t
ORDER BY tablename;

-- ========================================
-- 📋 ANALYSE 10: COLONNES SPÉCIALES DÉTECTÉES
-- ========================================

SELECT '📋 COLONNES SPÉCIALES DÉTECTÉES' as section;

-- Colonnes de géolocalisation
SELECT 
    'GÉOLOCALISATION: ' || table_name || '.' || column_name || ' (' || data_type || ')' as special_column
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type IN ('geography', 'geometry') OR column_name LIKE '%position%' OR column_name LIKE '%location%')
ORDER BY table_name, column_name;

-- Colonnes de timestamps
SELECT 
    'TIMESTAMP: ' || table_name || '.' || column_name || ' (' || data_type || ')' as special_column
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name LIKE '%_at' OR column_name LIKE '%date%' OR column_name LIKE '%time%')
ORDER BY table_name, column_name;

-- Colonnes JSON
SELECT 
    'JSON: ' || table_name || '.' || column_name || ' (' || data_type || ')' as special_column
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type IN ('json', 'jsonb')
ORDER BY table_name, column_name;

-- ========================================
-- ✅ RAPPORT FINAL D'ANALYSE
-- ========================================

SELECT '✅ ANALYSE STRUCTURE COMPLÈTE TERMINÉE' as status,
       CURRENT_TIMESTAMP as end_time;

SELECT 
    '📊 RÉSUMÉ STRUCTURE ANALYSÉE' as summary,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname NOT LIKE 'pg_%' AND p.proname NOT LIKE 'st_%') as total_functions,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM pg_extension WHERE extname NOT IN ('plpgsql')) as total_extensions;

-- ========================================
-- 📝 NOTES IMPORTANTES
-- ========================================

/*
📝 UTILISATION DE CE SCRIPT D'ANALYSE:

1. 🔍 OBJECTIF:
   - Analyser la structure existante de la base de données
   - Générer le SQL équivalent pour recréer la structure
   - Identifier les colonnes et fonctionnalités spéciales
   - AUCUNE MODIFICATION N'EST APPORTÉE À LA BASE

2. 📋 INFORMATIONS GÉNÉRÉES:
   - Structure complète de toutes les tables (CREATE TABLE)
   - Contraintes et clés étrangères (ALTER TABLE)
   - Index existants (CREATE INDEX)
   - Fonctions personnalisées (CREATE FUNCTION)
   - Triggers (CREATE TRIGGER)
   - Vues (CREATE VIEW)
   - Extensions installées (CREATE EXTENSION)

3. 🎯 USAGE RECOMMANDÉ:
   - Exécuter ce script pour comprendre la structure actuelle
   - Utiliser la sortie pour documenter la base de données
   - Créer un script de recréation basé sur l'analyse
   - Identifier les éléments manquants pour le système commission

4. ⚠️ LIMITATIONS:
   - Le code des fonctions n'est pas entièrement extrait
   - Les données ne sont pas sauvegardées (structure seulement)
   - Certaines contraintes complexes peuvent nécessiter un ajustement manuel

5. 🔄 PROCHAINES ÉTAPES:
   - Utiliser l'analyse pour mettre à jour create_table_entreprises_v2
   - Adapter le script aux tables réellement existantes
   - Tester sur un environnement de développement d'abord
*/