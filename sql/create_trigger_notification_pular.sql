-- ================================================================
-- TRIGGER NOTIFICATION RÉSERVATION ACCEPTÉE - BOT PULAR
-- ================================================================
-- Trigger qui notifie le client Pular quand un conducteur accepte sa réservation

-- 1. Fonction de notification Pular
CREATE OR REPLACE FUNCTION notify_pular_client_on_accepted()
RETURNS TRIGGER AS $$
DECLARE
  conducteur_info RECORD;
  client_phone text;
  message_text text;
  webhook_url text := 'https://nmwnibzgvwltipmtwhzo.functions.supabase.co/whatsapp-bot?action=notify-accepted';
BEGIN
  -- Vérifier si c'est un changement vers 'accepted'
  IF NEW.statut = 'accepted' AND (OLD.statut IS NULL OR OLD.statut != 'accepted') THEN
    
    -- Récupérer les informations du conducteur
    SELECT 
      prenom, 
      nom, 
      telephone,
      vehicle_marque,
      vehicle_modele,
      vehicle_couleur,
      vehicle_plaque
    INTO conducteur_info
    FROM conducteurs 
    WHERE id = NEW.conducteur_id;
    
    -- Récupérer le numéro client
    client_phone := NEW.client_phone;
    
    -- Construire le message de notification
    message_text := format(
      '🎉 **CONDUCTEUR TROUVÉ !** ✅

👤 **VOTRE CONDUCTEUR:**
🧑‍💼 %s %s
📱 %s
🚗 %s %s %s
🔢 Plaque: %s

📍 **VOTRE RÉSERVATION:**
🚗 Type: %s
📍 Destination: %s
💰 Prix: %s GNF

✅ **PROCHAINES ÉTAPES:**
• Votre conducteur va vous contacter
• Préparez-vous pour le rendez-vous
• Ayez la somme exacte si possible

🙏 **Njarama** ! Bon voyage !',
      COALESCE(conducteur_info.prenom, 'Conducteur'),
      COALESCE(conducteur_info.nom, ''),
      COALESCE(conducteur_info.telephone, 'Non renseigné'),
      COALESCE(conducteur_info.vehicle_marque, ''),
      COALESCE(conducteur_info.vehicle_modele, ''),
      COALESCE(conducteur_info.vehicle_couleur, ''),
      COALESCE(conducteur_info.vehicle_plaque, 'Non renseignée'),
      COALESCE(NEW.vehicle_type, 'taxi'),
      COALESCE(NEW.destination_nom, 'Non précisée'),
      COALESCE(NEW.prix_estime::text, 'À définir')
    );

    -- Utiliser le même système que le bot principal
    PERFORM http((
      'POST',
      webhook_url,
      ARRAY[http_header('Content-Type', 'application/json'), http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U')],
      'application/json',
      json_build_object(
        'reservationId', NEW.id::text
      )::text
    )::http_request);

    -- Log pour debugging
    INSERT INTO notifications (
      type, 
      recipient, 
      message, 
      reservation_id,
      statut
    ) VALUES (
      'reservation_accepted_pular',
      client_phone,
      message_text,
      NEW.id,
      'sent'
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Créer le trigger
DROP TRIGGER IF EXISTS trigger_notify_pular_accepted ON reservations;

CREATE TRIGGER trigger_notify_pular_accepted
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_pular_client_on_accepted();

-- 3. Vérification
SELECT 'Trigger notification Pular créé avec succès' as result;