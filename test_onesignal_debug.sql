-- ========================================
-- DIAGNOSTIC ONESIGNAL - CONDUCTEUR TEST
-- ========================================

-- 1. VÉRIFIER LE CONDUCTEUR TEST
SELECT 
  id,
  nom,
  prenom,
  telephone,
  statut,
  created_at
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 2. VÉRIFIER SI CE CONDUCTEUR A DES RÉSERVATIONS
SELECT 
  COUNT(*) as total_reservations,
  SUM(CASE WHEN statut = 'canceled' THEN 1 ELSE 0 END) as annulees,
  SUM(CASE WHEN cancellation_notified_at IS NOT NULL THEN 1 ELSE 0 END) as notifiees
FROM reservations
WHERE conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa';

-- 3. LISTE DES CONDUCTEURS AVEC LEURS IDS
SELECT 
  id,
  nom,
  prenom,
  telephone,
  'conducteur_' || id as onesignal_external_id
FROM conducteurs
WHERE statut = 'disponible'
ORDER BY created_at DESC
LIMIT 10;