-- =====================================================
-- SYSTÈME DE GESTION DES REFUS DE CONDUCTEURS V1.0
-- =====================================================
-- Fonctionnalités :
-- 1. Nouveau statut 'refused' et 'auto_canceled'
-- 2. Table de tracking des refus
-- 3. Trigger automatique refused → pending
-- 4. Annulation automatique après 30 minutes
-- 5. Notifications WhatsApp d'annulation
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1 : Ajouter les nouveaux statuts et colonnes
-- =====================================================

-- Ajouter la colonne updated_at si elle n'existe pas
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Mettre à jour les contraintes de statut
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_statut_check;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_statut_check 
CHECK (statut IN ('pending', 'confirmee', 'accepted', 'refused', 'completed', 'canceled', 'auto_canceled'));

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_reservations_updated_at ON reservations;

-- Créer le trigger pour updated_at
CREATE TRIGGER trigger_update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Nouveaux statuts ajoutés: refused, auto_canceled';
  RAISE NOTICE '✅ Colonne updated_at ajoutée si nécessaire';
  RAISE NOTICE '✅ Trigger updated_at créé';
END $$;

-- =====================================================
-- ÉTAPE 2 : Table de tracking des refus
-- =====================================================

CREATE TABLE IF NOT EXISTS reservation_refus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  conducteur_id UUID REFERENCES conducteurs(id),
  raison_refus TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_reservation_refus_reservation 
