-- Ajouter les colonnes manquantes pour la gestion des départs personnalisés
-- dans la table sessions

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS suggestions_depart TEXT NULL,
ADD COLUMN IF NOT EXISTS depart_nom TEXT NULL,
ADD COLUMN IF NOT EXISTS depart_id UUID NULL,
ADD COLUMN IF NOT EXISTS depart_position TEXT NULL, -- format PostGIS 
ADD COLUMN IF NOT EXISTS depart_latitude DECIMAL(10,8) NULL,
ADD COLUMN IF NOT EXISTS depart_longitude DECIMAL(11,8) NULL;

-- Vérifier la structure actuelle de la table
\d public.sessions;