-- Ajout colonne note_moyenne manquante
ALTER TABLE public.adresses 
ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(2,1) 
CHECK (note_moyenne >= 0 AND note_moyenne <= 5);

-- Ajout colonne source_donnees si manquante  
ALTER TABLE public.adresses 
ADD COLUMN IF NOT EXISTS source_donnees VARCHAR(50) DEFAULT 'manuel';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_adresses_note_moyenne 
ON public.adresses (note_moyenne) WHERE note_moyenne IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_adresses_source_donnees 
ON public.adresses (source_donnees);

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
  AND column_name IN ('note_moyenne', 'source_donnees', 'telephone', 'metadata')
ORDER BY column_name;