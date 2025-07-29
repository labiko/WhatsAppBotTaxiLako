-- Créer une table pour stocker les notifications à envoyer
CREATE TABLE IF NOT EXISTS notifications_pending (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  type text NOT NULL DEFAULT 'reservation_accepted',
  created_at timestamp DEFAULT now(),
  processed_at timestamp,
  UNIQUE(reservation_id, type)
);

-- Fonction trigger simplifiée qui insère dans la table notifications
CREATE OR REPLACE FUNCTION create_notification_on_accepted()
RETURNS trigger AS $$
BEGIN
  -- Quand une réservation passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    -- Insérer une notification en attente
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, 'reservation_accepted')
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    RAISE NOTICE 'Notification créée pour réservation %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_create_notification ON reservations;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_create_notification
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_accepted();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_pending_processed 
ON notifications_pending(processed_at) 
WHERE processed_at IS NULL;