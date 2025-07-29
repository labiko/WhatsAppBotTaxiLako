-- Script SQL pour corriger les positions GPS pour compatibilité avec le bot
-- ATTENTION: Tester d'abord avec une petite partie des données

-- Option 1: Ajouter une colonne avec format compatible bot
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS position_bot TEXT;

-- Mettre à jour avec format POINT(longitude latitude) 
UPDATE conducteurs 
SET position_bot = 'POINT(' || ST_X(position_actuelle::geometry) || ' ' || ST_Y(position_actuelle::geometry) || ')'
WHERE position_actuelle IS NOT NULL;

-- Option 2: Modifier la requête du bot pour utiliser ST_AsText()
-- (Recommandé - pas de modification de la base)
SELECT 
    nom, prenom, telephone, vehicle_type, statut,
    ST_AsText(position_actuelle) as position_text,
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs 
WHERE vehicle_type = 'moto' AND statut = 'disponible';