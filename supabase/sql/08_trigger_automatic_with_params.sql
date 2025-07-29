-- =====================================================
-- FICHIER 8 : TRIGGER AUTOMATIQUE AVEC PARAMÈTRES URL
-- =====================================================
-- Solution qui utilise les paramètres URL (?action=notify-accepted)
-- que nous avons ajoutés dans l'Edge Function
-- =====================================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_reservation_accepted_http ON reservations;
DROP TRIGGER IF EXISTS trigger_reservation_notify ON reservations;
DROP TRIGGER IF EXISTS trigger_reservation_status_change ON reservations;

-- Créer la fonction qui appelle l'Edge Function avec paramètres URL
CREATE OR REPLACE FUNCTION notify_reservation_accepted_auto()
RETURNS trigger AS $$
DECLARE
  v_notification_id UUID;
  v_response_status INTEGER;
  v_response_body TEXT;
BEGIN
  -- Vérifier que la réservation passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Créer la notification (pour traçabilité)
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, 'reservation_accepted')
    ON CONFLICT (reservation_id, type) DO NOTHING
    RETURNING id INTO v_notification_id;
    
    -- Appeler l'Edge Function avec paramètres URL
    BEGIN
      SELECT status, content INTO v_response_status, v_response_body
      FROM http_post(
        'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=notify-accepted',
        jsonb_build_object('reservationId', NEW.id::text),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'
        )
      );
      
      -- Marquer la notification comme traitée si succès
      IF v_response_status BETWEEN 200 AND 299 THEN
        UPDATE notifications_pending 
        SET processed_at = now() 
        WHERE id = v_notification_id;
        
        RAISE NOTICE '✅ WhatsApp envoyé automatiquement pour réservation % (HTTP %)', NEW.id, v_response_status;
      ELSE
        RAISE WARNING '⚠️ Échec envoi WhatsApp automatique (HTTP %) pour réservation %: %', v_response_status, NEW.id, v_response_body;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Erreur appel Edge Function pour réservation %: %', NEW.id, SQLERRM;
        
        -- En cas d'erreur, on peut essayer un fallback
        RAISE NOTICE '🔄 Notification créée en attente pour traitement manuel: %', v_notification_id;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger automatique
CREATE TRIGGER trigger_reservation_auto_notify
  AFTER UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (OLD.statut = 'pending' AND NEW.statut = 'accepted')
  EXECUTE FUNCTION notify_reservation_accepted_auto();

-- Commentaires
COMMENT ON FUNCTION notify_reservation_accepted_auto() IS 
  'Trigger automatique qui envoie un WhatsApp au client quand une réservation est acceptée';

COMMENT ON TRIGGER trigger_reservation_auto_notify ON reservations IS 
  'Déclenche automatiquement l''envoi WhatsApp quand statut passe de pending à accepted';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_reservation_auto_notify'
  ) THEN
    RAISE NOTICE '✅ Trigger automatique créé avec succès';
    RAISE NOTICE '🎯 Désormais: Conducteur accepte → WhatsApp envoyé automatiquement';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Trigger automatique non créé';
  END IF;
END $$;

-- Instructions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SYSTÈME AUTOMATIQUE INSTALLÉ ===';
  RAISE NOTICE '1. Conducteur accepte réservation dans l''app';
  RAISE NOTICE '2. App met à jour: statut = "accepted"';  
  RAISE NOTICE '3. Trigger PostgreSQL se déclenche automatiquement';
  RAISE NOTICE '4. Edge Function appelée avec ?action=notify-accepted';
  RAISE NOTICE '5. WhatsApp envoyé immédiatement au client';
  RAISE NOTICE '🎉 AUCUNE INTERVENTION MANUELLE REQUISE !';
  RAISE NOTICE '';
END $$;