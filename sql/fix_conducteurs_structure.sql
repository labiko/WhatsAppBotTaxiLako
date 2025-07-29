-- Script SQL pour vérifier et corriger la structure de la table conducteurs
-- Exécuter dans Supabase SQL Editor

-- 1. Vérifier la structure actuelle de la table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conducteurs' 
ORDER BY ordinal_position;

-- 2. Vérifier le format des positions GPS actuelles
SELECT 
    nom, prenom,
    ST_AsText(position_actuelle) as position_text,
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs 
LIMIT 5;

-- 3. Compter les conducteurs par type et statut
SELECT 
    vehicle_type,
    statut,
    COUNT(*) as nombre
FROM conducteurs 
GROUP BY vehicle_type, statut
ORDER BY vehicle_type, statut;

-- 4. Vérifier les positions GPS (doivent être des coordonnées valides)
SELECT 
    nom, prenom, vehicle_type,
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude,
    CASE 
        WHEN ST_X(position_actuelle::geometry) BETWEEN -180 AND 180 
             AND ST_Y(position_actuelle::geometry) BETWEEN -90 AND 90 
        THEN 'OK' 
        ELSE 'INVALIDE' 
    END as validation_gps
FROM conducteurs;

-- 5. Mettre à jour le format de position pour le bot (si nécessaire)
-- Le bot s'attend à du GeoJSON ou du texte POINT()
-- Cette requête convertit PostGIS en format texte lisible par le bot
SELECT 
    nom, prenom,
    'POINT(' || ST_X(position_actuelle::geometry) || ' ' || ST_Y(position_actuelle::geometry) || ')' as position_pour_bot
FROM conducteurs
LIMIT 5;