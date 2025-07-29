-- Mise à jour des positions des conducteurs vers la région parisienne
-- Pour les tests depuis Moissy-Cramayel (Seine-et-Marne, proche Paris)

-- Mise à jour des conducteurs motos vers différents arrondissements de Paris
UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3522 48.8566)', 4326), -- Louvre, 1er arrondissement
  derniere_activite = NOW()
WHERE nom = 'Diallo' AND prenom = 'Mamadou';

UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3464 48.8606)', 4326), -- Opéra, 2e arrondissement
  derniere_activite = NOW()
WHERE nom = 'Sow' AND prenom = 'Ibrahima';

UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3488 48.8534)', 4326), -- Châtelet, 4e arrondissement
  derniere_activite = NOW()
WHERE nom = 'Barry' AND prenom = 'Alpha';

-- Mise à jour des conducteurs voitures vers différents quartiers de Paris
UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3354 48.8584)', 4326), -- Champs-Élysées, 8e arrondissement
  derniere_activite = NOW()
WHERE nom = 'Bah' AND prenom = 'Amadou';

UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3200 48.8434)', 4326), -- Tour Eiffel, 7e arrondissement
  derniere_activite = NOW()
WHERE nom = 'Camara' AND prenom = 'Ousmane';

UPDATE conducteurs SET 
  position_actuelle = ST_GeomFromText('POINT(2.3770 48.8471)', 4326), -- Nation, 11e arrondissement
  derniere_activite = NOW()
WHERE nom = 'Diagne' AND prenom = 'Thierno';

-- Ajouter quelques conducteurs supplémentaires plus proches de Moissy-Cramayel
INSERT INTO conducteurs (nom, prenom, telephone, vehicle_type, vehicle_marque, vehicle_modele, vehicle_couleur, vehicle_plaque, position_actuelle) VALUES

-- Conducteurs dans l'Est parisien (plus proche de Moissy-Cramayel)
('Martin', 'Pierre', '+33681234571', 'moto', 'Yamaha', 'MT-07', 'Bleu', '123-ABC-77', ST_GeomFromText('POINT(2.6062 48.7261)', 4326)), -- Moissy-Cramayel centre
('Dubois', 'Alexandre', '+33681234572', 'moto', 'Honda', 'CB 650R', 'Rouge', '456-DEF-77', ST_GeomFromText('POINT(2.5890 48.7340)', 4326)), -- Savigny-le-Temple
('Moreau', 'Julien', '+33681234573', 'moto', 'Kawasaki', 'Z650', 'Verte', '789-GHI-77', ST_GeomFromText('POINT(2.6532 48.7486)', 4326)), -- Melun

-- Conducteurs voitures Seine-et-Marne
('Leroy', 'Jean', '+33682345684', 'voiture', 'Peugeot', '308', 'Grise', '303-PQR-77', ST_GeomFromText('POINT(2.5729 48.7156)', 4326)), -- Cesson
('Roux', 'Nicolas', '+33682345685', 'voiture', 'Renault', 'Clio', 'Bleue', '404-STU-77', ST_GeomFromText('POINT(2.6395 48.7282)', 4326)), -- Vert-Saint-Denis
('Fournier', 'Olivier', '+33682345686', 'voiture', 'Citroën', 'C4', 'Rouge', '505-VWX-77', ST_GeomFromText('POINT(2.5612 48.6834)', 4326)), -- Lieusaint

-- Conducteurs dans le 12e arrondissement (Vincennes, plus à l'Est)
('Simon', 'François', '+33682345687', 'voiture', 'Volkswagen', 'Golf', 'Noire', '606-YZA-75', ST_GeomFromText('POINT(2.4609 48.8392)', 4326)), -- Vincennes
('Bernard', 'Laurent', '+33682345688', 'voiture', 'Toyota', 'Corolla', 'Blanche', '707-BCD-94', ST_GeomFromText('POINT(2.4889 48.7936)', 4326)); -- Créteil

-- S'assurer que tous les conducteurs sont disponibles
UPDATE conducteurs SET 
  statut = 'disponible',
  actif = TRUE,
  derniere_activite = NOW();

-- Vérification : compter les conducteurs par type
SELECT 
  vehicle_type,
  COUNT(*) as nombre_conducteurs,
  COUNT(CASE WHEN statut = 'disponible' THEN 1 END) as disponibles
FROM conducteurs 
GROUP BY vehicle_type;