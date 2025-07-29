-- Ajout de colonnes utiles basées sur l'analyse des données OSM Guinée
-- Ces colonnes enrichiront l'expérience utilisateur du bot LokoTaxi

-- 1. Contact et informations pratiques
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS site_web TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS horaires TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Adresse détaillée
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS rue TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS numero TEXT;

-- 3. Informations business
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS operateur TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS marque TEXT;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- 4. Accessibilité et services
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS accessibilite TEXT; -- 'yes', 'no', 'limited'
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS cuisine TEXT; -- Pour restaurants

-- 5. Colonnes de tracking (déjà ajoutées)
-- popularite INTEGER DEFAULT 0 (déjà créée)
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS verifie BOOLEAN DEFAULT FALSE;
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS derniere_maj TIMESTAMP DEFAULT NOW();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_adresses_telephone ON adresses (telephone) WHERE telephone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adresses_horaires ON adresses (horaires) WHERE horaires IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adresses_accessibilite ON adresses (accessibilite) WHERE accessibilite IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adresses_verifie ON adresses (verifie);

-- Vérification des colonnes ajoutées
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
AND column_name IN ('telephone', 'site_web', 'horaires', 'email', 'rue', 'numero', 'operateur', 'marque', 'description_fr', 'accessibilite', 'cuisine', 'verifie', 'derniere_maj')
ORDER BY column_name;