-- Mise à jour de la table reservations pour gérer destination et prix
-- Ajoute les champs nécessaires pour stocker la destination et le prix total

-- Ajouter les nouvelles colonnes
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS destination_nom VARCHAR(200);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES adresses(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS position_arrivee GEOGRAPHY(Point, 4326);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS prix_total DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS prix_par_km DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tarif_applique VARCHAR(100);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_reservations_destination_id ON reservations(destination_id);

-- Vue pour faciliter l'accès aux réservations avec toutes les infos
CREATE OR REPLACE VIEW reservations_detaillees AS
SELECT 
  r.*,
  c.nom as conducteur_nom,
  c.prenom as conducteur_prenom,
  c.telephone as conducteur_telephone,
  c.vehicle_marque,
  c.vehicle_modele,
  c.vehicle_couleur,
  c.vehicle_plaque,
  c.note_moyenne as conducteur_note,
  a.nom as destination_nom_complet,
  a.adresse_complete as destination_adresse,
  ST_X(r.position_depart::geometry) as depart_longitude,
  ST_Y(r.position_depart::geometry) as depart_latitude,
  ST_X(r.position_arrivee::geometry) as arrivee_longitude,
  ST_Y(r.position_arrivee::geometry) as arrivee_latitude
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN adresses a ON r.destination_id = a.id
ORDER BY r.created_at DESC;