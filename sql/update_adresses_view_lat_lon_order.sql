-- Script pour corriger la vue adresses_with_coords (optionnel)
-- Mettre à jour l'ordre latitude/longitude dans la vue pour cohérence
-- 
-- Date: 2025-07-23
-- Cohérence avec la correction de search_adresse

-- Recréer la vue avec l'ordre correct latitude PUIS longitude
CREATE OR REPLACE VIEW adresses_with_coords AS
SELECT 
  id,
  nom,
  nom_normalise,
  adresse_complete,
  ville,
  code_postal,
  position,
  type_lieu,
  ST_Y(position::geometry) as latitude,   -- CORRECTION: latitude en premier
  ST_X(position::geometry) as longitude   -- CORRECTION: longitude en second
FROM adresses
WHERE actif = TRUE;