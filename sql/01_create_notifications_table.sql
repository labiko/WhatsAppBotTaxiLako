-- =====================================================
-- SCRIPT 1 : CRÉATION DE LA TABLE NOTIFICATIONS
-- =====================================================
-- Ce script crée la table qui stockera les notifications
-- en attente d'envoi aux clients
-- =====================================================

-- Créer la table pour stocker les notifications à envoyer
CREATE TABLE IF NOT EXISTS notifications_pending (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'reservation_accepted',
  created_at timestamp DEFAULT now(),
  processed_at timestamp,
  UNIQUE(reservation_id, type)
);

-- Créer un index pour optimiser les requêtes sur les notifications non traitées
CREATE INDEX IF NOT EXISTS idx_notifications_pending_processed 
ON notifications_pending(processed_at) 
WHERE processed_at IS NULL;

-- Ajouter des commentaires pour la documentation
COMMENT ON TABLE notifications_pending IS 'Table des notifications WhatsApp en attente d''envoi';
COMMENT ON COLUMN notifications_pending.reservation_id IS 'ID de la réservation concernée';
COMMENT ON COLUMN notifications_pending.type IS 'Type de notification (reservation_accepted, etc.)';
COMMENT ON COLUMN notifications_pending.processed_at IS 'Date de traitement, NULL si non traité';

-- Vérifier que la table a été créée
SELECT 'Table notifications_pending créée avec succès' as message;