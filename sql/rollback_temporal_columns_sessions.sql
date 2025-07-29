-- ROLLBACK pour add_temporal_columns_sessions - 2025-07-29
-- Script pour supprimer les colonnes temporelles et de choix multiples ajoutées à la table sessions
-- À utiliser UNIQUEMENT en cas de problème majeur

-- 1. Supprimer les index créés
DROP INDEX IF EXISTS public.idx_sessions_temporal;
DROP INDEX IF EXISTS public.idx_sessions_depart;

-- 2. Supprimer les colonnes temporelles
ALTER TABLE public.sessions 
DROP COLUMN IF EXISTS planned_date,
DROP COLUMN IF EXISTS planned_hour,
DROP COLUMN IF EXISTS planned_minute,
DROP COLUMN IF EXISTS temporal_planning;

-- 3. Supprimer les colonnes de sélection du départ
ALTER TABLE public.sessions 
DROP COLUMN IF EXISTS depart_nom,
DROP COLUMN IF EXISTS depart_id,
DROP COLUMN IF EXISTS depart_position;

-- 4. Supprimer les colonnes d'état du workflow temporel
ALTER TABLE public.sessions 
DROP COLUMN IF EXISTS choix_depart_multiple,
DROP COLUMN IF EXISTS choix_destination_multiple;

-- Message de rollback
SELECT 'Rollback des colonnes temporelles effectué - système restauré à l''état précédent' AS message;

-- ATTENTION: Ce rollback supprimera toutes les données temporelles existantes
-- Vérifier qu'aucune réservation temporelle n'est en cours avant d'exécuter