-- =====================================================
-- FICHIER 4 : SCRIPT DE TEST COMPLET
-- =====================================================
-- Description : Script pour tester le système de
-- notifications de bout en bout
-- =====================================================

-- Nettoyer les données de test précédentes
DELETE FROM reservations WHERE client_phone = '+224622999999';

-- ÉTAPE 1 : Vérifier l'environnement
DO $$
DECLARE
  v_conducteurs_count INT;
  v_trigger_exists BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  -- Vérifier la table notifications
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications_pending'
  ) INTO v_table_exists;
  
  -- Vérifier le trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_reservation_status_change'
  ) INTO v_trigger_exists;
  
  -- Compter les conducteurs disponibles
  SELECT COUNT(*) INTO v_conducteurs_count 
  FROM conducteurs 
  WHERE statut = 'disponible';
  
  -- Afficher le résultat
  RAISE NOTICE '=== VÉRIFICATION ENVIRONNEMENT ===';
  RAISE NOTICE 'Table notifications_pending : %', 
    CASE WHEN v_table_exists THEN '✅ OK' ELSE '❌ MANQUANTE' END;
  RAISE NOTICE 'Trigger de notification : %', 
    CASE WHEN v_trigger_exists THEN '✅ OK' ELSE '❌ MANQUANT' END;
  RAISE NOTICE 'Conducteurs disponibles : % %', 
    v_conducteurs_count,
    CASE WHEN v_conducteurs_count > 0 THEN '✅' ELSE '❌ AUCUN!' END;
    
  IF NOT v_table_exists OR NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Configuration incomplète. Exécutez d''abord les scripts 01 et 02.';
  END IF;
  
  IF v_conducteurs_count = 0 THEN
    RAISE WARNING 'Aucun conducteur disponible. Le test va échouer.';
  END IF;
END $$;

-- ÉTAPE 2 : Créer une réservation de test
DO $$
DECLARE
  v_reservation_id UUID;
  v_conducteur_id UUID;
  v_conducteur_nom TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CRÉATION RÉSERVATION TEST ===';
  
  -- Créer la réservation en statut 'pending'
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
    '+224622999999',  -- Numéro de test
    'moto',
    'pending',        -- Statut initial
    'POINT(-13.6784 9.5371)',  -- Kaloum, Conakry
    'Aéroport International de Conakry',
    uuid_generate_v4(),
    'POINT(-13.6120 9.5765)',  -- Aéroport
    15.5,
    25000
  ) RETURNING id INTO v_reservation_id;
  
  RAISE NOTICE 'Réservation créée : %', v_reservation_id;
  RAISE NOTICE 'Client : +224622999999';
  RAISE NOTICE 'Type : moto';
  RAISE NOTICE 'Destination : Aéroport International de Conakry';
  RAISE NOTICE 'Prix : 25,000 GNF';
  
  -- Attendre un peu
  PERFORM pg_sleep(1);
  
  -- Vérifier qu'aucune notification n'existe encore
  IF EXISTS (
    SELECT 1 FROM notifications_pending 
    WHERE reservation_id = v_reservation_id
  ) THEN
    RAISE WARNING 'Une notification existe déjà (ne devrait pas)';
  ELSE
    RAISE NOTICE '✅ Aucune notification (normal, statut = pending)';
  END IF;
  
  -- ÉTAPE 3 : Simuler l'acceptation par un conducteur
  RAISE NOTICE '';
  RAISE NOTICE '=== SIMULATION ACCEPTATION CONDUCTEUR ===';
  
  -- Trouver un conducteur disponible
  SELECT id, prenom || ' ' || nom 
  INTO v_conducteur_id, v_conducteur_nom
  FROM conducteurs 
  WHERE statut = 'disponible' 
    AND vehicle_type = 'moto'
  LIMIT 1;
  
  IF v_conducteur_id IS NULL THEN
    -- Essayer avec n'importe quel type
    SELECT id, prenom || ' ' || nom 
    INTO v_conducteur_id, v_conducteur_nom
    FROM conducteurs 
    WHERE statut = 'disponible'
    LIMIT 1;
  END IF;
  
  IF v_conducteur_id IS NULL THEN
    RAISE EXCEPTION 'Aucun conducteur disponible pour le test';
  END IF;
  
  RAISE NOTICE 'Conducteur sélectionné : % (%)', v_conducteur_nom, v_conducteur_id;
  
  -- Mettre à jour la réservation (ceci devrait déclencher le trigger)
  UPDATE reservations 
  SET 
    statut = 'accepted',
    conducteur_id = v_conducteur_id,
    updated_at = now()
  WHERE id = v_reservation_id;
  
  RAISE NOTICE '✅ Réservation mise à jour : statut = accepted';
  
  -- Attendre que le trigger s'exécute
  PERFORM pg_sleep(1);
  
  -- ÉTAPE 4 : Vérifier la création de la notification
  RAISE NOTICE '';
  RAISE NOTICE '=== VÉRIFICATION NOTIFICATION ===';
  
  IF EXISTS (
    SELECT 1 FROM notifications_pending 
    WHERE reservation_id = v_reservation_id
      AND type = 'reservation_accepted'
      AND processed_at IS NULL
  ) THEN
    RAISE NOTICE '✅ Notification créée avec succès !';
    
    -- Afficher les détails
    PERFORM 
      RAISE NOTICE 'Notification ID : %', n.id,
      RAISE NOTICE 'Créée à : %', n.created_at,
      RAISE NOTICE 'Type : %', n.type
    FROM notifications_pending n
    WHERE n.reservation_id = v_reservation_id;
    
  ELSE
    RAISE WARNING '❌ Aucune notification créée - Vérifiez le trigger';
  END IF;
  
END $$;

-- ÉTAPE 5 : Afficher les résultats
RAISE NOTICE '';
RAISE NOTICE '=== RÉSULTATS DU TEST ===';

-- Afficher les notifications en attente
SELECT 
  'Notifications en attente :' as info,
  n.*,
  r.client_phone,
  r.destination_nom,
  c.prenom || ' ' || c.nom as conducteur
FROM notifications_pending n
JOIN reservations r ON n.reservation_id = r.id
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
WHERE n.processed_at IS NULL
ORDER BY n.created_at DESC
LIMIT 5;

-- Utiliser la vue de monitoring
SELECT * FROM v_notifications_dashboard;

-- Afficher les détails complets
SELECT 
  notification_id,
  client_phone,
  destination_nom,
  conducteur_nom,
  vehicule,
  minutes_attente || ' minutes' as temps_attente
FROM v_notifications_pending_full
LIMIT 5;

-- ÉTAPE 6 : Nettoyage (optionnel - décommenter pour nettoyer)
-- DELETE FROM reservations WHERE client_phone = '+224622999999';

RAISE NOTICE '';
RAISE NOTICE '=== TEST TERMINÉ ===';
RAISE NOTICE 'Si vous voyez une notification en attente, le système fonctionne !';
RAISE NOTICE 'La Edge Function peut maintenant traiter cette notification.';