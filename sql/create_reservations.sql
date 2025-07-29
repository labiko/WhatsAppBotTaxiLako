-- Active l'extension uuid si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Active l'extension PostGIS pour gérer les données géographiques
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Création de la table reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL,
  vehicle_type text CHECK (vehicle_type IN ('moto', 'voiture')),
  pickup_location geography(Point, 4326),
  status text CHECK (status IN ('pending', 'accepted', 'completed', 'canceled')) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_reservations_client_phone ON reservations(client_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);

-- Commentaires sur les colonnes pour documentation
COMMENT ON TABLE reservations IS 'Table pour stocker les réservations de taxi/moto';
COMMENT ON COLUMN reservations.id IS 'Identifiant unique de la réservation';
COMMENT ON COLUMN reservations.client_phone IS 'Numéro WhatsApp du client (format: +224XXXXXXXXX)';
COMMENT ON COLUMN reservations.vehicle_type IS 'Type de véhicule demandé: moto ou voiture';
COMMENT ON COLUMN reservations.pickup_location IS 'Coordonnées GPS du point de prise en charge';
COMMENT ON COLUMN reservations.status IS 'Statut de la réservation: pending, accepted, completed, canceled';
COMMENT ON COLUMN reservations.created_at IS 'Date et heure de création de la réservation';