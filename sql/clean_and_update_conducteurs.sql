-- Script de nettoyage et mise à jour pour conducteurs existants
-- Supprime les données existantes et recrée avec positions Paris

-- 1. Supprimer tous les conducteurs existants
DELETE FROM conducteurs;

-- 2. Remettre à zéro les séquences si nécessaire
-- (PostgreSQL nettoie automatiquement)

-- 3. Insérer les nouveaux conducteurs avec positions Paris et numéros français
INSERT INTO conducteurs (nom, prenom, telephone, vehicle_type, vehicle_marque, vehicle_modele, vehicle_couleur, vehicle_plaque, position_actuelle) VALUES

-- Conducteurs Moto - Zone Paris
('Martin', 'Pierre', '+33681234567', 'moto', 'Yamaha', 'MT-07', 'Bleu', '123-ABC-75', ST_GeomFromText('POINT(2.3522 48.8566)', 4326)), -- Louvre
('Dubois', 'Alexandre', '+33681234568', 'moto', 'Honda', 'CB 650R', 'Rouge', '456-DEF-75', ST_GeomFromText('POINT(2.3464 48.8606)', 4326)), -- Opéra
('Moreau', 'Julien', '+33681234569', 'moto', 'Kawasaki', 'Z650', 'Verte', '789-GHI-75', ST_GeomFromText('POINT(2.3488 48.8534)', 4326)), -- Châtelet

-- Conducteurs Moto - Proche Moissy-Cramayel
('Petit', 'Thomas', '+33681234570', 'moto', 'Suzuki', 'GSX-S750', 'Noire', '101-JKL-77', ST_GeomFromText('POINT(2.6062 48.7261)', 4326)), -- Moissy-Cramayel centre
('Garcia', 'Miguel', '+33681234571', 'moto', 'BMW', 'F 900 R', 'Blanche', '202-MNO-77', ST_GeomFromText('POINT(2.5890 48.7340)', 4326)), -- Savigny-le-Temple

-- Conducteurs Voiture - Zone Paris
('Leroy', 'Jean', '+33682345678', 'voiture', 'Peugeot', '308', 'Grise', '303-PQR-75', ST_GeomFromText('POINT(2.3354 48.8584)', 4326)), -- Champs-Élysées
('Roux', 'Nicolas', '+33682345679', 'voiture', 'Renault', 'Clio', 'Bleue', '404-STU-75', ST_GeomFromText('POINT(2.3200 48.8434)', 4326)), -- Tour Eiffel
('Fournier', 'Olivier', '+33682345680', 'voiture', 'Citroën', 'C4', 'Rouge', '505-VWX-75', ST_GeomFromText('POINT(2.3770 48.8471)', 4326)), -- Nation

-- Conducteurs Voiture - Proche Moissy-Cramayel  
('Simon', 'François', '+33682345681', 'voiture', 'Volkswagen', 'Golf', 'Noire', '606-YZA-77', ST_GeomFromText('POINT(2.5729 48.7156)', 4326)), -- Cesson
('Bernard', 'Laurent', '+33682345682', 'voiture', 'Toyota', 'Corolla', 'Blanche', '707-BCD-77', ST_GeomFromText('POINT(2.6395 48.7282)', 4326)), -- Vert-Saint-Denis
('Bonnet', 'Christophe', '+33682345683', 'voiture', 'Ford', 'Focus', 'Argent', '808-EFG-77', ST_GeomFromText('POINT(2.5612 48.6834)', 4326)), -- Lieusaint

-- Conducteurs Voiture - Est parisien
('Durand', 'Stéphane', '+33682345684', 'voiture', 'Audi', 'A3', 'Grise', '909-HIJ-94', ST_GeomFromText('POINT(2.4609 48.8392)', 4326)), -- Vincennes
('Laurent', 'David', '+33682345685', 'voiture', 'Mercedes', 'Classe A', 'Noire', '010-KLM-94', ST_GeomFromText('POINT(2.4889 48.7936)', 4326)); -- Créteil

-- 4. S'assurer que tous les conducteurs sont disponibles
UPDATE conducteurs SET 
  statut = 'disponible',
  actif = TRUE,
  derniere_activite = NOW();

-- 5. Vérification : compter les conducteurs par type et par zone
SELECT 
  vehicle_type,
  COUNT(*) as total_conducteurs,
  COUNT(CASE WHEN statut = 'disponible' THEN 1 END) as disponibles,
  COUNT(CASE WHEN ST_DWithin(position_actuelle::geometry, ST_GeomFromText('POINT(2.6062 48.7261)', 4326)::geometry, 10000) THEN 1 END) as proche_moissy
FROM conducteurs 
GROUP BY vehicle_type
ORDER BY vehicle_type;

-- 6. Afficher la liste complète des conducteurs
SELECT 
  prenom, 
  nom, 
  telephone, 
  vehicle_type,
  CONCAT(vehicle_marque, ' ', vehicle_modele, ' ', vehicle_couleur) as vehicule,
  vehicle_plaque,
  statut,
  ROUND(ST_Distance(position_actuelle::geometry, ST_GeomFromText('POINT(2.6062 48.7261)', 4326)::geometry) / 1000.0, 1) as distance_moissy_km
FROM conducteurs 
ORDER BY vehicle_type, distance_moissy_km;