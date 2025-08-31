-- ========================================
-- TEST COMPARATIF - NOTIFICATION PENDING
-- ========================================

-- 1. CRÉER UNE RÉSERVATION PENDING POUR LE MÊME CONDUCTEUR
INSERT INTO reservations (
  client_phone,
  vehicle_type,
  depart_nom,
  destination_nom,
  position_depart,
  statut,
  prix_total,
  created_at,
  updated_at
) VALUES (
  '+33620951645',
  'moto',
  'Test Pending Départ',
  'Test Pending Destination',
  ST_GeogFromText('POINT(2.3522 48.8566)'), -- Paris pour le test
  'pending',  -- STATUT PENDING
  35000,
  NOW(),
  NOW()
);

-- 2. VÉRIFIER LES RÉSERVATIONS PENDING NON NOTIFIÉES
SELECT 
  id,
  client_phone,
  depart_nom,
  destination_nom,
  statut,
  prix_total,
  notified_at,
  created_at
FROM reservations 
WHERE statut = 'pending' 
  AND notified_at IS NULL
ORDER BY created_at DESC;

-- 3. VÉRIFIER AUSSI LES CANCELED
SELECT 
  id,
  client_phone,
  depart_nom,
  destination_nom,
  conducteur_id,
  statut,
  cancellation_notified_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id IS NOT NULL
  AND cancellation_notified_at IS NULL;