-- =====================================================
-- FICHIER 3 : VUES ET FONCTIONS DE MONITORING
-- =====================================================
-- Description : Vues et fonctions utilitaires pour
-- surveiller et gérer le système de notifications
-- =====================================================

-- Vue : Statut global des notifications
CREATE OR REPLACE VIEW v_notifications_dashboard AS
SELECT 
  COUNT(*) FILTER (WHERE processed_at IS NULL) as en_attente,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as traitees,
  COUNT(*) as total,
  MIN(created_at) FILTER (WHERE processed_at IS NULL) as plus_ancienne_en_attente,
  MAX(processed_at) as derniere_traitee,
  CASE 
    WHEN COUNT(*) FILTER (WHERE processed_at IS NULL) = 0 THEN '✅ Toutes traitées'
    WHEN COUNT(*) FILTER (WHERE processed_at IS NULL) < 5 THEN '🟡 ' || COUNT(*) FILTER (WHERE processed_at IS NULL) || ' en attente'
    ELSE '🔴 ' || COUNT(*) FILTER (WHERE processed_at IS NULL) || ' en attente !'
  END as statut
FROM notifications_pending;

-- Vue : Détails des notifications en attente avec toutes les infos
CREATE OR REPLACE VIEW v_notifications_pending_full AS
SELECT 
  n.id as notification_id,
  n.created_at,
  EXTRACT(EPOCH FROM (now() - n.created_at))/60 as minutes_attente,
  r.id as reservation_id,
  r.client_phone,
  r.destination_nom,
  r.distance_km,
  r.prix_total,
  r.statut as reservation_statut,
  c.id as conducteur_id,
  c.prenom || ' ' || c.nom as conducteur_nom,
  c.telephone as conducteur_tel,
  c.vehicle_marque || ' ' || c.vehicle_modele || ' - ' || c.vehicle_couleur as vehicule,
  c.vehicle_plaque,
  c.note_moyenne
FROM notifications_pending n
JOIN reservations r ON n.reservation_id = r.id
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE n.processed_at IS NULL
  AND n.type = 'reservation_accepted'
ORDER BY n.created_at ASC;

-- Vue : Historique des notifications traitées (dernières 24h)
CREATE OR REPLACE VIEW v_notifications_history AS
SELECT 
  n.id,
  n.type,
  n.created_at,
  n.processed_at,
  EXTRACT(EPOCH FROM (n.processed_at - n.created_at))/60 as delai_traitement_minutes,
  r.client_phone,
  r.destination_nom,
  c.prenom || ' ' || c.nom as conducteur
FROM notifications_pending n
JOIN reservations r ON n.reservation_id = r.id
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE n.processed_at IS NOT NULL
  AND n.processed_at > now() - INTERVAL '24 hours'
ORDER BY n.processed_at DESC;

-- Fonction : Marquer une notification comme traitée
CREATE OR REPLACE FUNCTION mark_notification_processed(p_notification_id UUID)
RETURNS boolean AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE notifications_pending 
  SET processed_at = now() 
  WHERE id = p_notification_id 
    AND processed_at IS NULL;
    
  v_updated := FOUND;
  
  IF v_updated THEN
    RAISE NOTICE '✅ Notification % marquée comme traitée', p_notification_id;
  ELSE
    RAISE NOTICE '⚠️ Notification % introuvable ou déjà traitée', p_notification_id;
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Récupérer les notifications à traiter avec toutes les infos
CREATE OR REPLACE FUNCTION get_pending_notifications_batch(p_limit INT DEFAULT 10)
RETURNS TABLE (
  notification_id UUID,
  reservation_id UUID,
  client_phone TEXT,
  destination_nom TEXT,
  distance_km NUMERIC,
  prix_total NUMERIC,
  conducteur_nom TEXT,
  conducteur_telephone TEXT,
  vehicle_info TEXT,
  vehicle_plaque TEXT,
  note_moyenne NUMERIC,
  eta_minutes INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id as notification_id,
    r.id as reservation_id,
    r.client_phone,
    r.destination_nom,
    r.distance_km,
    r.prix_total,
    c.prenom || ' ' || c.nom as conducteur_nom,
    c.telephone as conducteur_telephone,
    c.vehicle_couleur || ' ' || c.vehicle_marque || ' ' || c.vehicle_modele as vehicle_info,
    c.vehicle_plaque,
    c.note_moyenne,
    GREATEST(5, ROUND(r.distance_km * 3)::INT) as eta_minutes
  FROM notifications_pending n
  JOIN reservations r ON n.reservation_id = r.id
  JOIN conducteurs c ON r.conducteur_id = c.id
  WHERE n.processed_at IS NULL
    AND n.type = 'reservation_accepted'
  ORDER BY n.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Statistiques du système
CREATE OR REPLACE FUNCTION get_notification_stats()
RETURNS TABLE (
  total_notifications BIGINT,
  notifications_en_attente BIGINT,
  notifications_traitees_aujourdhui BIGINT,
  temps_moyen_traitement_minutes NUMERIC,
  plus_ancienne_en_attente TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_notifications,
    COUNT(*) FILTER (WHERE processed_at IS NULL)::BIGINT as notifications_en_attente,
    COUNT(*) FILTER (WHERE processed_at::DATE = CURRENT_DATE)::BIGINT as notifications_traitees_aujourdhui,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/60) FILTER (WHERE processed_at IS NOT NULL)::NUMERIC as temps_moyen_traitement_minutes,
    MIN(created_at) FILTER (WHERE processed_at IS NULL) as plus_ancienne_en_attente
  FROM notifications_pending;
END;
$$ LANGUAGE plpgsql;

-- Grants pour les vues (si nécessaire)
GRANT SELECT ON v_notifications_dashboard TO anon, authenticated;
GRANT SELECT ON v_notifications_pending_full TO anon, authenticated;
GRANT SELECT ON v_notifications_history TO anon, authenticated;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Vues et fonctions de monitoring créées avec succès';
END $$;