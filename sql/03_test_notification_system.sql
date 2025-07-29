-- =====================================================
-- SCRIPT 3 : TEST DU SYSTÈME DE NOTIFICATION
-- =====================================================
-- Ce script permet de tester le système en créant
-- une réservation test et en simulant son acceptation
-- =====================================================

-- 1. Vérifier qu'il y a au moins un conducteur disponible
DO $$
DECLARE
  conducteur_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conducteur_count FROM conducteurs WHERE statut = 'disponible';
  IF conducteur_count = 0 THEN
    RAISE NOTICE 'ATTENTION: Aucun conducteur disponible. Le test ne fonctionnera pas correctement.';
  ELSE
    RAISE NOTICE 'OK: % conducteur(s) disponible(s)', conducteur_count;
  END IF;
END $$;

-- 2. Créer une réservation de test en statut 'pending'
INSERT INTO reservations (
  client_phone, 
  vehicle_type, 
  statut,
  position_depart,
  destination_nom,
  destination_id,
  position_arrivee,
  distance_km,
  prix_total
) VALUES (
  '+224622123456',  -- Numéro de test
  'moto',
  'pending',        -- Statut initial
  'POINT(-13.6784 9.5371)',  -- Position Conakry
  'Aéroport de Conakry',
  '123e4567-e89b-12d3-a456-426614174000',
  'POINT(-13.6120 9.5765)',
  15.5,
  25000
) RETURNING id, client_phone, statut;

-- Noter l'ID qui s'affiche ci-dessus

-- 3. Vérifier qu'aucune notification n'existe encore
SELECT 'Notifications avant acceptation:' as info;
SELECT * FROM notifications_pending WHERE reservation_id IN (
  SELECT id FROM reservations WHERE client_phone = '+224622123456' ORDER BY created_at DESC LIMIT 1
);

-- 4. Simuler l'acceptation par un conducteur
-- IMPORTANT: Remplacez 'ID_RESERVATION' par l'ID retourné à l'étape 2
UPDATE reservations 
SET 
  statut = 'accepted',
  conducteur_id = (SELECT id FROM conducteurs WHERE statut = 'disponible' LIMIT 1),
  updated_at = now()
WHERE id = 'ID_RESERVATION';  -- <-- REMPLACER ICI

-- 5. Vérifier que la notification a été créée
SELECT 'Notifications après acceptation:' as info;
SELECT 
  n.*,
  r.client_phone,
  r.destination_nom,
  c.prenom || ' ' || c.nom as conducteur_nom
FROM notifications_pending n
JOIN reservations r ON n.reservation_id = r.id
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE n.processed_at IS NULL
ORDER BY n.created_at DESC;

-- 6. Nettoyer les données de test (optionnel)
-- DELETE FROM reservations WHERE client_phone = '+224622123456';