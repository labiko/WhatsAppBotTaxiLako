-- Activer l'extension pg_cron si disponible
-- Note: pg_cron n'est disponible que sur Supabase Pro
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Si pg_cron est disponible, créer un job qui appelle l'endpoint toutes les 30 secondes
/*
SELECT cron.schedule(
  'process-whatsapp-notifications',
  '30 seconds',
  $$
  SELECT net.http_post(
    'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications',
    jsonb_build_object(),
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'
    )
  );
  $$
);
*/

-- Alternative : Créer une fonction qui peut être appelée manuellement ou via un service externe
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS void AS $$
DECLARE
  notif RECORD;
BEGIN
  -- Parcourir toutes les notifications non traitées
  FOR notif IN 
    SELECT * FROM notifications_pending 
    WHERE processed_at IS NULL 
    ORDER BY created_at ASC
  LOOP
    -- Marquer comme traitée (pour éviter les doublons)
    UPDATE notifications_pending 
    SET processed_at = now() 
    WHERE id = notif.id;
    
    -- Log pour debug
    RAISE NOTICE 'Notification % traitée pour réservation %', notif.id, notif.reservation_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Créer une vue pour faciliter le monitoring
CREATE OR REPLACE VIEW v_notifications_status AS
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_count,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
  MIN(created_at) FILTER (WHERE processed_at IS NULL) as oldest_pending,
  MAX(processed_at) as last_processed
FROM notifications_pending;