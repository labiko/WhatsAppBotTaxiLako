-- Activer l'extension HTTP si pas déjà fait
CREATE EXTENSION IF NOT EXISTS http;

-- Fonction qui sera appelée quand une réservation passe en statut 'accepted'
CREATE OR REPLACE FUNCTION notify_client_on_reservation_accepted()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  headers jsonb;
  url text;
BEGIN
  -- Vérifier que le statut passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Construire l'URL de la Edge Function
    url := 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/notify-accepted';
    
    -- Construire le payload
    payload := jsonb_build_object(
      'reservationId', NEW.id::text
    );
    
    -- Construire les headers (utiliser la clé anon)
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'
    );
    
    -- Appeler la Edge Function de manière asynchrone
    PERFORM net.http_post(
      url := url,
      body := payload,
      headers := headers
    );
    
    -- Logger l'action
    RAISE NOTICE 'Notification envoyée pour réservation % acceptée par conducteur %', NEW.id, NEW.conducteur_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_reservation_accepted ON reservations;

-- Créer le trigger
CREATE TRIGGER trigger_reservation_accepted
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION notify_client_on_reservation_accepted();

-- Commenter pour voir que le trigger est bien créé
COMMENT ON TRIGGER trigger_reservation_accepted ON reservations IS 'Envoie une notification WhatsApp au client quand une réservation passe de pending à accepted';