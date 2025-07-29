-- Ajouter seulement le champ suggestions_depart (même logique que suggestions_destination)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS suggestions_depart TEXT NULL;