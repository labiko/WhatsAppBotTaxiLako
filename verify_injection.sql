-- 🔍 VÉRIFICATION INJECTION GOOGLE PLACES
-- Date: 30/07/2025

\echo '========================================='
\echo '🔍 VÉRIFICATION INJECTION GOOGLE PLACES'
\echo '========================================='

-- 1️⃣ COMPTAGE TOTAL GOOGLE PLACES
\echo ''
\echo '1️⃣ TOTAL LIEUX GOOGLE PLACES:'
SELECT COUNT(*) as total_google_places 
FROM adresses 
WHERE source_donnees = 'google_places_grid_search';

-- 2️⃣ RECHERCHE 2LK RESTAURANT
\echo ''
\echo '2️⃣ RECHERCHE 2LK RESTAURANT:'
SELECT 
    nom,
    telephone,
    note_moyenne,
    ville,
    type_lieu
FROM adresses 
WHERE nom ILIKE '%2LK%';

-- 3️⃣ TOP 5 LIEUX PREMIUM (NOTE ≥ 4.5)
\echo ''
\echo '3️⃣ TOP 5 LIEUX PREMIUM (NOTE ≥ 4.5):'
SELECT 
    nom,
    note_moyenne,
    telephone,
    type_lieu,
    ville
FROM adresses 
WHERE source_donnees = 'google_places_grid_search' 
  AND note_moyenne >= 4.5
ORDER BY note_moyenne DESC 
LIMIT 5;

-- 4️⃣ RÉPARTITION PAR TYPE DE LIEU
\echo ''
\echo '4️⃣ RÉPARTITION PAR TYPE:'
SELECT 
    type_lieu,
    COUNT(*) as count,
    ROUND(AVG(note_moyenne), 2) as note_moyenne
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
  AND type_lieu IS NOT NULL
GROUP BY type_lieu
ORDER BY count DESC
LIMIT 10;

-- 5️⃣ LIEUX AVEC TÉLÉPHONE
\echo ''
\echo '5️⃣ LIEUX AVEC TÉLÉPHONE:'
SELECT COUNT(*) as avec_telephone
FROM adresses 
WHERE source_donnees = 'google_places_grid_search'
  AND telephone IS NOT NULL 
  AND telephone != '';

-- 6️⃣ TOTAL GÉNÉRAL TOUTES SOURCES
\echo ''
\echo '6️⃣ TOTAL GÉNÉRAL ADRESSES:'
SELECT 
    source_donnees,
    COUNT(*) as count
FROM adresses
GROUP BY source_donnees
ORDER BY count DESC;

\echo ''
\echo '✅ VÉRIFICATION TERMINÉE'
\echo '🎯 Si 2LK RESTAURANT apparaît, l''injection est réussie!'