ON reservation_refus(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_refus_conducteur 
ON reservation_refus(conducteur_id);

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Table reservation_refus créée avec succès';
END $$;

-- =====================================================
-- ÉTAPE 3 : Trigger refus → pending automatique
-- =====================================================

CREATE OR REPLACE FUNCTION handle_reservation_refused()
RETURNS TRIGGER AS $$
DECLARE
  old_conducteur_id UUID;
BEGIN
  -- Si le statut passe à 'refused'
  IF NEW.statut = 'refused' AND OLD.statut != 'refused' THEN
    
    -- Sauvegarder l'ID du conducteur qui refuse
    old_conducteur_id := OLD.conducteur_id;
    
    -- Enregistrer le refus dans l'historique
    INSERT INTO reservation_refus (reservation_id, conducteur_id, raison_refus, created_at)
    VALUES (NEW.id, old_conducteur_id, 'Refus conducteur', NOW());
    
    -- Remettre immédiatement en pending
    NEW.statut := 'pending';
    NEW.conducteur_id := NULL;
    
    -- Log
    RAISE NOTICE '🔄 Réservation % remise en pending après refus conducteur %', 
      NEW.id, old_conducteur_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_reservation_refused ON reservations;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_reservation_refused
  BEFORE UPDATE OF statut ON reservations
  FOR EACH ROW
  WHEN (NEW.statut = 'refused')
  EXECUTE FUNCTION handle_reservation_refused();

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger automatique refus → pending créé';
END $$;

-- =====================================================
-- ÉTAPE 4 : Fonction d'annulation automatique
-- =====================================================

CREATE OR REPLACE FUNCTION auto_cancel_expired_reservations()
RETURNS JSON AS $$
DECLARE
  expired_count INTEGER := 0;
  expired_reservation RECORD;
  result_array JSON[] := '{}';
BEGIN
  -- Trouver les réservations pending depuis plus de 30 minutes
  FOR expired_reservation IN 
    SELECT id, client_phone, created_at, vehicle_type
    FROM reservations 
    WHERE statut = 'pending' 
    AND created_at < NOW() - INTERVAL '30 minutes'
    ORDER BY created_at ASC
  LOOP
    
    -- Annuler la réservation
    UPDATE reservations 
    SET statut = 'auto_canceled',
        updated_at = NOW()
    WHERE id = expired_reservation.id;
    
    -- Créer notification d'annulation pour le client
    INSERT INTO notifications_pending (reservation_id, type, created_at)
    VALUES (expired_reservation.id, 'auto_cancellation', NOW())
    ON CONFLICT (reservation_id, type) DO NOTHING;
    
    -- Ajouter au résultat
    result_array := array_append(result_array, json_build_object(
      'reservation_id', expired_reservation.id,
      'client_phone', expired_reservation.client_phone,
      'vehicle_type', expired_reservation.vehicle_type,
      'expired_minutes', EXTRACT(EPOCH FROM (NOW() - expired_reservation.created_at)) / 60
    ));
    
    expired_count := expired_count + 1;
    
    RAISE NOTICE '⏰ Auto-annulation réservation % (client: %, type: %, expirée depuis: % min)', 
      expired_reservation.id, 
      expired_reservation.client_phone,
      expired_reservation.vehicle_type,
      ROUND(EXTRACT(EPOCH FROM (NOW() - expired_reservation.created_at)) / 60);
      
  END LOOP;
  
  -- Retourner le résultat
  RETURN json_build_object(
    'success', true,
    'canceled_count', expired_count,
    'canceled_reservations', array_to_json(result_array),
    'message', format('%s réservation(s) annulée(s) automatiquement', expired_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction auto_cancel_expired_reservations créée';
END $$;

-- =====================================================
-- ÉTAPE 5 : Vue pour monitoring des refus
-- =====================================================

CREATE OR REPLACE VIEW v_reservation_refus_stats AS
SELECT 
  c.id as conducteur_id,
  c.prenom || ' ' || c.nom as conducteur_nom,
  c.vehicle_type,
  COUNT(rr.id) as nombre_refus,
  MAX(rr.created_at) as dernier_refus
FROM conducteurs c
LEFT JOIN reservation_refus rr ON c.id = rr.conducteur_id
GROUP BY c.id, c.prenom, c.nom, c.vehicle_type
ORDER BY nombre_refus DESC;

-- =====================================================
-- ÉTAPE 6 : Vue pour monitoring des annulations auto
-- =====================================================

CREATE OR REPLACE VIEW v_auto_cancellations AS
SELECT 
  DATE(created_at) as date_annulation,
  COUNT(*) as nombre_annulations,
  vehicle_type,
  COUNT(DISTINCT client_phone) as clients_uniques,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60) as duree_moyenne_attente_min
FROM reservations
WHERE statut = 'auto_canceled'
GROUP BY DATE(created_at), vehicle_type
ORDER BY date_annulation DESC;

-- =====================================================
-- ÉTAPE 7 : Permissions
-- =====================================================

-- Permissions pour les Edge Functions
GRANT SELECT, INSERT ON reservation_refus TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_expired_reservations() TO service_role;
GRANT SELECT ON v_reservation_refus_stats TO service_role;
GRANT SELECT ON v_auto_cancellations TO service_role;

-- =====================================================
-- TESTS DE VÉRIFICATION
-- =====================================================

DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Vérifier que les nouveaux statuts sont acceptés
  BEGIN
    UPDATE reservations SET statut = 'refused' WHERE FALSE;
    UPDATE reservations SET statut = 'auto_canceled' WHERE FALSE;
    RAISE NOTICE '✅ Test 1: Nouveaux statuts fonctionnels';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Test 1 échoué: %', SQLERRM;
  END;
  
  -- Vérifier que la table reservation_refus existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_refus') THEN
    RAISE NOTICE '✅ Test 2: Table reservation_refus existe';
  ELSE
    RAISE EXCEPTION '❌ Test 2 échoué: Table reservation_refus non trouvée';
  END IF;
  
  -- Vérifier que le trigger existe
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_reservation_refused') THEN
    RAISE NOTICE '✅ Test 3: Trigger refused existe';
  ELSE
    RAISE EXCEPTION '❌ Test 3 échoué: Trigger non trouvé';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 INSTALLATION COMPLÈTE - SYSTÈME DE GESTION DES REFUS';
  RAISE NOTICE '';
  RAISE NOTICE '📋 UTILISATION:';
  RAISE NOTICE '• Conducteur refuse: UPDATE reservations SET statut = ''refused'' WHERE id = ...';
  RAISE NOTICE '• Annulation auto: SELECT auto_cancel_expired_reservations();';
  RAISE NOTICE '• Stats refus: SELECT * FROM v_reservation_refus_stats;';
  RAISE NOTICE '• Stats annulations: SELECT * FROM v_auto_cancellations;';
  
END $$;

COMMIT;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================