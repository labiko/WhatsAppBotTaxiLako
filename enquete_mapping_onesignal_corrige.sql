-- ========================================
-- 🕵️ ENQUÊTE MAPPING ONESIGNAL - STRUCTURE CORRECTE
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
  vehicle_marque,
  vehicle_plaque,
  date_inscription,
  derniere_activite,
  actif,
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
  vehicle_marque,
  vehicle_plaque,
  date_inscription,
  derniere_activite,
  actif,
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

-- 📋 ÉTAPE 3: COMPARAISON DES PROFILS
SELECT 
  'COMPARAISON PROFILS' as section,
  CASE 
    WHEN c1.nom = c2.nom THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.nom, ' vs ', c2.nom) 
  END as nom_comparaison,
  CASE 
    WHEN c1.prenom = c2.prenom THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.prenom, ' vs ', c2.prenom) 
  END as prenom_comparaison,
  CASE 
    WHEN c1.telephone = c2.telephone THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.telephone, ' vs ', c2.telephone) 
  END as telephone_comparaison,
  CASE 
    WHEN c1.vehicle_type = c2.vehicle_type THEN 'IDENTIQUE' 
    ELSE CONCAT('DIFFÉRENT: ', c1.vehicle_type, ' vs ', c2.vehicle_type) 
  END as vehicle_type_comparaison,
  c1.date_inscription as date_creation_69e0,
  c2.date_inscription as date_creation_75f2,
  (c2.date_inscription - c1.date_inscription) as ecart_creation,
  c1.derniere_activite as derniere_activite_69e0,
  c2.derniere_activite as derniere_activite_75f2
FROM conducteurs c1, conducteurs c2
WHERE c1.id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
  AND c2.id = '75f2bd16-d906-4ea5-8f30-5ff66612ea5c';

-- 📋 ÉTAPE 4: RECHERCHE D'ÉVENTUELS DOUBLONS
SELECT 
  'RECHERCHE DOUBLONS' as section,
  nom,
  prenom,
  telephone,
  COUNT(*) as nombre_comptes,
  STRING_AGG(id::text, ' | ') as tous_les_ids,
  STRING_AGG('conducteur_' || id::text, ' | ') as external_user_ids
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
GROUP BY nom, prenom, telephone
ORDER BY COUNT(*) DESC;

-- 📋 ÉTAPE 5: HISTORIQUE DES NOTIFICATIONS 
SELECT 
  'HISTORIQUE NOTIFICATIONS' as section,
  conducteur_id,
  COUNT(CASE WHEN notified_at IS NOT NULL THEN 1 END) as notifications_pending_reussies,
  COUNT(CASE WHEN cancellation_notified_at IS NOT NULL THEN 1 END) as notifications_cancelled_reussies,
  MIN(notified_at) as premiere_notif_pending,
  MAX(notified_at) as derniere_notif_pending,
  MIN(cancellation_notified_at) as premiere_notif_cancelled,
  MAX(cancellation_notified_at) as derniere_notif_cancelled
FROM reservations
WHERE conducteur_id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
)
GROUP BY conducteur_id
ORDER BY conducteur_id;