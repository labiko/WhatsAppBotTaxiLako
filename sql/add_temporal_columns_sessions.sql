-- Script pour ajouter les colonnes temporelles et de choix multiples à la table sessions
-- Pour supporter les données temporelles des réservations planifiées et la sélection des départs

-- 1. Ajouter les colonnes temporelles
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS planned_date DATE NULL,
ADD COLUMN IF NOT EXISTS planned_hour INTEGER NULL CHECK (planned_hour >= 0 AND planned_hour <= 23),
ADD COLUMN IF NOT EXISTS planned_minute INTEGER NULL CHECK (planned_minute >= 0 AND planned_minute <= 59),
ADD COLUMN IF NOT EXISTS temporal_planning BOOLEAN DEFAULT FALSE;

-- 2. Ajouter les colonnes pour la sélection du départ
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS depart_nom TEXT NULL,
ADD COLUMN IF NOT EXISTS depart_id UUID NULL,
ADD COLUMN IF NOT EXISTS depart_position geography(Point, 4326) NULL;

-- 3. Ajouter les colonnes pour l'état du workflow temporel
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS choix_depart_multiple BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS choix_destination_multiple BOOLEAN DEFAULT FALSE;

-- 4. Ajouter des commentaires pour documentation
COMMENT ON COLUMN public.sessions.planned_date IS 'Date de la réservation planifiée (YYYY-MM-DD)';
COMMENT ON COLUMN public.sessions.planned_hour IS 'Heure de la réservation planifiée (0-23)';
COMMENT ON COLUMN public.sessions.planned_minute IS 'Minute de la réservation planifiée (0-59)';
COMMENT ON COLUMN public.sessions.temporal_planning IS 'True si c''est une réservation future planifiée';
COMMENT ON COLUMN public.sessions.depart_nom IS 'Nom du lieu de départ sélectionné';
COMMENT ON COLUMN public.sessions.depart_id IS 'ID du lieu de départ dans la table adresses';
COMMENT ON COLUMN public.sessions.depart_position IS 'Position GPS du lieu de départ (format PostGIS)';
COMMENT ON COLUMN public.sessions.choix_depart_multiple IS 'Indique si on est en mode choix multiple pour le départ';
COMMENT ON COLUMN public.sessions.choix_destination_multiple IS 'Indique si on est en mode choix multiple pour la destination';

-- 5. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_temporal 
ON public.sessions(client_phone, temporal_planning, planned_date) 
WHERE temporal_planning = true;

CREATE INDEX IF NOT EXISTS idx_sessions_depart 
ON public.sessions(client_phone, depart_id) 
WHERE depart_id IS NOT NULL;

-- 6. Test de vérification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
    AND column_name IN ('planned_date', 'planned_hour', 'planned_minute', 'temporal_planning', 
                        'depart_nom', 'depart_id', 'depart_position', 
                        'choix_depart_multiple', 'choix_destination_multiple')
ORDER BY ordinal_position;

-- Message de succès
SELECT 'Colonnes temporelles et de choix multiples ajoutées avec succès à la table sessions' AS message;