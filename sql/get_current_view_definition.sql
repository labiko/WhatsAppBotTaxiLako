-- Script pour récupérer la définition actuelle de la vue adresses_with_coords
-- À exécuter dans le SQL Editor de Supabase

-- 1. Voir la définition actuelle de la vue
SELECT 'DÉFINITION ACTUELLE DE LA VUE' as info;
SELECT definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'adresses_with_coords';

-- 2. Voir les colonnes actuelles de la vue
SELECT 'COLONNES ACTUELLES DE LA VUE' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'adresses_with_coords'
ORDER BY ordinal_position;

-- 3. Test de la vue actuelle avec quelques données
SELECT 'DONNÉES EXEMPLE DE LA VUE ACTUELLE' as info;
SELECT *
FROM public.adresses_with_coords
LIMIT 3;