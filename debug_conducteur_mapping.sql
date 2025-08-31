-- ========================================
-- DEBUG MAPPING CONDUCTEURS ONESIGNAL
-- ========================================

-- 1. VÉRIFIER LES DEUX IDs CONDUCTEURS
SELECT 
  id,
  nom,
  prenom,
  telephone,
  statut,
  created_at,
  'conducteur_' || id as onesignal_external_id
FROM conducteurs 
WHERE id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',  -- ID assigné dans reservations
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'   -- ID qui fonctionne dans OneSignal
)
ORDER BY created_at;

-- 2. VÉRIFIER LES RÉSERVATIONS ASSIGNÉES
SELECT 
  COUNT(*) as total_reservations,
  conducteur_id,
  statut
FROM reservations
WHERE conducteur_id IN (
  '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa',
  '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
)
GROUP BY conducteur_id, statut
ORDER BY conducteur_id, statut;

-- 3. CORRIGER LE MAPPING (SI NÉCESSAIRE)
-- UPDATE reservations 
-- SET conducteur_id = '75f2bd16-d906-4ea5-8f30-5ff66612ea5c'
-- WHERE conducteur_id = '69e0cde9-14a0-4dde-86c1-1fe9a306f2fa'
-- AND statut = 'canceled';