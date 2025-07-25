-- Création de la table reservations pour le projet LokoTaxi
-- Version compatible avec le bot WhatsApp et PostGIS

-- Activer l'extension PostGIS si elle n'est pas déjà activée
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS reservations CASCADE;

-- Créer la table reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone TEXT NOT NULL,
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'voiture')),
  -- Position de départ (client) en format PostGIS
  position_depart GEOGRAPHY(POINT, 4326),
  -- Position de destination en format PostGIS  
  position_destination GEOGRAPHY(POINT, 4326),
  -- Nom de la destination sélectionnée
  destination_nom TEXT,
  -- ID de la destination dans la table adresses
  destination_id UUID,
  -- Distance calculée en kilomètres
  distance_km DECIMAL(10,2),
  -- Prix estimé en GNF (Francs guinéens)
  prix_estime INTEGER,
  -- Prix confirmé par le client
  prix_confirme BOOLEAN DEFAULT FALSE,
  -- ID du conducteur assigné
  conducteur_id UUID,
  -- Statut de la réservation
  status TEXT CHECK (status IN ('pending', 'accepted', 'completed', 'canceled')) DEFAULT 'pending',
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_reservations_client_phone ON reservations(client_phone);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_created_at ON reservations(created_at);
CREATE INDEX idx_reservations_conducteur_id ON reservations(conducteur_id);

-- Index spatial pour les positions géographiques
CREATE INDEX idx_reservations_position_depart ON reservations USING GIST(position_depart);
CREATE INDEX idx_reservations_position_destination ON reservations USING GIST(position_destination);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires sur la table
COMMENT ON TABLE reservations IS 'Table des réservations de taxi LokoTaxi';
COMMENT ON COLUMN reservations.client_phone IS 'Numéro de téléphone du client (format WhatsApp)';
COMMENT ON COLUMN reservations.vehicle_type IS 'Type de véhicule demandé (moto ou voiture)';
COMMENT ON COLUMN reservations.position_depart IS 'Position GPS du client (format PostGIS)';
COMMENT ON COLUMN reservations.position_destination IS 'Position GPS de la destination (format PostGIS)';
COMMENT ON COLUMN reservations.distance_km IS 'Distance calculée en kilomètres';
COMMENT ON COLUMN reservations.prix_estime IS 'Prix estimé en francs guinéens (GNF)';
COMMENT ON COLUMN reservations.conducteur_id IS 'Référence vers le conducteur assigné';
COMMENT ON COLUMN reservations.status IS 'Statut: pending, accepted, completed, canceled';

-- Exemple d'insertion
-- INSERT INTO reservations (client_phone, vehicle_type, position_depart, status)
-- VALUES ('+224622000111', 'moto', 'POINT(-13.5784 9.6412)', 'pending');

SELECT 'Table reservations créée avec succès' AS status;