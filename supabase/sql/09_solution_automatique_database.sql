-- =====================================================
-- SOLUTION AUTOMATIQUE CÔTÉ BASE DE DONNÉES
-- =====================================================
-- Utilise PostgreSQL LISTEN/NOTIFY + fonction RPC
-- Pas besoin d'extension HTTP externe
-- =====================================================

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trigger_reservation_accepted_http ON reservations;
DROP TRIGGER IF EXISTS trigger_reservation_notify ON reservations;
DROP TRIGGER IF EXISTS trigger_reservation_status_change ON reservations;
DROP TRIGGER IF EXISTS trigger_reservation_auto_notify ON reservations;

-- =====================================================
-- ÉTAPE 1 : Fonction de notification simple
-- =====================================================

CREATE OR REPLACE FUNCTION notify_whatsapp_on_accepted()
RETURNS trigger AS $$
BEGIN
  -- Vérifier que la réservation passe de 'pending' à 'accepted'
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Créer la notification en base pour traçabilité
    INSERT INTO notifications_pending (reservation_id, type, created_at)
    VALUES (NEW.id, 'reservation_accepted', now())
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    -- Notifier via PostgreSQL NOTIFY (sera capturé par l'Edge Function)
    PERFORM pg_notify('whatsapp_notification', json_build_object(
      'action', 'send_driver_info',
      'reservation_id', NEW.id,
      'client_phone', NEW.client_phone,
      'conducteur_id', NEW.conducteur_id
    )::text);
    
    RAISE NOTICE '📢 Notification WhatsApp créée pour réservation % (client: %)', NEW.id, NEW.client_phone;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 2 : Trigger automatique
-- =====================================================

CREATE TRIGGER trigger_whatsapp_auto
  AFTER UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (OLD.statut = 'pending' AND NEW.statut = 'accepted')
  EXECUTE FUNCTION notify_whatsapp_on_accepted();

-- =====================================================
-- ÉTAPE 3 : Fonction RPC pour traitement manuel
-- =====================================================

CREATE OR REPLACE FUNCTION process_whatsapp_notifications()
RETURNS json AS $$
DECLARE
  notification_record RECORD;
  processed_count INTEGER := 0;
  result_array json[] := '{}';
BEGIN
  -- Traiter toutes les notifications en attente
  FOR notification_record IN 
    SELECT id, reservation_id, type, created_at
    FROM notifications_pending 
    WHERE processed_at IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Marquer comme traitée immédiatement
    UPDATE notifications_pending 
    SET processed_at = now()
    WHERE id = notification_record.id;
    
    -- Ajouter au résultat
    result_array := array_append(result_array, json_build_object(
      'notification_id', notification_record.id,
      'reservation_id', notification_record.reservation_id,
      'status', 'processed'
    ));
    
    processed_count := processed_count + 1;
  END LOOP;
  
  -- Retourner le résultat
  RETURN json_build_object(
    'success', true,
    'processed_count', processed_count,
    'notifications', array_to_json(result_array),
    'message', format('✅ %s notification(s) WhatsApp traitée(s)', processed_count)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 4 : Fonction pour déclencher un envoi immédiat
-- =====================================================

CREATE OR REPLACE FUNCTION send_whatsapp_immediate(p_reservation_id UUID)
RETURNS json AS $$
DECLARE
  reservation_data RECORD;
  conducteur_data RECORD;
  notification_id UUID;
BEGIN
  -- Récupérer les données de la réservation
  SELECT * INTO reservation_data
  FROM reservations 
  WHERE id = p_reservation_id AND statut = 'accepted';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Réservation non trouvée ou pas en statut accepted'
    );
  END IF;
  
  -- Récupérer les données du conducteur
  SELECT * INTO conducteur_data
  FROM conducteurs 
  WHERE id = reservation_data.conducteur_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Conducteur non trouvé'
    );
  END IF;
  
  -- Créer une notification immédiate
  INSERT INTO notifications_pending (reservation_id, type, created_at)
  VALUES (p_reservation_id, 'reservation_accepted', now())
  ON CONFLICT (reservation_id, type) DO UPDATE SET created_at = now()
  RETURNING id INTO notification_id;
  
  -- Notifier immédiatement
  PERFORM pg_notify('whatsapp_urgent', json_build_object(
    'action', 'send_immediate',
    'reservation_id', p_reservation_id,
    'client_phone', reservation_data.client_phone,
    'conducteur_nom', conducteur_data.prenom || ' ' || conducteur_data.nom,
    'conducteur_phone', conducteur_data.telephone,
    'vehicle_info', conducteur_data.vehicle_couleur || ' ' || conducteur_data.vehicle_marque || ' ' || conducteur_data.vehicle_modele,
    'vehicle_plaque', conducteur_data.vehicle_plaque,
    'notification_id', notification_id
  )::text);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Notification WhatsApp déclenchée immédiatement',
    'reservation_id', p_reservation_id,
    'client_phone', reservation_data.client_phone,
    'notification_id', notification_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 5 : Vue pour monitoring
-- =====================================================

CREATE OR REPLACE VIEW v_whatsapp_status AS
SELECT 
  r.id as reservation_id,
  r.client_phone,
  r.statut,
  c.prenom || ' ' || c.nom as conducteur_nom,
  c.telephone as conducteur_phone,
  n.id as notification_id,
  n.type as notification_type,
  n.created_at as notification_created,
  n.processed_at as notification_processed,
  CASE 
    WHEN n.processed_at IS NOT NULL THEN '✅ WhatsApp envoyé'
    WHEN n.id IS NOT NULL THEN '⏳ En attente d''envoi'
    WHEN r.statut = 'accepted' THEN '❌ Notification manquante'
    ELSE '📋 Pas encore accepté'
  END as whatsapp_status
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN notifications_pending n ON r.id = n.reservation_id AND n.type = 'reservation_accepted'
WHERE r.created_at >= now() - interval '24 hours'
ORDER BY r.created_at DESC;

-- =====================================================
-- VÉRIFICATIONS ET TESTS
-- =====================================================

-- Vérifier que le trigger est créé
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_whatsapp_auto'
  ) THEN
    RAISE NOTICE '✅ Trigger automatique WhatsApp créé avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Trigger WhatsApp non créé';
  END IF;
END $$;

-- Afficher les instructions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SOLUTION AUTOMATIQUE CÔTÉ BASE INSTALLÉE ===';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FONCTIONNEMENT AUTOMATIQUE :';
  RAISE NOTICE '1. Conducteur accepte → App met statut = "accepted"';
  RAISE NOTICE '2. Trigger PostgreSQL → Crée notification automatiquement';
  RAISE NOTICE '3. Edge Function → Traite les notifications en attente';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 COMMANDES UTILES :';
  RAISE NOTICE '• Traitement manuel : SELECT process_whatsapp_notifications();';
  RAISE NOTICE '• Envoi immédiat : SELECT send_whatsapp_immediate(''uuid-reservation'');';
  RAISE NOTICE '• Monitoring : SELECT * FROM v_whatsapp_status;';
  RAISE NOTICE '';
  RAISE NOTICE '📱 DANS L''EDGE FUNCTION, AJOUTEZ :';
  RAISE NOTICE '• Endpoint : ?action=process-all pour traiter les notifications';
  RAISE NOTICE '• Ou commande "notifications" dans le bot WhatsApp';
  RAISE NOTICE '';
END $$;