-- =====================================================
-- FICHIER 7 : SOLUTION TRIGGER AVEC NOTIFY
-- =====================================================
-- Solution alternative sans HTTP - utilise NOTIFY
-- qui sera écouté par l'Edge Function
-- =====================================================

-- Supprimer l'ancien trigger HTTP
DROP TRIGGER IF EXISTS trigger_reservation_accepted_http ON reservations;

-- Créer une fonction simple qui utilise NOTIFY
CREATE OR REPLACE FUNCTION notify_reservation_accepted_simple()
RETURNS trigger AS $$
BEGIN
  -- Vérifier que la réservation passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Créer la notification dans la table
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, 'reservation_accepted')
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    -- Notifier via PostgreSQL NOTIFY (sera écouté par l'Edge Function)
    PERFORM pg_notify('reservation_accepted', NEW.id::text);
    
    RAISE NOTICE '📢 Notification créée et envoyée pour réservation %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_reservation_notify
  AFTER UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (OLD.statut = 'pending' AND NEW.statut = 'accepted')
  EXECUTE FUNCTION notify_reservation_accepted_simple();

-- Fonction pour traiter manuellement une notification
CREATE OR REPLACE FUNCTION process_pending_notification(p_reservation_id UUID)
RETURNS text AS $$
DECLARE
  v_result text;
BEGIN
  -- Appeler la fonction Edge via pg_notify
  PERFORM pg_notify('manual_process', p_reservation_id::text);
  
  v_result := 'Notification envoyée pour traitement: ' || p_reservation_id;
  RAISE NOTICE '%', v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_reservation_notify'
  ) THEN
    RAISE NOTICE '✅ Trigger NOTIFY créé avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Trigger NOTIFY non créé';
  END IF;
END $$;

-- Test manuel pour la dernière réservation acceptée
SELECT process_pending_notification('1ee5a869-9205-49db-922f-860073117d20'::UUID);