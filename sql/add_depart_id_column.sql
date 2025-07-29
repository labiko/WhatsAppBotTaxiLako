-- Ajouter colonne depart_id à la table sessions
-- Pour stocker l'ID du lieu de départ et permettre une récupération exacte des coordonnées

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS depart_id UUID NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN public.sessions.depart_id IS 'ID de l''adresse de départ depuis la table adresses';

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_depart_id ON public.sessions(depart_id);