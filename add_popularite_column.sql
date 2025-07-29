-- Ajout colonne popularite à la table adresses
-- Pour tracker les destinations les plus recherchées/utilisées

ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS popularite INTEGER DEFAULT 0;

-- Créer un index pour performance sur les recherches triées par popularité
CREATE INDEX IF NOT EXISTS idx_adresses_popularite 
ON adresses (popularite DESC);

-- Vérification
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
AND column_name = 'popularite';

-- Initialiser quelques adresses populaires de Conakry
UPDATE adresses SET popularite = 100 WHERE nom ILIKE '%aeroport%' OR nom ILIKE '%aéroport%';
UPDATE adresses SET popularite = 80 WHERE nom ILIKE '%hopital%' OR nom ILIKE '%hôpital%';
UPDATE adresses SET popularite = 70 WHERE nom ILIKE '%marche%' OR nom ILIKE '%marché%';
UPDATE adresses SET popularite = 60 WHERE nom ILIKE '%port%' AND type_lieu IN ('port', 'transport');
UPDATE adresses SET popularite = 50 WHERE nom ILIKE '%universite%' OR nom ILIKE '%université%';