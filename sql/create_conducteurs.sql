-- Active l'extension uuid si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Active l'extension PostGIS pour gérer les données géographiques
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Supprime la table conducteurs si elle existe déjà (pour recréation complète)
DROP TABLE IF EXISTS conducteurs CASCADE;

-- Création de la table conducteurs
CREATE TABLE conducteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  
  -- Informations du véhicule
  type_vehicule VARCHAR(20) CHECK (type_vehicule IN ('moto', 'voiture')) NOT NULL,
  marque_vehicule VARCHAR(50),
  modele_vehicule VARCHAR(50),
  couleur_vehicule VARCHAR(30),
  numero_plaque VARCHAR(20) UNIQUE,
  
  -- Position géographique (PostGIS)
  position GEOGRAPHY(POINT, 4326),
  
  -- Statut du conducteur
  statut VARCHAR(20) CHECK (statut IN ('disponible', 'occupé', 'hors_service', 'inactif')) DEFAULT 'disponible',
  
  -- Informations de performance
  note_moyenne DECIMAL(3,2) DEFAULT 5.00,
  nombre_courses INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  derniere_activite TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_conducteurs_statut ON conducteurs(statut);
CREATE INDEX idx_conducteurs_type_vehicule ON conducteurs(type_vehicule);
CREATE INDEX idx_conducteurs_telephone ON conducteurs(telephone);
CREATE INDEX idx_conducteurs_statut_type ON conducteurs(statut, type_vehicule);

-- Index spatial pour la position géographique
CREATE INDEX idx_conducteurs_position ON conducteurs USING GIST(position);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_conducteurs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conducteurs_updated_at
    BEFORE UPDATE ON conducteurs
    FOR EACH ROW
    EXECUTE FUNCTION update_conducteurs_updated_at();

-- Vue optimisée pour les conducteurs avec coordonnées extraites
CREATE OR REPLACE VIEW conducteurs_with_coords AS
SELECT 
    id,
    nom,
    prenom,
    telephone,
    type_vehicule,
    marque_vehicule,
    modele_vehicule,
    couleur_vehicule,
    numero_plaque,
    statut,
    note_moyenne,
    nombre_courses,
    -- Extraction des coordonnées PostGIS en latitude/longitude
    CASE 
        WHEN position IS NOT NULL THEN ST_Y(position::geometry)
        ELSE NULL 
    END AS latitude,
    CASE 
        WHEN position IS NOT NULL THEN ST_X(position::geometry)
        ELSE NULL 
    END AS longitude,
    created_at,
    updated_at,
    derniere_activite
FROM conducteurs;

-- Vue pour les conducteurs disponibles seulement
CREATE OR REPLACE VIEW conducteurs_disponibles AS
SELECT * FROM conducteurs_with_coords 
WHERE statut = 'disponible';

-- Commentaires sur la table
COMMENT ON TABLE conducteurs IS 'Table des conducteurs de taxi LokoTaxi';
COMMENT ON COLUMN conducteurs.position IS 'Position GPS du conducteur (format PostGIS)';
COMMENT ON COLUMN conducteurs.statut IS 'Statut: disponible, occupé, hors_service, inactif';
COMMENT ON COLUMN conducteurs.type_vehicule IS 'Type de véhicule: moto ou voiture';
COMMENT ON COLUMN conducteurs.note_moyenne IS 'Note moyenne sur 5 étoiles';

SELECT 'Table conducteurs créée avec succès' AS status;