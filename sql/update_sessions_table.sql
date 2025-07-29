-- Mise à jour de la table sessions pour gérer le nouveau flux
-- Ajoute les champs nécessaires pour stocker position, destination et prix

-- Ajouter les nouvelles colonnes à la table sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS position_client GEOGRAPHY(Point, 4326);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS destination_nom VARCHAR(200);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES adresses(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS destination_position GEOGRAPHY(Point, 4326);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prix_estime DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prix_confirme BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS etat VARCHAR(50) DEFAULT 'initial';
-- etats possibles: initial, vehicule_choisi, position_recue, destination_saisie, prix_calcule, confirme

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sessions_etat ON sessions(etat);

-- Mise à jour de la contrainte pour inclure les nouveaux états
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_etat_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_etat_check 
CHECK (etat IN ('initial', 'vehicule_choisi', 'position_recue', 'destination_saisie', 'prix_calcule', 'confirme'));

-- Vue pour faciliter l'accès aux sessions avec toutes les infos
CREATE OR REPLACE VIEW sessions_completes AS
SELECT 
  s.*,
  ST_X(s.position_client::geometry) as client_longitude,
  ST_Y(s.position_client::geometry) as client_latitude,
  ST_X(s.destination_position::geometry) as destination_longitude,
  ST_Y(s.destination_position::geometry) as destination_latitude,
  a.nom as destination_nom_complet,
  a.adresse_complete as destination_adresse
FROM sessions s
LEFT JOIN adresses a ON s.destination_id = a.id
WHERE s.expires_at > NOW();