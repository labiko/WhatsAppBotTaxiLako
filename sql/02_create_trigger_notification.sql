-- =====================================================
-- SCRIPT 2 : CRÉATION DU TRIGGER DE NOTIFICATION
-- =====================================================
-- Ce script crée un trigger qui détecte automatiquement
-- quand une réservation passe de 'pending' à 'accepted'
-- et crée une notification à envoyer
-- =====================================================

-- Fonction qui sera appelée par le trigger
CREATE OR REPLACE FUNCTION create_notification_on_accepted()
RETURNS trigger AS $$
BEGIN
  -- Vérifier que :
  -- 1. L'ancien statut était 'pending'
  -- 2. Le nouveau statut est 'accepted'
  -- 3. Un conducteur a été assigné
  IF OLD.statut = 'pending' AND NEW.statut = 'accepted' AND NEW.conducteur_id IS NOT NULL THEN
    
    -- Insérer une notification en attente
    INSERT INTO notifications_pending (reservation_id, type)
    VALUES (NEW.id, 'reservation_accepted')
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    -- Logger l'action pour debug
    RAISE NOTICE 'Notification créée pour réservation % acceptée par conducteur %', NEW.id, NEW.conducteur_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_create_notification ON reservations;

-- Créer le trigger sur la table reservations
CREATE TRIGGER trigger_create_notification
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_accepted();

-- Ajouter des commentaires
COMMENT ON FUNCTION create_notification_on_accepted() IS 'Crée une notification quand une réservation est acceptée';
COMMENT ON TRIGGER trigger_create_notification ON reservations IS 'Détecte les changements de statut pending vers accepted';

-- Vérifier que le trigger a été créé
SELECT 
  'Trigger créé avec succès' as message,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'trigger_create_notification';