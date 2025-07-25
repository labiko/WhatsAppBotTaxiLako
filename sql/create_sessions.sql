-- Table des sessions pour stocker l'état des conversations WhatsApp
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone TEXT NOT NULL UNIQUE, -- Numéro WhatsApp du client
  vehicle_type TEXT CHECK (vehicle_type IN ('moto', 'voiture')),
  position_client GEOGRAPHY(Point, 4326), -- Position GPS du client
  destination_nom TEXT, -- Nom de la destination choisie
  destination_id UUID, -- ID de la destination dans la table adresses
  destination_position GEOGRAPHY(Point, 4326), -- Position GPS de la destination
  distance_km DECIMAL(10,2), -- Distance calculée en kilomètres
  prix_estime INTEGER, -- Prix estimé en GNF
  prix_confirme BOOLEAN DEFAULT FALSE, -- Si le client a confirmé le prix
  conducteur_id UUID, -- ID du conducteur assigné
  etat TEXT CHECK (etat IN ('attente_vehicule', 'vehicule_choisi', 'position_recue', 'prix_calcule', 'conducteur_assigne')) DEFAULT 'attente_vehicule',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours') -- Session expire après 2h
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_sessions_client_phone ON sessions(client_phone);
CREATE INDEX IF NOT EXISTS idx_sessions_etat ON sessions(etat);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_conducteur_id ON sessions(conducteur_id);

-- Index spatial pour les positions géographiques
CREATE INDEX IF NOT EXISTS idx_sessions_position_client ON sessions USING GIST(position_client);
CREATE INDEX IF NOT EXISTS idx_sessions_position_destination ON sessions USING GIST(position_destination);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commentaires sur la table
COMMENT ON TABLE sessions IS 'Sessions des conversations WhatsApp avec états de réservation';
COMMENT ON COLUMN sessions.client_phone IS 'Numéro WhatsApp normalisé (format +33...)';
COMMENT ON COLUMN sessions.etat IS 'État de la conversation: attente_vehicule, vehicule_choisi, position_recue, prix_calcule, conducteur_assigne';
COMMENT ON COLUMN sessions.expires_at IS 'Date d expiration de la session (2h après création)';

SELECT 'Table sessions créée avec succès' AS status;