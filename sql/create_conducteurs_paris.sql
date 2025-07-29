-- Table des conducteurs LokoTaxi - Version Paris
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

-- Suppression des données existantes pour mise à jour
DELETE FROM conducteurs;

-- Insertion des conducteurs de test pour Paris, France
INSERT INTO conducteurs (nom, prenom, telephone, vehicle_type, vehicle_marque, vehicle_modele, vehicle_couleur, vehicle_plaque, position_actuelle) VALUES

-- Conducteurs Moto - Zone Paris Centre
('Martin', 'Pierre', '+33681234567', 'moto', 'Yamaha', 'MT-07', 'Bleu', '123-ABC-75', ST_GeomFromText('POINT(2.3522 48.8566)', 4326)), -- Louvre
('Dubois', 'Alexandre', '+33681234568', 'moto', 'Honda', 'CB 650R', 'Rouge', '456-DEF-75', ST_GeomFromText('POINT(2.3464 48.8606)', 4326)), -- Opéra
('Moreau', 'Julien', '+33681234569', 'moto', 'Kawasaki', 'Z650', 'Verte', '789-GHI-75', ST_GeomFromText('POINT(2.3488 48.8534)', 4326)), -- Châtelet
('Petit', 'Thomas', '+33681234570', 'moto', 'Suzuki', 'GSX-S750', 'Noire', '101-JKL-75', ST_GeomFromText('POINT(2.3387 48.8619)', 4326)), -- Gare du Nord
('Garcia', 'Miguel', '+33681234571', 'moto', 'BMW', 'F 900 R', 'Blanche', '202-MNO-75', ST_GeomFromText('POINT(2.3601 48.8473)', 4326)), -- Bastille

-- Conducteurs Voiture - Zone Paris
('Leroy', 'Jean', '+33682345678', 'voiture', 'Peugeot', '308', 'Grise', '303-PQR-75', ST_GeomFromText('POINT(2.3354 48.8584)', 4326)), -- Champs-Élysées
('Roux', 'Nicolas', '+33682345679', 'voiture', 'Renault', 'Clio', 'Bleue', '404-STU-75', ST_GeomFromText('POINT(2.3200 48.8434)', 4326)), -- Tour Eiffel
('Fournier', 'Olivier', '+33682345680', 'voiture', 'Citroën', 'C4', 'Rouge', '505-VWX-75', ST_GeomFromText('POINT(2.3770 48.8471)', 4326)), -- Nation
('Simon', 'François', '+33682345681', 'voiture', 'Volkswagen', 'Golf', 'Noire', '606-YZA-75', ST_GeomFromText('POINT(2.3292 48.8759)', 4326)), -- Montmartre
('Bernard', 'Laurent', '+33682345682', 'voiture', 'Toyota', 'Corolla', 'Blanche', '707-BCD-75', ST_GeomFromText('POINT(2.3667 48.8671)', 4326)), -- République
('Bonnet', 'Christophe', '+33682345683', 'voiture', 'Ford', 'Focus', 'Argent', '808-EFG-75', ST_GeomFromText('POINT(2.3183 48.8671)', 4326)), -- Trocadéro

-- Conducteurs Banlieue Proche
('Durand', 'Stéphane', '+33683456789', 'moto', 'Ducati', 'Monster', 'Rouge', '909-HIJ-92', ST_GeomFromText('POINT(2.2869 48.8589)', 4326)), -- La Défense
('Laurent', 'David', '+33684567890', 'voiture', 'Audi', 'A3', 'Grise', '010-KLM-94', ST_GeomFromText('POINT(2.4609 48.8392)', 4326)); -- Vincennes

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