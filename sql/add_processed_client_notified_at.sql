-- ═══════════════════════════════════════════════════════════════
-- 📊 AJOUT COLONNE POUR TRACER LES NOTIFICATIONS ENVOYÉES
-- ═══════════════════════════════════════════════════════════════
-- Date: 2025-08-26
-- Description: Ajouter colonne pour marquer les paiements dont la notification
--              de confirmation a été envoyée au client

-- 1. AJOUTER LA COLONNE
ALTER TABLE lengopay_payments 
ADD COLUMN IF NOT EXISTS processed_client_notified_at TIMESTAMP WITH TIME ZONE;

-- 2. CRÉER INDEX POUR OPTIMISER LES REQUÊTES
CREATE INDEX IF NOT EXISTS idx_lengopay_payments_notification_pending 
ON lengopay_payments(status, processed_client_notified_at, reservation_id) 
WHERE status = 'SUCCESS' 
  AND processed_client_notified_at IS NULL 
  AND reservation_id IS NOT NULL;

-- 3. COMMENTER LA COLONNE
COMMENT ON COLUMN lengopay_payments.processed_client_notified_at IS 
'Date/heure d''envoi de la notification de confirmation au client. NULL = notification non envoyée';

-- 4. VÉRIFICATION
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'lengopay_payments'
  AND column_name = 'processed_client_notified_at';

-- 5. TEST - VOIR LES PAIEMENTS QUI NÉCESSITENT NOTIFICATION
SELECT 
    payment_id,
    status,
    reservation_id,
    processed_client_notified_at,
    created_at
FROM lengopay_payments
WHERE status = 'SUCCESS'
  AND processed_client_notified_at IS NULL
  AND reservation_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;