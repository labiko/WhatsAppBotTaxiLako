-- =====================================================
-- SCRIPT 4 : REQUÊTES DE MONITORING
-- =====================================================
-- Requêtes utiles pour surveiller le système
-- =====================================================

-- 1. Vue d'ensemble des notifications
CREATE OR REPLACE VIEW v_notifications_status AS
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as notifications_en_attente,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as notifications_traitees,
  COUNT(*) as total_notifications,
  MIN(created_at) FILTER (WHERE processed_at IS NULL) as plus_ancienne_en_attente,
  MAX(processed_at) as derniere_traitee
FROM notifications_pending;

-- 2. Détail des notifications en attente avec infos complètes
CREATE OR REPLACE VIEW v_notifications_pending_details AS
SELECT 
  n.id as notification_id,
  n.created_at as notification_creee_le,
  r.id as reservation_id,
  r.client_phone,
  r.destination_nom,
  r.prix_total,
  c.prenom || ' ' || c.nom as conducteur_nom,
  c.telephone as conducteur_telephone,
  c.vehicle_marque || ' ' || c.vehicle_modele as vehicule,
  EXTRACT(EPOCH FROM (now() - n.created_at))/60 as minutes_attente
FROM notifications_pending n
JOIN reservations r ON n.reservation_id = r.id
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE n.processed_at IS NULL
ORDER BY n.created_at ASC;

-- 3. Fonction pour forcer le traitement d'une notification
CREATE OR REPLACE FUNCTION force_process_notification(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications_pending 
  SET processed_at = now() 
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REQUÊTES DE MONITORING À EXÉCUTER RÉGULIÈREMENT
-- =====================================================

-- Voir le statut global
SELECT * FROM v_notifications_status;

-- Voir les notifications en attente
SELECT * FROM v_notifications_pending_details;

-- Voir les dernières réservations acceptées
SELECT 
  r.id,
  r.client_phone,
  r.statut,
  r.updated_at,
  c.prenom || ' ' || c.nom as conducteur,
  CASE 
    WHEN n.id IS NOT NULL AND n.processed_at IS NULL THEN 'En attente d''envoi'
    WHEN n.id IS NOT NULL AND n.processed_at IS NOT NULL THEN 'Notification envoyée'
    ELSE 'Pas de notification'
  END as statut_notification
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN notifications_pending n ON r.id = n.reservation_id
WHERE r.statut = 'accepted'
ORDER BY r.updated_at DESC
LIMIT 10;