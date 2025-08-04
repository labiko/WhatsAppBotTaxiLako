-- 🔧 RESTAURATION DES CONTRAINTES APRÈS INJECTION
-- À exécuter APRÈS l'injection Google Places réussie

-- 1️⃣ RECRÉER LA CONTRAINTE UNIQUE (optionnel - peut causer des doublons)
-- ALTER TABLE public.adresses ADD CONSTRAINT adresses_nom_key UNIQUE (nom);

-- 2️⃣ VÉRIFICATION FINALE DE L'INJECTION
SELECT COUNT(*) as total_apres_injection FROM public.adresses;
SELECT COUNT(*) as total_google_places FROM public.adresses WHERE source_donnees = 'google_places_grid_search';

-- 3️⃣ TEST 2LK RESTAURANT
SELECT nom, telephone, note_moyenne, ville FROM public.adresses WHERE nom ILIKE '%2LK%';

-- 4️⃣ ÉCHANTILLON DES DONNÉES INJECTÉES
SELECT nom, note_moyenne, telephone, type_lieu 
FROM public.adresses 
WHERE source_donnees = 'google_places_grid_search' 
  AND note_moyenne >= 4.5 
ORDER BY note_moyenne DESC 
LIMIT 10;

-- ✅ INJECTION TERMINÉE ET VÉRIFIÉE