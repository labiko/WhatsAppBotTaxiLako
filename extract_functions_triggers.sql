-- ========================================
-- EXTRACTION COMPLÈTE FONCTIONS + TRIGGERS DE LA BASE
-- ========================================
-- Description: Script pour extraire tout le code des fonctions et triggers existants
-- Date: 2025-07-31
-- Usage: Exécuter dans Supabase SQL Editor pour obtenir le DDL complet
-- ========================================

-- ========================================
-- 📋 EXTRACTION DES FONCTIONS
-- ========================================

SELECT '-- ========================================' || E'\n' ||
       '-- FONCTIONS EXTRAITES DE LA BASE' || E'\n' ||
       '-- ========================================' || E'\n';

-- Requête pour extraire toutes les fonctions (format CREATE OR REPLACE)
WITH function_list AS (
    SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'  -- Seulement schema public
      AND p.prokind = 'f'       -- Seulement fonctions (pas procédures)
      AND p.proname NOT LIKE 'pg_%'  -- Exclure fonctions système PostgreSQL
      AND p.proname NOT LIKE 'pgis_%' -- Exclure fonctions PostGIS internes
    ORDER BY p.proname
)
SELECT 
    E'\n-- Fonction: ' || function_name || '(' || arguments || ')' || E'\n' ||
    definition || E'\n'
FROM function_list;

-- ========================================
-- 📋 EXTRACTION DES TRIGGERS
-- ========================================

SELECT E'\n\n' || '-- ========================================' || E'\n' ||
       '-- TRIGGERS EXTRAITS DE LA BASE' || E'\n' ||
       '-- ========================================' || E'\n';

-- Requête pour extraire tous les triggers avec leur définition complète
WITH trigger_list AS (
    SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        pg_get_triggerdef(t.oid, true) as definition
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'  -- Seulement schema public
      AND NOT t.tgisinternal    -- Exclure triggers internes
    ORDER BY c.relname, t.tgname
)
SELECT 
    E'\n-- Trigger sur table: ' || table_name || E'\n' ||
    definition || ';' || E'\n'
FROM trigger_list;

-- ========================================
-- 📋 INFORMATIONS SUPPLÉMENTAIRES
-- ========================================

SELECT E'\n\n' || '-- ========================================' || E'\n' ||
       '-- STATISTIQUES' || E'\n' ||
       '-- ========================================' || E'\n';

-- Compter les objets
SELECT 
    '-- Nombre total de fonctions: ' || COUNT(DISTINCT p.proname)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'pgis_%';

SELECT 
    '-- Nombre total de triggers: ' || COUNT(*)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal;

-- ========================================
-- 📋 LISTE DES FONCTIONS PAR CATÉGORIE
-- ========================================

SELECT E'\n' || '-- ========================================' || E'\n' ||
       '-- LISTE DES FONCTIONS PAR TYPE' || E'\n' ||
       '-- ========================================' || E'\n';

-- Grouper les fonctions par préfixe/type
WITH function_categories AS (
    SELECT 
        CASE 
            WHEN proname LIKE 'get_%' THEN 'Fonctions GET (lecture)'
            WHEN proname LIKE 'set_%' THEN 'Fonctions SET (écriture)'
            WHEN proname LIKE 'calculate_%' THEN 'Fonctions CALCULATE (calcul)'
            WHEN proname LIKE 'update_%' THEN 'Fonctions UPDATE (mise à jour)'
            WHEN proname LIKE 'authenticate_%' THEN 'Fonctions AUTHENTICATE (auth)'
            WHEN proname LIKE 'st_%' THEN 'Fonctions SPATIALES (PostGIS)'
            ELSE 'Autres fonctions'
        END as category,
        proname as function_name,
        pg_get_function_identity_arguments(oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname NOT LIKE 'pg_%'
      AND p.proname NOT LIKE 'pgis_%'
)
SELECT 
    '-- ' || category || ': ' || string_agg(function_name || '(' || arguments || ')', ', ')
FROM function_categories
GROUP BY category
ORDER BY category;

-- ========================================
-- 📋 EXPORT ALTERNATIF SIMPLIFIÉ
-- ========================================

SELECT E'\n\n' || '-- ========================================' || E'\n' ||
       '-- EXPORT SIMPLIFIÉ (NOMS SEULEMENT)' || E'\n' ||
       '-- ========================================' || E'\n';

-- Liste simple des fonctions
SELECT '-- Fonctions: ' || string_agg(proname, ', ' ORDER BY proname)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'pgis_%';

-- Liste simple des triggers
SELECT '-- Triggers: ' || string_agg(DISTINCT tgname, ', ' ORDER BY tgname)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal;