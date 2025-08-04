-- ========================================
-- SCRIPT TEST RECHERCHE HOPITAL DONKA
-- ========================================

-- 1️⃣ RECHERCHE EXACTE
SELECT 'RECHERCHE EXACTE' as type_recherche, 
       id, nom, ville, type_lieu, latitude, longitude
FROM adresses_with_coords 
WHERE actif = true 
  AND (nom_normalise ILIKE '%hopital donka%' OR nom ILIKE '%hopital donka%')
ORDER BY nom;

-- 2️⃣ RECHERCHE FUZZY - Hôpital
SELECT 'RECHERCHE FUZZY HOPITAL' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude,
       similarity(nom_normalise, 'hopital') as score_hopital
FROM adresses_with_coords 
WHERE actif = true 
  AND similarity(nom_normalise, 'hopital') > 0.3
ORDER BY score_hopital DESC
LIMIT 10;

-- 3️⃣ RECHERCHE FUZZY - Donka
SELECT 'RECHERCHE FUZZY DONKA' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude,
       similarity(nom_normalise, 'donka') as score_donka
FROM adresses_with_coords 
WHERE actif = true 
  AND similarity(nom_normalise, 'donka') > 0.3
ORDER BY score_donka DESC
LIMIT 10;

-- 4️⃣ RECHERCHE PARTIELLE - Mots séparés
SELECT 'RECHERCHE PARTIELLE' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude
FROM adresses_with_coords 
WHERE actif = true 
  AND (nom_normalise ILIKE '%hopital%' OR nom_normalise ILIKE '%donka%')
ORDER BY 
  CASE 
    WHEN nom_normalise ILIKE '%hopital%' AND nom_normalise ILIKE '%donka%' THEN 1
    WHEN nom_normalise ILIKE '%hopital%' THEN 2
    WHEN nom_normalise ILIKE '%donka%' THEN 3
    ELSE 4
  END,
  nom
LIMIT 15;

-- 5️⃣ RECHERCHE PAR TYPE - Tous les hôpitaux
SELECT 'TOUS LES HOPITAUX' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude
FROM adresses_with_coords 
WHERE actif = true 
  AND (type_lieu ILIKE '%hopital%' OR nom_normalise ILIKE '%hopital%')
ORDER BY nom
LIMIT 20;

-- 6️⃣ RECHERCHE VARIATIONS ORTHOGRAPHIQUES
SELECT 'VARIATIONS ORTHOGRAPHIQUES' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude
FROM adresses_with_coords 
WHERE actif = true 
  AND (
    nom_normalise ILIKE '%donka%' OR
    nom_normalise ILIKE '%doka%' OR
    nom_normalise ILIKE '%donca%' OR
    nom ILIKE '%Donka%' OR
    nom ILIKE '%donka%'
  )
ORDER BY nom;

-- 7️⃣ RECHERCHE COMPLÈTE COMBINÉE
SELECT 'RECHERCHE COMPLETE' as type_recherche,
       id, nom, ville, type_lieu, latitude, longitude,
       CASE 
         WHEN nom_normalise ILIKE '%hopital donka%' THEN 100
         WHEN nom_normalise ILIKE '%hopital%' AND nom_normalise ILIKE '%donka%' THEN 90
         WHEN similarity(nom_normalise, 'hopital donka') > 0.4 THEN 80
         WHEN nom_normalise ILIKE '%hopital%' THEN 70
         WHEN nom_normalise ILIKE '%donka%' THEN 60
         ELSE 50
       END as score_pertinence
FROM adresses_with_coords 
WHERE actif = true 
  AND (
    nom_normalise ILIKE '%hopital%' OR 
    nom_normalise ILIKE '%donka%' OR 
    type_lieu ILIKE '%hopital%' OR
    similarity(nom_normalise, 'hopital donka') > 0.3
  )
ORDER BY score_pertinence DESC, nom
LIMIT 10;

-- 8️⃣ STATISTIQUES DE LA RECHERCHE
SELECT 'STATISTIQUES' as info,
       COUNT(*) as total_adresses_actives,
       COUNT(CASE WHEN nom_normalise ILIKE '%hopital%' THEN 1 END) as avec_hopital,
       COUNT(CASE WHEN nom_normalise ILIKE '%donka%' THEN 1 END) as avec_donka,
       COUNT(CASE WHEN type_lieu ILIKE '%hopital%' THEN 1 END) as type_hopital
FROM adresses_with_coords 
WHERE actif = true;