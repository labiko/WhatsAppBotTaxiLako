-- ===============================================
-- ENRICHISSEMENT TABLE ADRESSES - CONAKRY, GUINÉE
-- Destinations populaires pour le POC LokoTaxi
-- Note: Utilise ON CONFLICT pour éviter les doublons
-- ===============================================

-- QUARTIERS PRINCIPAUX
INSERT INTO adresses (nom, adresse_complete, ville, pays, position, type_lieu) VALUES
-- Zone Kipé
('Kipé Centre Émetteur', 'Kipé Centre Émetteur, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6412 9.5324)', 'quartier'),
('Kipé Marché', 'Kipé Marché, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6389 9.5298)', 'marché'),
('Kipé Château d''eau', 'Kipé Château d''eau, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6445 9.5356)', 'quartier'),

-- Zone Madina
('Madina Marché', 'Madina Marché, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6234 9.5456)', 'marché'),
('Madina Centre', 'Madina Centre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6198 9.5478)', 'quartier'),
('Madina République', 'Madina République, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6267 9.5445)', 'quartier'),

-- Zone Matoto
('Matoto Centre', 'Matoto Centre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6123 9.5234)', 'quartier'),
('Matoto Marché', 'Matoto Marché, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6089 9.5267)', 'marché'),

-- Zone Ratoma
('Ratoma Centre', 'Ratoma Centre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6534 9.5687)', 'quartier'),
('Ratoma Marché', 'Ratoma Marché, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6498 9.5712)', 'marché'),

-- Zone Dixinn
('Dixinn Centre', 'Dixinn Centre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5234)', 'quartier'),
('Dixinn Port', 'Dixinn Port, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6823 9.5198)', 'quartier'),

-- Zone Kaloum (Centre-ville)
('Kaloum Centre', 'Kaloum Centre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7123 9.5089)', 'centre_ville'),
('Almamya', 'Almamya, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7089 9.5067)', 'quartier'),
('Boulbinet', 'Boulbinet, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7234 9.5123)', 'quartier'),
('Tombo', 'Tombo, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7345 9.5045)', 'quartier')
ON CONFLICT (nom) DO UPDATE SET
  adresse_complete = EXCLUDED.adresse_complete,
  ville = EXCLUDED.ville,
  pays = EXCLUDED.pays,
  position = EXCLUDED.position,
  type_lieu = EXCLUDED.type_lieu;

-- POINTS D'INTÉRÊT MAJEURS
INSERT INTO adresses (nom, adresse_complete, ville, pays, position, type_lieu) VALUES
-- Transport
('Aéroport International Ahmed Sékou Touré', 'Aéroport International, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6120 9.5769)', 'aeroport'),
('Aéroport de Conakry', 'Aéroport de Conakry', 'Conakry', 'Guinée', 'POINT(-13.6120 9.5769)', 'aeroport'),
('Port Autonome de Conakry', 'Port Autonome, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7234 9.5123)', 'port'),
('Gare Routière Madina', 'Gare Routière Madina, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6198 9.5489)', 'gare'),
('Gare Routière Bambeto', 'Gare Routière Bambeto, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5987 9.5234)', 'gare'),

-- Institutions
('Palais du Peuple', 'Palais du Peuple, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5345)', 'monument'),
('Palais Sékhoutouréya', 'Palais Sékhoutouréya, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7098 9.5078)', 'palais'),
('Assemblée Nationale', 'Assemblée Nationale, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7034 9.5089)', 'institution'),
('Ministère des Affaires Étrangères', 'Ministère des Affaires Étrangères, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7123 9.5098)', 'ministere'),

-- Santé
('CHU Donka', 'CHU Donka, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6123 9.5234)', 'hopital'),
('Hôpital Ignace Deen', 'Hôpital Ignace Deen, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7089 9.5067)', 'hopital'),
('Hôpital National', 'Hôpital National, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5178)', 'hopital'),

-- Éducation
('Université Gamal Abdel Nasser', 'Université Gamal Abdel Nasser, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6345 9.5234)', 'universite'),
('École Normale Supérieure', 'École Normale Supérieure, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6456 9.5123)', 'ecole'),

-- Commercial
('Marché Madina', 'Marché Madina, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6234 9.5456)', 'marché'),
('Marché Niger', 'Marché Niger, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7234 9.5098)', 'marché'),
('Centre Commercial Kaloum', 'Centre Commercial Kaloum, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7123 9.5089)', 'centre_commercial'),
('Supermarché Leader Price Kipé', 'Leader Price Kipé, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6398 9.5312)', 'supermarche'),

