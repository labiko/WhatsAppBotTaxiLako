-- Table des conducteurs LokoTaxi
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

-- Insertion des conducteurs de test pour Conakry
INSERT INTO conducteurs (nom, prenom, telephone, vehicle_type, vehicle_marque, vehicle_modele, vehicle_couleur, vehicle_plaque, position_actuelle) VALUES
-- Conducteurs Moto
('Diallo', 'Mamadou', '+224621234567', 'moto', 'Yamaha', 'YBR 125', 'Rouge', 'CNK-001-M', ST_GeomFromText('POINT(-13.6785 9.5370)', 4326)),
('Sow', 'Ibrahima', '+224621234568', 'moto', 'Honda', 'CB 125F', 'Bleue', 'CNK-002-M', ST_GeomFromText('POINT(-13.6765 9.5390)', 4326)),
('Barry', 'Alpha', '+224621234569', 'moto', 'Suzuki', 'GN 125', 'Noire', 'CNK-003-M', ST_GeomFromText('POINT(-13.6805 9.5350)', 4326)),

-- Conducteurs Voiture
('Bah', 'Amadou', '+224622345678', 'voiture', 'Toyota', 'Corolla', 'Blanche', 'CNK-101-V', ST_GeomFromText('POINT(-13.6775 9.5360)', 4326)),
('Camara', 'Ousmane', '+224622345679', 'voiture', 'Nissan', 'Sentra', 'Grise', 'CNK-102-V', ST_GeomFromText('POINT(-13.6795 9.5380)', 4326)),
('Diagne', 'Thierno', '+224622345680', 'voiture', 'Honda', 'Civic', 'Rouge', 'CNK-103-V', ST_GeomFromText('POINT(-13.6755 9.5340)', 4326));

-- Fonction pour mettre à jour la dernière activité automatiquement
CREATE OR REPLACE FUNCTION update_derniere_activite()
RETURNS TRIGGER AS $$
BEGIN
  NEW.derniere_activite = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement la dernière activité
DROP TRIGGER IF EXISTS trigger_update_derniere_activite ON conducteurs;
CREATE TRIGGER trigger_update_derniere_activite
  BEFORE UPDATE ON conducteurs
  FOR EACH ROW
  EXECUTE FUNCTION update_derniere_activite();

-- Vue pour les conducteurs disponibles avec informations complètes
CREATE OR REPLACE VIEW conducteurs_disponibles AS
SELECT 
  id,
  nom,
  prenom,
  telephone,
  vehicle_type,
  CONCAT(vehicle_marque, ' ', vehicle_modele, ' ', vehicle_couleur) as vehicule_complet,
  vehicle_plaque,
  position_actuelle,
  note_moyenne,
  nombre_courses,
  derniere_activite
FROM conducteurs 
WHERE actif = TRUE 
  AND statut = 'disponible'
ORDER BY note_moyenne DESC, nombre_courses ASC;