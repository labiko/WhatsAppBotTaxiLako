-- ========================================
-- TEST FINAL - NOTIFICATION ANNULATION
-- ========================================

-- 1. CRÉER UNE NOUVELLE RÉSERVATION TEST ANNULÉE
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
  'Test Final Départ',
  'Test Final Destination',
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa', -- MÊME CONDUCTEUR QUI FONCTIONNE
  'canceled',
  25000,
  NOW(),
  NOW()
);

-- 2. VÉRIFIER QU'ELLE EST BIEN LÀ
SELECT 
  id,
  depart_nom,
  destination_nom,
  conducteur_id,
  statut,
  cancellation_notified_at,
  created_at
FROM reservations 
WHERE statut = 'canceled' 
  AND conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND cancellation_notified_at IS NULL
ORDER BY created_at DESC;