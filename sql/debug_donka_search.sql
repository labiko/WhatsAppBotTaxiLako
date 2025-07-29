-- Script pour diagnostiquer la recherche "donka" dans la base
-- Correspond à la requête vue dans les logs

-- 1. Recherche exacte comme dans les logs
SELECT 
    id,
    nom,
    ville,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    position
FROM adresses 
WHERE 
    actif = true 
    AND (
        nom_normalise ILIKE '%donka%' 
        OR nom ILIKE '%donka%'
    )
ORDER BY 
    CASE 
        WHEN nom_normalise ILIKE 'donka%' THEN 1
        WHEN nom ILIKE 'donka%' THEN 2
        ELSE 3
    END,
    nom
LIMIT 10;

-- 2. Vérifier la structure des colonnes pour identifier le problème
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'adresses' 
ORDER BY ordinal_position;

-- 3. Compter tous les résultats avec "donka"
SELECT COUNT(*) as total_donka_results
FROM adresses 
WHERE 
    actif = true 
    AND (
        nom_normalise ILIKE '%donka%' 
        OR nom ILIKE '%donka%'
    );

-- 4. Vérifier s'il y a des valeurs NULL qui pourraient causer l'erreur
SELECT 
    id,
    nom,
    ville,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    position,
    -- Vérifier les champs qui pourraient être NULL
    CASE WHEN nom IS NULL THEN 'nom_NULL' ELSE 'nom_OK' END as nom_status,
    CASE WHEN ville IS NULL THEN 'ville_NULL' ELSE 'ville_OK' END as ville_status,
    CASE WHEN position IS NULL THEN 'position_NULL' ELSE 'position_OK' END as position_status,
    CASE WHEN ST_X(position::geometry) IS NULL THEN 'lat_NULL' ELSE 'lat_OK' END as lat_status,
    CASE WHEN ST_Y(position::geometry) IS NULL THEN 'lon_NULL' ELSE 'lon_OK' END as lon_status
FROM adresses 
WHERE 
    actif = true 
    AND (
        nom_normalise ILIKE '%donka%' 
        OR nom ILIKE '%donka%'
    )
ORDER BY nom;

-- 5. Test spécifique pour "Donka" (avec majuscule)
SELECT *
FROM adresses 
WHERE 
    actif = true 
    AND (
        nom_normalise ILIKE '%donka%' 
        OR nom ILIKE '%Donka%'
        OR nom ILIKE '%DONKA%'
    );