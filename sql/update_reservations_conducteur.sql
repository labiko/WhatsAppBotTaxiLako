-- Mise à jour de la table reservations pour lier aux conducteurs
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS conducteur_id UUID,
ADD CONSTRAINT fk_reservations_conducteur 
  FOREIGN KEY (conducteur_id) 
  REFERENCES conducteurs(id) 
  ON DELETE SET NULL;

-- Index pour optimiser les recherches par conducteur
CREATE INDEX IF NOT EXISTS idx_reservations_conducteur_id ON reservations (conducteur_id);

-- Vue complète des réservations avec informations conducteur
CREATE OR REPLACE VIEW reservations_completes AS
SELECT 
  r.id,
  r.client_phone,
  r.vehicle_type,
  r.pickup_location,
  r.status,
  r.created_at,
  c.nom as conducteur_nom,
  c.prenom as conducteur_prenom,
  c.telephone as conducteur_telephone,
  CONCAT(c.vehicle_marque, ' ', c.vehicle_modele, ' ', c.vehicle_couleur) as vehicule_info,
  c.vehicle_plaque,
  c.note_moyenne as conducteur_note
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
ORDER BY r.created_at DESC;