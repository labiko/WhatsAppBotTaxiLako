-- Script pour ajouter seulement la colonne actif à la vue adresses_with_coords existante
-- À exécuter dans le SQL Editor de Supabase

-- 1. Supprimer l'ancienne vue
DROP VIEW IF EXISTS public.adresses_with_coords;

-- 2. Recréer la vue avec la colonne actif ajoutée (BASÉ SUR LA DÉFINITION ACTUELLE)
CREATE VIEW public.adresses_with_coords AS
SELECT 
    id,
    nom,
    nom_normalise,
    adresse_complete,
    ville,
    code_postal,
    position,
    type_lieu,
    actif,  -- ✅ AJOUT DE LA COLONNE ACTIF (seule modification)
    st_x(position::geometry) AS longitude,
    st_y(position::geometry) AS latitude
FROM adresses
WHERE (actif = true);  -- ✅ Conserver le filtre existant

-- 3. Ajouter des commentaires pour documentation
COMMENT ON VIEW public.adresses_with_coords IS 'Vue des adresses avec coordonnées pré-calculées et colonne actif pour filtrage';

-- 4. Test de vérification
SELECT 'Test de la vue mise à jour' as message;
SELECT id, nom, ville, actif, latitude, longitude 
FROM public.adresses_with_coords 
WHERE actif = true 
LIMIT 5;

-- 5. Test spécifique Donka
SELECT 'Test recherche Donka dans la vue' as message;
SELECT nom, ville, actif, latitude, longitude 
FROM public.adresses_with_coords 
WHERE (nom ILIKE '%donka%' OR nom_normalise ILIKE '%donka%') 
AND actif = true
ORDER BY nom
LIMIT 10;