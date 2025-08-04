-- 🔍 ANALYSE ET CORRECTION TABLE ADRESSES
-- Date: 30/07/2025

\echo '========================================='
\echo '🔍 ANALYSE STRUCTURE TABLE ADRESSES'
\echo '========================================='

-- 1️⃣ AFFICHER LA STRUCTURE ACTUELLE
\echo ''
\echo '1️⃣ Structure actuelle de la table adresses:'
\d adresses

-- 2️⃣ LISTER TOUTES LES COLONNES
\echo ''
\echo '2️⃣ Liste détaillée des colonnes:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'adresses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ VÉRIFIER COLONNES SPÉCIFIQUES
\echo ''
\echo '3️⃣ Vérification colonnes Google Places:'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'adresses' 
              AND column_name = 'note_moyenne'
        ) THEN '✅ note_moyenne existe'
        ELSE '❌ note_moyenne manquante'
    END as status_note_moyenne,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'adresses' 
              AND column_name = 'metadata'
        ) THEN '✅ metadata existe'
        ELSE '❌ metadata manquante'
    END as status_metadata,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'adresses' 
              AND column_name = 'telephone'
        ) THEN '✅ telephone existe'
        ELSE '❌ telephone manquante'
    END as status_telephone,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'adresses' 
              AND column_name = 'source_donnees'
        ) THEN '✅ source_donnees existe'
        ELSE '❌ source_donnees manquante'
    END as status_source_donnees;

-- 4️⃣ AJOUT DES COLONNES MANQUANTES
\echo ''
\echo '4️⃣ Ajout des colonnes manquantes...'

-- Ajout colonne telephone si manquante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'adresses' 
          AND column_name = 'telephone'
    ) THEN
        ALTER TABLE adresses ADD COLUMN telephone VARCHAR(20);
        RAISE NOTICE '✅ Colonne telephone ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne telephone existe déjà';
    END IF;
END $$;

-- Ajout colonne source_donnees si manquante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'adresses' 
          AND column_name = 'source_donnees'
    ) THEN
        ALTER TABLE adresses ADD COLUMN source_donnees VARCHAR(50) DEFAULT 'manuel';
        RAISE NOTICE '✅ Colonne source_donnees ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne source_donnees existe déjà';
    END IF;
END $$;

-- Ajout colonne note_moyenne si manquante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'adresses' 
          AND column_name = 'note_moyenne'
    ) THEN
        ALTER TABLE adresses ADD COLUMN note_moyenne DECIMAL(2,1) 
        CHECK (note_moyenne >= 0 AND note_moyenne <= 5);
        RAISE NOTICE '✅ Colonne note_moyenne ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne note_moyenne existe déjà';
    END IF;
END $$;

-- Ajout colonne metadata si manquante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'adresses' 
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE adresses ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Colonne metadata ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne metadata existe déjà';
    END IF;
END $$;

-- 5️⃣ VÉRIFICATION POST-AJOUT
\echo ''
\echo '5️⃣ Vérification après ajout:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'adresses' 
  AND table_schema = 'public'
  AND column_name IN ('telephone', 'source_donnees', 'note_moyenne', 'metadata')
ORDER BY column_name;

-- 6️⃣ AJOUT INDEX POUR PERFORMANCE
\echo ''
\echo '6️⃣ Ajout index pour performance...'

-- Index sur source_donnees
CREATE INDEX IF NOT EXISTS idx_adresses_source_donnees 
ON adresses (source_donnees);

-- Index sur note_moyenne
CREATE INDEX IF NOT EXISTS idx_adresses_note_moyenne 
ON adresses (note_moyenne) WHERE note_moyenne IS NOT NULL;

-- Index GIN sur metadata
CREATE INDEX IF NOT EXISTS idx_adresses_metadata_gin 
ON adresses USING GIN (metadata) WHERE metadata IS NOT NULL;

-- 7️⃣ RAFRAÎCHIR LE CACHE POSTGREST
\echo ''
\echo '7️⃣ Notification pour rafraîchir le cache PostgREST...'
NOTIFY pgrst, 'reload schema';

\echo ''
\echo '✅ ANALYSE ET CORRECTION TERMINÉES!'
\echo ''
\echo '🎯 PROCHAINES ÉTAPES:'
\echo '   1. Vérifier que toutes les colonnes sont présentes'
\echo '   2. Relancer inject_via_api.js'
\echo '   3. Si problème persiste, redémarrer Supabase PostgREST'