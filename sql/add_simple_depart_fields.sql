-- Ajouter seulement les champs équivalents aux destinations pour les départs
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS depart_nom TEXT NULL,
ADD COLUMN IF NOT EXISTS depart_position TEXT NULL;

-- Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name LIKE '%depart%'
ORDER BY column_name;