-- Ajout colonne suggestions_destination à la table sessions
-- Pour gérer les choix multiples de destination

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS suggestions_destination TEXT;

-- Créer un index pour performance si nécessaire
CREATE INDEX IF NOT EXISTS idx_sessions_suggestions 
ON sessions (suggestions_destination) 
WHERE suggestions_destination IS NOT NULL;

-- Vérification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name = 'suggestions_destination';