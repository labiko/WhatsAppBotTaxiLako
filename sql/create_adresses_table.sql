-- Créer la table des adresses/destinations
CREATE TABLE IF NOT EXISTS adresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL UNIQUE,
    adresse_complete TEXT,
    position GEOGRAPHY(POINT, 4326),
    -- Coordonnées extraites pour faciliter les calculs
    latitude FLOAT,
    longitude FLOAT,
    type_lieu VARCHAR(50), -- transport, shopping, administratif, santé, etc.
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_adresses_nom ON adresses(nom);
CREATE INDEX IF NOT EXISTS idx_adresses_type ON adresses(type_lieu);
CREATE INDEX IF NOT EXISTS idx_adresses_position ON adresses USING GIST(position);

-- Insérer les destinations pré-définies
INSERT INTO adresses (nom, adresse_complete, latitude, longitude, type_lieu, position) VALUES
('Gare de Melun', 'Place Praslin, 77000 Melun', 48.5264, 2.6545, 'transport', 'POINT(2.6545 48.5264)'),
('Aeroport Charles de Gaulle', 'Terminal 2, 95700 Roissy-en-France', 49.0097, 2.5479, 'transport', 'POINT(2.5479 49.0097)'),
('Centre Commercial Carré Sénart', '3 Allée du Préambule, 77127 Lieusaint', 48.6259, 2.5503, 'shopping', 'POINT(2.5503 48.6259)'),
('Préfecture de Melun', '12 Rue des Saints-Pères, 77000 Melun', 48.5380, 2.6615, 'administratif', 'POINT(2.6615 48.5380)'),
('Hôpital de Melun', '270 Avenue Marc Jacquet, 77000 Melun', 48.5505, 2.6438, 'santé', 'POINT(2.6438 48.5505)'),
('Université Paris-Est Créteil', '61 Avenue du Général de Gaulle, 94010 Créteil', 48.7890, 2.4522, 'éducation', 'POINT(2.4522 48.7890)'),
('Château de Fontainebleau', 'Place du Général de Gaulle, 77300 Fontainebleau', 48.4024, 2.7004, 'tourisme', 'POINT(2.7004 48.4024)'),
('Gare de Corbeil-Essonnes', 'Place du 8 Mai 1945, 91100 Corbeil-Essonnes', 48.6117, 2.4816, 'transport', 'POINT(2.4816 48.6117)'),
('Centre Hospitalier Sud Francilien', '40 Avenue Serge Dassault, 91100 Corbeil-Essonnes', 48.6205, 2.4889, 'santé', 'POINT(2.4889 48.6205)'),
('Gare RER D Melun', 'Place Praslin, 77000 Melun', 48.5264, 2.6545, 'transport', 'POINT(2.6545 48.5264)'),
('Forêt de Fontainebleau', 'Route Ronde, 77300 Fontainebleau', 48.4147, 2.6834, 'nature', 'POINT(2.6834 48.4147)'),
('Château de Vaux-le-Vicomte', '77950 Maincy', 48.5656, 2.7141, 'tourisme', 'POINT(2.7141 48.5656)'),
('Lycée Léonard de Vinci', '2 Bis Rue Édouard Branly, 77000 Melun', 48.5412, 2.6702, 'éducation', 'POINT(2.6702 48.5412)'),
('Parc de Sceaux', 'Château de Sceaux, 92330 Sceaux', 48.7733, 2.2967, 'nature', 'POINT(2.2967 48.7733)')
ON CONFLICT (nom) DO NOTHING;

-- Fonction de recherche d'adresse avec distance de Levenshtein
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
        levenshtein(LOWER(a.nom), LOWER(search_term)) as distance_levenshtein,
        a.latitude,
        a.longitude
    FROM adresses a
    WHERE a.actif = TRUE
      AND levenshtein(LOWER(a.nom), LOWER(search_term)) <= 3
    ORDER BY distance_levenshtein ASC, a.nom ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE adresses IS 'Table des destinations disponibles pour LokoTaxi';
COMMENT ON COLUMN adresses.position IS 'Position GPS en format PostGIS';
COMMENT ON FUNCTION search_adresse(TEXT) IS 'Recherche floue d adresses avec distance de Levenshtein';

SELECT 'Table adresses créée avec succès avec ' || COUNT(*) || ' destinations' AS status 
FROM adresses WHERE actif = TRUE;