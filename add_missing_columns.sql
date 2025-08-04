-- 🔧 AJOUT COLONNES MANQUANTES POUR GOOGLE PLACES
-- Date: 30/07/2025

\echo '========================================='
\echo '🔧 AJOUT COLONNES GOOGLE PLACES'
\echo '========================================='

-- 1️⃣ AJOUT COLONNE NOTE_MOYENNE
\echo ''
\echo '1️⃣ Ajout colonne note_moyenne...'
ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(2,1) CHECK (note_moyenne >= 0 AND note_moyenne <= 5);

-- 2️⃣ AJOUT COLONNE METADATA (JSON)
\echo '2️⃣ Ajout colonne metadata...'
ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3️⃣ AJOUT INDEX POUR PERFORMANCE
\echo '3️⃣ Ajout index pour performance...'
CREATE INDEX IF NOT EXISTS idx_adresses_note_moyenne 
ON adresses (note_moyenne) WHERE note_moyenne IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_adresses_metadata_gin 
ON adresses USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_adresses_source_donnees 
ON adresses (source_donnees);

-- 4️⃣ VÉRIFICATION STRUCTURE TABLE
\echo ''
\echo '4️⃣ Vérification structure table...'
\d adresses

\echo ''
\echo '✅ COLONNES AJOUTÉES AVEC SUCCÈS!'
\echo ''
\echo '🎯 PROCHAINE ÉTAPE: Relancer inject_via_api.js'