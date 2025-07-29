-- Requête SQL pour vérifier "donka" dans la base de données
-- Cette requête reproduit exactement ce que fait searchAdresse()

-- 1. Recherche directe dans la table adresses (comme searchAdressePartial)
SELECT 
    id,
    nom,
    nom_normalise,
    ville,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    position,
    actif,
    type_lieu
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

-- 2. Test de l'API intelligente (ce que utilise searchAdresse)
-- NOTE: Cette requête simule ce que fait searchDestinationIntelligent
-- mais nous ne pouvons pas tester l'Edge Function depuis SQL

-- 3. Vérifier toutes les variations de "donka"
SELECT 
    nom,
    nom_normalise,
    ville,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    actif
FROM adresses 
WHERE 
    actif = true 
    AND (
        nom ILIKE '%donka%' 
        OR nom_normalise ILIKE '%donka%'
        OR nom ILIKE '%CFP%donka%'
        OR nom ILIKE '%centre%donka%'
    )
ORDER BY nom;

-- 4. Recherche exacte "CFP donka" (ce qui a été trouvé)
SELECT 
    id,
    nom,
    nom_normalise,
    ville,
    ST_X(position::geometry) as longitude,
    ST_Y(position::geometry) as latitude,
    position,
    actif,
    type_lieu,
    created_at
FROM adresses 
WHERE 
    actif = true 
    AND nom = 'CFP donka';

-- 5. Vérifier la structure complète de "CFP donka"
SELECT *
FROM adresses 
WHERE 
    actif = true 
    AND nom = 'CFP donka';