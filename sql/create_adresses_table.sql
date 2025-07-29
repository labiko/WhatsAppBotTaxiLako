-- Table des adresses (destinations) pré-enregistrées avec coordonnées GPS
-- Pour calculer le prix des courses en fonction de la destination

CREATE TABLE IF NOT EXISTS adresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(200) NOT NULL UNIQUE, -- Nom de la destination (ex: "prefecture de melun")
  nom_normalise VARCHAR(200) NOT NULL, -- Version normalisée pour recherche (minuscules, sans accents)
  adresse_complete TEXT,
  ville VARCHAR(100),
  code_postal VARCHAR(20),
  pays VARCHAR(100) DEFAULT 'France',
  position GEOGRAPHY(Point, 4326) NOT NULL, -- Coordonnées GPS de la destination
  type_lieu VARCHAR(50), -- prefecture, gare, aeroport, centre_commercial, etc.
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_adresses_nom_normalise ON adresses(nom_normalise);
CREATE INDEX IF NOT EXISTS idx_adresses_position ON adresses USING GIST (position);
CREATE INDEX IF NOT EXISTS idx_adresses_actif ON adresses(actif);
CREATE INDEX IF NOT EXISTS idx_adresses_type_lieu ON adresses(type_lieu);

-- Fonction pour normaliser les noms (minuscules, sans accents)
CREATE OR REPLACE FUNCTION normalize_text(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRANSLATE(
      text_input,
      'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ',
      'aaaeeeeiioouuuycAAAEEEEIIOOUUUYC'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-normaliser le nom lors de l'insertion/mise à jour
CREATE OR REPLACE FUNCTION update_nom_normalise()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nom_normalise = normalize_text(NEW.nom);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_nom_normalise ON adresses;
CREATE TRIGGER trigger_update_nom_normalise
  BEFORE INSERT OR UPDATE ON adresses
  FOR EACH ROW
  EXECUTE FUNCTION update_nom_normalise();

-- Insertion des adresses de test pour la région Île-de-France
-- Utilise ON CONFLICT pour éviter les erreurs de duplication
INSERT INTO adresses (nom, adresse_complete, ville, code_postal, position, type_lieu) VALUES
-- Seine-et-Marne (77)
('Prefecture de Melun', '12 Rue Saint-Père, 77000 Melun', 'Melun', '77000', ST_GeomFromText('POINT(2.6554 48.5396)', 4326), 'prefecture'),
('Gare de Melun', 'Place Galliéni, 77000 Melun', 'Melun', '77000', ST_GeomFromText('POINT(2.6545 48.5264)', 4326), 'gare'),
('Centre Commercial Carrefour Melun', 'Avenue de la 7ème Division Blindée Américaine, 77190 Dammarie-les-Lys', 'Dammarie-les-Lys', '77190', ST_GeomFromText('POINT(2.6419 48.5172)', 4326), 'centre_commercial'),

-- Moissy-Cramayel et environs
('Mairie de Moissy-Cramayel', 'Place du Souvenir, 77550 Moissy-Cramayel', 'Moissy-Cramayel', '77550', ST_GeomFromText('POINT(2.5934 48.6276)', 4326), 'mairie'),
('Gare de Lieusaint-Moissy', 'Place de la Gare, 77550 Moissy-Cramayel', 'Moissy-Cramayel', '77550', ST_GeomFromText('POINT(2.5662 48.6262)', 4326), 'gare'),
('Centre Commercial Carré Sénart', '3 Allée du Préambule, 77127 Lieusaint', 'Lieusaint', '77127', ST_GeomFromText('POINT(2.5445 48.6199)', 4326), 'centre_commercial'),

-- Paris intra-muros
('Tour Eiffel', 'Champ de Mars, 75007 Paris', 'Paris', '75007', ST_GeomFromText('POINT(2.2945 48.8584)', 4326), 'monument'),
('Gare de Lyon', 'Place Louis-Armand, 75012 Paris', 'Paris', '75012', ST_GeomFromText('POINT(2.3733 48.8443)', 4326), 'gare'),
('Gare du Nord', '18 Rue de Dunkerque, 75010 Paris', 'Paris', '75010', ST_GeomFromText('POINT(2.3547 48.8809)', 4326), 'gare'),
('Aeroport Charles de Gaulle', 'Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France', 'Roissy-en-France', '95700', ST_GeomFromText('POINT(2.5479 49.0097)', 4326), 'aeroport'),
('Aeroport Orly', 'Aéroport de Paris-Orly, 94390 Orly', 'Orly', '94390', ST_GeomFromText('POINT(2.3644 48.7262)', 4326), 'aeroport'),

-- Autres destinations importantes 77
('Disneyland Paris', 'Boulevard de Parc, 77700 Coupvray', 'Coupvray', '77700', ST_GeomFromText('POINT(2.7836 48.8673)', 4326), 'parc_attractions'),
('Chateau de Fontainebleau', 'Place du Général de Gaulle, 77300 Fontainebleau', 'Fontainebleau', '77300', ST_GeomFromText('POINT(2.6974 48.4047)', 4326), 'monument'),
('Hopital de Melun', '270 Avenue Marc Jacquet, 77000 Melun', 'Melun', '77000', ST_GeomFromText('POINT(2.6667 48.5321)', 4326), 'hopital')
ON CONFLICT (nom) DO NOTHING;

-- Vue pour recherche rapide avec coordonnées GPS extraites
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
  ST_Y(position::geometry) as latitude,
  ST_X(position::geometry) as longitude
FROM adresses
WHERE actif = TRUE;

-- Fonction pour rechercher une adresse par nom (avec tolérance)
CREATE OR REPLACE FUNCTION search_adresse(search_term TEXT)
RETURNS TABLE (
  id UUID,
  nom VARCHAR,
  adresse_complete TEXT,
  distance_levenshtein INT,
  latitude FLOAT,
  longitude FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.nom,
    a.adresse_complete,
    levenshtein(normalize_text(search_term), a.nom_normalise) as distance_levenshtein,
    ST_Y(a.position::geometry) as latitude,
    ST_X(a.position::geometry) as longitude
  FROM adresses a
  WHERE 
    a.actif = TRUE
    AND (
      -- Recherche exacte
      a.nom_normalise = normalize_text(search_term)
      -- Recherche partielle
      OR a.nom_normalise LIKE '%' || normalize_text(search_term) || '%'
      -- Recherche avec tolérance (distance de Levenshtein <= 3)
      OR levenshtein(normalize_text(search_term), a.nom_normalise) <= 3
    )
  ORDER BY 
    CASE 
      WHEN a.nom_normalise = normalize_text(search_term) THEN 0
      WHEN a.nom_normalise LIKE normalize_text(search_term) || '%' THEN 1
      WHEN a.nom_normalise LIKE '%' || normalize_text(search_term) || '%' THEN 2
      ELSE 3
    END,
    levenshtein(normalize_text(search_term), a.nom_normalise)
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Activer l'extension pour la distance de Levenshtein si pas déjà fait
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;