-- Religieux
('Grande Mosquée de Conakry', 'Grande Mosquée, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7089 9.5078)', 'mosquee'),
('Cathédrale Sainte-Marie', 'Cathédrale Sainte-Marie, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7123 9.5067)', 'eglise'),

-- Loisirs & Culture
('Stade du 28 Septembre', 'Stade du 28 Septembre, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5234)', 'stade'),
('Palais des Sports', 'Palais des Sports, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6534 9.5189)', 'stade'),
('Musée National', 'Musée National, Conakry', 'Conakry', 'Guinée', 'POINT(-13.7098 9.5089)', 'musee'),
('Jardin Botanique', 'Jardin Botanique, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6876 9.5134)', 'parc')
ON CONFLICT (nom) DO UPDATE SET
  adresse_complete = EXCLUDED.adresse_complete,
  ville = EXCLUDED.ville,
  pays = EXCLUDED.pays,
  position = EXCLUDED.position,
  type_lieu = EXCLUDED.type_lieu;

-- QUARTIERS SUPPLÉMENTAIRES
INSERT INTO adresses (nom, adresse_complete, ville, pays, position, type_lieu) VALUES
-- Zone étendue
('Taouyah', 'Taouyah, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5123 9.5234)', 'quartier'),
('Cosa', 'Cosa, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5789 9.5678)', 'quartier'),
('Lambanyi', 'Lambanyi, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6543 9.5432)', 'quartier'),
('Bambeto', 'Bambeto, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5987 9.5234)', 'quartier'),
('Sonfonia', 'Sonfonia, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5678 9.5345)', 'quartier'),
('Hamdallaye', 'Hamdallaye, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6234 9.5567)', 'quartier'),
('Koloma', 'Koloma, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6123 9.5678)', 'quartier'),
('Enco5', 'Enco5, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5789 9.5456)', 'quartier'),
('Coleah', 'Coleah, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6345 9.5234)', 'quartier'),
('Yattaya', 'Yattaya, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5456 9.5123)', 'quartier'),
('Kaporo Rails', 'Kaporo Rails, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5345)', 'quartier'),
('Dar Es Salam', 'Dar Es Salam, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5234 9.5567)', 'quartier')
ON CONFLICT (nom) DO UPDATE SET
  adresse_complete = EXCLUDED.adresse_complete,
  ville = EXCLUDED.ville,
  pays = EXCLUDED.pays,
  position = EXCLUDED.position,
  type_lieu = EXCLUDED.type_lieu;

-- STATIONS SERVICES & REPÈRES
INSERT INTO adresses (nom, adresse_complete, ville, pays, position, type_lieu) VALUES
('Station Total Kipé', 'Station Total Kipé, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6378 9.5298)', 'station_service'),
('Station Shell Madina', 'Station Shell Madina, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6212 9.5434)', 'station_service'),
('Station Oryx Matoto', 'Station Oryx Matoto, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6098 9.5245)', 'station_service'),
('Rond-point Fidel Castro', 'Rond-point Fidel Castro, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6789 9.5234)', 'rond_point'),
('Rond-point Nongo', 'Rond-point Nongo, Conakry', 'Conakry', 'Guinée', 'POINT(-13.5678 9.5456)', 'rond_point'),
('Pharmaguinée Kipé', 'Pharmaguinée Kipé, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6389 9.5312)', 'pharmacie'),
('Pharmaguinée Madina', 'Pharmaguinée Madina, Conakry', 'Conakry', 'Guinée', 'POINT(-13.6234 9.5467)', 'pharmacie')
ON CONFLICT (nom) DO UPDATE SET
  adresse_complete = EXCLUDED.adresse_complete,
  ville = EXCLUDED.ville,
  pays = EXCLUDED.pays,
  position = EXCLUDED.position,
  type_lieu = EXCLUDED.type_lieu;

-- VÉRIFICATION DU CONTENU
SELECT COUNT(*) as total_adresses FROM adresses;
SELECT type_lieu, COUNT(*) as nombre FROM adresses GROUP BY type_lieu ORDER BY nombre DESC;

-- QUELQUES EXEMPLES POUR TESTS
SELECT nom, ville, pays, type_lieu, ST_AsText(position) as coordinates 
FROM adresses 
WHERE nom ILIKE '%kipé%' OR nom ILIKE '%madina%' 
ORDER BY nom;