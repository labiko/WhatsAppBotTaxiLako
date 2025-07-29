-- =====================================================
-- FICHIER 2 : SYSTÈME DE TRIGGERS POUR NOTIFICATIONS
-- =====================================================
-- Description : Ce fichier crée les triggers qui 
-- détectent automatiquement les changements de statut
-- et créent les notifications appropriées
-- =====================================================

-- Fonction principale du trigger
CREATE OR REPLACE FUNCTION notify_on_reservation_status_change()
RETURNS trigger AS $$
DECLARE
  v_notification_type text;
  v_client_phone text;
BEGIN
  -- Déterminer le type de notification selon le changement
  
  -- CAS 1 : Réservation acceptée par un conducteur
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    v_notification_type := 'reservation_accepted';
    
    -- Créer la notification
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, v_notification_type)
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    -- Log pour debug
    RAISE NOTICE '📢 Notification créée : Réservation % acceptée par conducteur %', 
      NEW.id, NEW.conducteur_id;
    
    -- Récupérer le téléphone pour le log
    SELECT client_phone INTO v_client_phone FROM reservations WHERE id = NEW.id;
    RAISE NOTICE '📱 Client à notifier : %', v_client_phone;
  END IF;
  
  -- CAS 2 : Conducteur arrivé (future extension)
  -- IF OLD.statut = 'accepted' AND NEW.statut = 'driver_arrived' THEN
  --   INSERT INTO notifications_pending (reservation_id, type)
  --   VALUES (NEW.id, 'driver_arrived')
  --   ON CONFLICT DO NOTHING;
  -- END IF;
  
  -- CAS 3 : Course terminée (future extension)
  -- IF OLD.statut IN ('accepted', 'driver_arrived') AND NEW.statut = 'completed' THEN
  --   INSERT INTO notifications_pending (reservation_id, type)
  --   VALUES (NEW.id, 'trip_completed')
  --   ON CONFLICT DO NOTHING;
  -- END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer la mise à jour
    RAISE WARNING 'Erreur création notification : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_reservation_status_change ON reservations;

-- Créer le trigger principal
CREATE TRIGGER trigger_reservation_status_change
  AFTER UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION notify_on_reservation_status_change();

-- Fonction pour nettoyer les vieilles notifications traitées
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  -- Supprimer les notifications traitées il y a plus de 7 jours
  DELETE FROM notifications_pending 
  WHERE processed_at IS NOT NULL 
    AND processed_at < now() - INTERVAL '7 days';
    
  RAISE NOTICE 'Nettoyage : % notifications supprimées', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON FUNCTION notify_on_reservation_status_change() IS 
  'Fonction trigger qui crée automatiquement des notifications lors des changements de statut de réservation';

COMMENT ON TRIGGER trigger_reservation_status_change ON reservations IS 
  'Trigger qui surveille les changements de statut des réservations et crée les notifications appropriées';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_reservation_status_change'
  ) THEN
    RAISE NOTICE '✅ Trigger de notification créé avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Trigger non créé';
  END IF;
END $$;