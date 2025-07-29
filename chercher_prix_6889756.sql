-- Script pour chercher la valeur 6,889,756.117 dans toute la base de données
-- Exécuter dans Supabase SQL Editor

-- 1. Chercher dans toutes les colonnes numériques de toutes les tables
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    format_type(atttypid, atttypmod) as data_type
FROM pg_attribute 
JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND pg_attribute.attnum > 0
  AND NOT pg_attribute.attisdropped
  AND format_type(atttypid, atttypmod) IN ('numeric', 'integer', 'bigint', 'real', 'double precision', 'money')
ORDER BY tablename, attname;

-- 2. Chercher spécifiquement la valeur ~6889756 dans les tables principales
-- Table reservations
SELECT 'reservations' as table_name, id, client_phone, prix_total, distance_km, created_at
FROM reservations 
WHERE prix_total::numeric BETWEEN 6889000 AND 6890000
   OR distance_km::numeric BETWEEN 6889000 AND 6890000;

-- Table sessions (si elle existe)
SELECT 'sessions' as table_name, client_phone, prix_estime, distance_km, created_at
FROM sessions 
WHERE prix_estime::numeric BETWEEN 6889000 AND 6890000
   OR distance_km::numeric BETWEEN 6889000 AND 6890000;

-- 3. Chercher dans les logs ou tables d'audit (si elles existent)
-- Vérifier si il y a des tables de logs
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%log%' OR tablename LIKE '%audit%' OR tablename LIKE '%history%');

-- 4. Chercher dans les colonnes texte au cas où ce serait stocké comme string
SELECT 'reservations_text_search' as search_type, id, client_phone, created_at
FROM reservations 
WHERE (destination_nom::text LIKE '%6889%' 
    OR statut::text LIKE '%6889%'
    OR client_phone::text LIKE '%6889%');

-- 5. Calculer selon différentes formules pour voir d'où vient 6,889,756.117
SELECT 
    'calcul_formules' as type,
    distance_km,
    prix_total,
    -- Différentes formules possibles
    (distance_km * 4000) as formule_4000_par_km,
    (distance_km * 1500) as formule_1500_par_km,
    (distance_km * 2000) as formule_2000_par_km,
    -- Formules avec base
    (5000 + distance_km * 1500) as bot_principal_moto,
    (8000 + distance_km * 2000) as bot_principal_voiture,
    -- Si distance était différente
    (4589.8 * 1500) as si_distance_4589_tarif_1500,
    (4589.8 * 4000) as si_distance_4589_tarif_4000,
    -- Calcul inverse pour trouver le tarif
    (prix_total / distance_km) as tarif_reel_par_km
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;

-- 6. Vérifier toutes les tables pour des colonnes contenant "prix"
DO $$
DECLARE
    r RECORD;
    sql_query TEXT;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, attname
        FROM pg_attribute 
        JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE pg_namespace.nspname = 'public'
          AND pg_attribute.attnum > 0
          AND NOT pg_attribute.attisdropped
          AND (attname LIKE '%prix%' OR attname LIKE '%price%' OR attname LIKE '%cost%')
    LOOP
        sql_query := format('SELECT ''%s.%s'' as table_column, %I, created_at FROM %I.%I WHERE %I::numeric BETWEEN 6889000 AND 6890000 LIMIT 5',
                           r.tablename, r.attname, r.attname, r.schemaname, r.tablename, r.attname);
        
        BEGIN
            EXECUTE sql_query;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorer les erreurs de colonnes inexistantes
            NULL;
        END;
    END LOOP;
END $$;