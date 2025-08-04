-- 🚨 DÉSACTIVATION CONTRAINTES ET VIDAGE TABLE
-- Pour permettre l'injection Google Places sans conflits

-- 1️⃣ DÉSACTIVER TOUTES LES CONTRAINTES
ALTER TABLE public.adresses DISABLE TRIGGER ALL;

-- Désactiver la contrainte UNIQUE sur nom
ALTER TABLE public.adresses DROP CONSTRAINT IF EXISTS adresses_nom_key;

-- Désactiver le trigger de normalisation
DROP TRIGGER IF EXISTS trigger_update_nom_normalise ON public.adresses;

-- 2️⃣ VIDER COMPLÈTEMENT LA TABLE
TRUNCATE TABLE public.adresses RESTART IDENTITY CASCADE;

-- 3️⃣ VÉRIFICATION
SELECT COUNT(*) as total_lignes FROM public.adresses;

-- 4️⃣ AFFICHER STRUCTURE FINALE
\d public.adresses

VACUUM ANALYZE public.adresses;