-- Script SQL pour créer une vue avec coordonnées GPS extraites
-- Cette vue évite l'erreur PostgREST avec ST_X() dans les requêtes API

-- Créer une vue qui inclut les coordonnées GPS extraites
CREATE OR REPLACE VIEW conducteurs_with_coords AS
SELECT 
    id,
    nom,
    prenom,
    telephone,
    vehicle_type,
    vehicle_marque,
    vehicle_modele,
    vehicle_couleur,
    vehicle_plaque,
    position_actuelle,
    statut,
    note_moyenne,
    nombre_courses,
    date_inscription,
    derniere_activite,
    actif,
    -- Extraire les coordonnées GPS avec cast geography->geometry
    ST_X(position_actuelle::geometry) as longitude,
    ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs
WHERE position_actuelle IS NOT NULL;

-- Donner les permissions à service_role pour accéder à la vue
GRANT SELECT ON conducteurs_with_coords TO service_role;

-- Vérifier que la vue fonctionne
SELECT 
    nom, prenom, vehicle_type, statut,
    longitude, latitude
FROM conducteurs_with_coords
WHERE vehicle_type = 'moto' AND statut = 'disponible'
LIMIT 3;