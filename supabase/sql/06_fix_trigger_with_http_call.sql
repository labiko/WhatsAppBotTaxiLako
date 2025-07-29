-- =====================================================
-- FICHIER 6 : CORRECTION DU TRIGGER AVEC APPEL HTTP
-- =====================================================
-- Ce script corrige le trigger pour qu'il appelle
-- directement l'Edge Function via HTTP
-- =====================================================

-- Activer l'extension HTTP si pas déjà fait
CREATE EXTENSION IF NOT EXISTS http;

-- Nouvelle fonction qui appelle directement l'Edge Function
CREATE OR REPLACE FUNCTION notify_on_reservation_accepted_with_http()
RETURNS trigger AS $$
DECLARE
  v_notification_id UUID;
  v_response_status INTEGER;
BEGIN
  -- Vérifier que la réservation passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Créer la notification (pour traçabilité)
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, 'reservation_accepted')
    ON CONFLICT (reservation_id, type) DO NOTHING
    RETURNING id INTO v_notification_id;
    
    -- Appeler directement l'Edge Function
    BEGIN
      SELECT status INTO v_response_status
      FROM http_post(
        'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/send-notification',
        jsonb_build_object('reservationId', NEW.id::text),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'
        )
      );
      
      -- Marquer la notification comme traitée si succès
      IF v_response_status BETWEEN 200 AND 299 THEN
        UPDATE notifications_pending 
        SET processed_at = now() 
        WHERE id = v_notification_id;
        
        RAISE NOTICE '✅ Notification envoyée avec succès pour réservation %', NEW.id;
      ELSE
        RAISE WARNING '⚠️ Échec envoi notification (HTTP %): réservation %', v_response_status, NEW.id;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Erreur appel HTTP pour réservation %: %', NEW.id, SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trigger_reservation_status_change ON reservations;

-- Créer le nouveau trigger avec appel HTTP
CREATE TRIGGER trigger_reservation_accepted_http
  AFTER UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (OLD.statut = 'pending' AND NEW.statut = 'accepted')
  EXECUTE FUNCTION notify_on_reservation_accepted_with_http();

-- Commentaires
COMMENT ON FUNCTION notify_on_reservation_accepted_with_http() IS 
  'Trigger qui appelle directement l''Edge Function via HTTP quand une réservation est acceptée';

COMMENT ON TRIGGER trigger_reservation_accepted_http ON reservations IS 
  'Trigger qui envoie automatiquement un WhatsApp quand une réservation passe en statut accepted';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_reservation_accepted_http'
  ) THEN
    RAISE NOTICE '✅ Nouveau trigger HTTP créé avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Trigger HTTP non créé';
  END IF;
END $$;