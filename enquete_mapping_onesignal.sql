-- ========================================
-- 🕵️ ENQUÊTE MAPPING ONESIGNAL - ANALYSE PROFONDE
-- ========================================

-- 📋 ÉTAPE 1: PROFILS COMPLETS DES DEUX CONDUCTEURS
SELECT 
  '=== CONDUCTEUR 1 (ID assigné réservations) ===' as section,
  id,
  nom,
  prenom,
  telephone,
  statut,
  vehicle_type,
  created_at,
  updated_at,
  'conducteur_' || id as external_user_id_attendu
FROM conducteurs 
WHERE id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'

UNION ALL

SELECT 
  '=== CONDUCTEUR 2 (ID qui marche OneSignal) ===' as section,
  id,
  nom,
  prenom,
  telephone,
  statut,
  vehicle_type,
  created_at,
  updated_at,
  'conducteur_' || id as external_user_id_reel
FROM conducteurs 
WHERE id = '75f2bd16-d906-4ea5-8f30-5ff66612ea5c';

-- 📋 ÉTAPE 2: HISTORIQUE DES RÉSERVATIONS PAR CONDUCTEUR
SELECT 
  'RÉSERVATIONS PAR CONDUCTEUR' as section,
  conducteur_id,
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN statut = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN statut = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN statut = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN statut = 'canceled' THEN 1 END) as canceled,
  MIN(created_at) as premiere_reservation,
  MAX(created_at) as derniere_reservation
FROM reservations
WHERE conducteur_id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
)
GROUP BY conducteur_id
ORDER BY conducteur_id;

-- 📋 ÉTAPE 3: NOTIFICATIONS ENVOYÉES (ProcessPending vs ProcessCancelled)
SELECT 
  'NOTIFICATIONS PENDING' as type_notification,
  conducteur_id,
  COUNT(*) as notifications_pending,
  MIN(notified_at) as premiere_notif_pending,
  MAX(notified_at) as derniere_notif_pending
FROM reservations
WHERE conducteur_id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
)
AND notified_at IS NOT NULL
GROUP BY conducteur_id

UNION ALL

SELECT 
  'NOTIFICATIONS CANCELLED' as type_notification,
  conducteur_id,
  COUNT(*) as notifications_cancelled,
  MIN(cancellation_notified_at) as premiere_notif_cancelled,
  MAX(cancellation_notified_at) as derniere_notif_cancelled
FROM reservations
WHERE conducteur_id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
)
AND cancellation_notified_at IS NOT NULL
GROUP BY conducteur_id;

-- 📋 ÉTAPE 4: COMPARAISON DES DONNÉES IDENTIQUES/DIFFÉRENTES
SELECT 
  'COMPARAISON PROFILS' as section,
  CASE 
    WHEN c1.nom = c2.nom THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.nom, ' vs ', c2.nom) 
  END as nom_comparaison,
  CASE 
    WHEN c1.telephone = c2.telephone THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.telephone, ' vs ', c2.telephone) 
  END as telephone_comparaison,
  CASE 
    WHEN c1.vehicle_type = c2.vehicle_type THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', COALESCE(c1.vehicle_type, 'NULL'), ' vs ', COALESCE(c2.vehicle_type, 'NULL')) 
  END as vehicle_type_comparaison,
  c1.created_at as date_creation_69e0,
  c2.created_at as date_creation_75f2,
  (c2.created_at - c1.created_at) as ecart_creation
FROM conducteurs c1, conducteurs c2
WHERE c1.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND c2.id = '75f2bd16-d906-4ea5-8f30-5ff66612ea5c';

-- 📋 ÉTAPE 5: RECHERCHE D'ÉVENTUELS DOUBLONS
SELECT 
  'RECHERCHE DOUBLONS' as section,
  nom,
  telephone,
  COUNT(*) as nombre_comptes,
  STRING_AGG(id::text, ' | ') as tous_les_ids
FROM conducteurs
WHERE nom IN (
  SELECT nom FROM conducteurs WHERE id IN (
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
  )
)
OR telephone IN (
  SELECT telephone FROM conducteurs WHERE id IN (
    '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
    '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
  )
)
GROUP BY nom, telephone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;