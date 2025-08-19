-- =====================================================
-- 🔧 CORRECTION SIMPLE - URL TRIGGER NOTIFICATION
-- =====================================================
-- 
-- PROBLÈME : Trigger appelle URL incorrecte /notify-accepted
-- SOLUTION : Corriger vers URL qui fonctionne ?action=notify-accepted
-- SIMPLE : Juste changer l'URL, pas toucher au handler
--
-- =====================================================

-- Fonction corrigée avec bonne URL
CREATE OR REPLACE FUNCTION notify_client_on_reservation_accepted()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  headers jsonb;
  url text;
BEGIN
  -- ✅ Support réservations planifiées ET immédiates
  IF OLD.statut IN ('pending', 'scheduled') AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- ✅ URL CORRIGÉE : ?action=notify-accepted (comme app C#)
    url := 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=notify-accepted';
    
    -- Construire le payload
    payload := jsonb_build_object(
      'reservationId', NEW.id::text
    );
    
    -- Construire les headers (utiliser la clé anon)
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'
    );
    
    -- Appeler la Edge Function avec bonne URL
    PERFORM net.http_post(
      url := url,
      body := payload,
      headers := headers
    );
    
    -- Logger l'action avec URL corrigée
    RAISE NOTICE 'Notification envoyée via URL corrigée pour réservation % (statut: % → %) acceptée par conducteur %', 
      NEW.id, OLD.statut, NEW.statut, NEW.conducteur_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger (même nom)
DROP TRIGGER IF EXISTS trigger_reservation_accepted ON reservations;
CREATE TRIGGER trigger_reservation_accepted
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION notify_client_on_reservation_accepted();

-- 📊 RAPPORT
SELECT '🎯 URL TRIGGER CORRIGÉE - UTILISE MÊME ENDPOINT QUE APP C#' as status;
SELECT '✅ Maintenant trigger et app C# utilisent: ?action=notify-accepted' as correction;