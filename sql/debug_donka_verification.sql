-- Script pour vérifier les adresses contenant "Donka" en base
-- À exécuter dans le SQL Editor de Supabase

-- 1. Recherche exacte "Donka"
SELECT 'RECHERCHE EXACTE DONKA' as type_recherche;
SELECT nom, nom_normalise, ville, type_lieu, actif 
FROM adresses 
WHERE nom ILIKE '%donka%' OR nom_normalise ILIKE '%donka%'
ORDER BY nom;

-- 2. Vérifier la fonction RPC search_adresse
SELECT 'TEST RPC SEARCH_ADRESSE' as type_recherche;
SELECT * FROM search_adresse('donka');

-- 3. Test recherche partielle
SELECT 'RECHERCHE PARTIELLE VARIATIONS' as type_recherche;
SELECT nom, nom_normalise, ville, type_lieu, actif 
FROM adresses 
WHERE (nom ILIKE '%don%' OR nom_normalise ILIKE '%don%')
AND actif = true
ORDER BY nom
LIMIT 20;

-- 4. Compter total adresses actives
SELECT 'TOTAL ADRESSES ACTIVES' as type_recherche;
SELECT COUNT(*) as total_actives FROM adresses WHERE actif = true;

-- 5. Exemples d'adresses avec "hôpital" ou "chu"
SELECT 'ADRESSES HOPITAL/CHU' as type_recherche;
SELECT nom, nom_normalise, ville, type_lieu 
FROM adresses 
WHERE (nom ILIKE '%hôpital%' OR nom_normalise ILIKE '%hopital%' OR nom ILIKE '%chu%')
AND actif = true
ORDER BY nom
LIMIT 10;