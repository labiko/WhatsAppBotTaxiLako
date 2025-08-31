-- ═════════════════════════════════════════════════════════════════
-- 🚫 AJOUT COLONNES SYSTÈME ANNULATION AVEC CONFIRMATION
-- ═════════════════════════════════════════════════════════════════

-- Ajouter les colonnes pour gérer l'annulation avec confirmation
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS reservation_to_cancel UUID,
ADD COLUMN IF NOT EXISTS conducteur_to_notify UUID;

-- Commenter les colonnes pour documentation
COMMENT ON COLUMN sessions.reservation_to_cancel IS 'ID de la réservation en attente dannulation (pour confirmation)';
COMMENT ON COLUMN sessions.conducteur_to_notify IS 'ID du conducteur à notifier en cas dannulation confirmée';

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name IN ('reservation_to_cancel', 'conducteur_to_notify')
ORDER BY column_name;