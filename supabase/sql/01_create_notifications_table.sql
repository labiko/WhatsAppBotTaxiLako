-- =====================================================
-- FICHIER 1 : CRÉATION DE LA TABLE NOTIFICATIONS
-- =====================================================
-- Description : Ce fichier crée la table qui stockera
-- les notifications WhatsApp en attente d'envoi
-- =====================================================

-- Supprimer la table si elle existe (pour tests)
-- DROP TABLE IF EXISTS notifications_pending CASCADE;

-- Créer la table des notifications
CREATE TABLE IF NOT EXISTS notifications_pending (
  -- Identifiant unique de la notification
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Référence vers la réservation
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Type de notification (pour futures extensions)
  type text NOT NULL DEFAULT 'reservation_accepted'
    CHECK (type IN ('reservation_accepted', 'driver_arrived', 'trip_completed')),
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  
  -- Éviter les doublons
  UNIQUE(reservation_id, type)
);

-- Index pour optimiser les requêtes sur les notifications non traitées
CREATE INDEX IF NOT EXISTS idx_notifications_pending_unprocessed 
  ON notifications_pending(created_at) 
  WHERE processed_at IS NULL;

-- Index pour les requêtes par réservation
CREATE INDEX IF NOT EXISTS idx_notifications_reservation 
  ON notifications_pending(reservation_id);

-- Commentaires pour documentation
COMMENT ON TABLE notifications_pending IS 
  'Table des notifications WhatsApp en attente d''envoi aux clients';

COMMENT ON COLUMN notifications_pending.id IS 
  'Identifiant unique de la notification';

COMMENT ON COLUMN notifications_pending.reservation_id IS 
  'ID de la réservation concernée par cette notification';

COMMENT ON COLUMN notifications_pending.type IS 
  'Type de notification : reservation_accepted (acceptation), driver_arrived (arrivée), trip_completed (fin)';

COMMENT ON COLUMN notifications_pending.created_at IS 
  'Date/heure de création de la notification';

COMMENT ON COLUMN notifications_pending.processed_at IS 
  'Date/heure de traitement (NULL = non traité, en attente)';

-- Politique de sécurité RLS (Row Level Security)
ALTER TABLE notifications_pending ENABLE ROW LEVEL SECURITY;

-- Politique pour les fonctions de service
CREATE POLICY "Service role can manage notifications" ON notifications_pending
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Vérification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications_pending') THEN
    RAISE NOTICE '✅ Table notifications_pending créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur : Table notifications_pending non créée';
  END IF;
END $$;