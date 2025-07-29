-- Création de la table conducteurs uniquement
-- À exécuter en PREMIER avant le script de données

CREATE TABLE IF NOT EXISTS conducteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('moto', 'voiture')) NOT NULL,
  vehicle_marque VARCHAR(50),
  vehicle_modele VARCHAR(50),
  vehicle_couleur VARCHAR(30),
  vehicle_plaque VARCHAR(20),
  position_actuelle GEOGRAPHY(Point, 4326),
  statut VARCHAR(20) CHECK (statut IN ('disponible', 'occupe', 'hors_service', 'inactif')) DEFAULT 'disponible',
  note_moyenne DECIMAL(3,2) DEFAULT 5.00,
  nombre_courses INTEGER DEFAULT 0,
  date_inscription TIMESTAMP DEFAULT NOW(),
  derniere_activite TIMESTAMP DEFAULT NOW(),
  actif BOOLEAN DEFAULT TRUE
);

-- Index pour optimiser les recherches géographiques
CREATE INDEX IF NOT EXISTS idx_conducteurs_position ON conducteurs USING GIST (position_actuelle);
CREATE INDEX IF NOT EXISTS idx_conducteurs_vehicle_type ON conducteurs (vehicle_type);
CREATE INDEX IF NOT EXISTS idx_conducteurs_statut ON conducteurs (statut);
CREATE INDEX IF NOT EXISTS idx_conducteurs_actif ON conducteurs (actif);

-- Vérification que la table est créée
SELECT 'Table conducteurs créée avec succès!' as message;