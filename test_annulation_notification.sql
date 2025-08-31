-- ========================================
-- SQL DE TEST - NOTIFICATION ANNULATION
-- ========================================

-- 1. CRÉER UNE RÉSERVATION DE TEST
INSERT INTO reservations (
  client_phone,
  vehicle_type,
  depart_nom,
  destination_nom,
  conducteur_id,
  statut,
  prix_total,
  created_at,
  updated_at
) VALUES (
  '+33620951645',
  'moto',
  'Test Départ',
  'Test Destination',
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa', -- ID conducteur test
  'canceled',
  25000,
  NOW(),
  NOW()
);

-- 2. VÉRIFIER LES RÉSERVATIONS ANNULÉES NON NOTIFIÉES
SELECT 
  id,
  client_phone,
  depart_nom,
  destination_nom,
  conducteur_id,
  statut,
  prix_total,
  cancellation_notified_at,
  created_at,
  updated_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id IS NOT NULL 
  AND cancellation_notified_at IS NULL
ORDER BY updated_at DESC;

-- 3. NETTOYER APRÈS TEST (à exécuter APRÈS le test de l'endpoint)
-- DELETE FROM reservations WHERE depart_nom = 'Test Départ' AND destination_nom = 'Test Destination';