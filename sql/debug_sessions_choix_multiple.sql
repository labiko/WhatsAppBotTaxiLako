-- Script pour débugger les sessions lors du choix multiple
-- À exécuter dans le SQL Editor de Supabase

-- 1. Voir toutes les sessions récentes avec état choix_destination_multiple
SELECT 'SESSIONS AVEC CHOIX DESTINATION MULTIPLE' as type_requete;
SELECT 
  client_phone,
  etat,
  vehicle_type,
  destination_nom,
  destination_id,
  distance_km,
  prix_estime,
  suggestions_destination,
  created_at,
  updated_at
FROM sessions 
WHERE etat = 'choix_destination_multiple'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. Voir la dernière session modifiée (peu importe l'état)
SELECT 'DERNIÈRE SESSION MODIFIÉE' as type_requete;
SELECT 
  client_phone,
  etat,
  vehicle_type,
  destination_nom,
  destination_id,
  depart_nom,
  depart_id,
  distance_km,
  prix_estime,
  suggestions_destination,
  created_at,
  updated_at
FROM sessions 
ORDER BY updated_at DESC
LIMIT 1;

-- 3. Voir l'évolution d'un numéro spécifique (remplacer le numéro)
SELECT 'ÉVOLUTION SESSION CLIENT' as type_requete;
SELECT 
  etat,
  vehicle_type,
  destination_nom,
  depart_nom,
  distance_km,
  prix_estime,
  temporal_planning,
  planned_date,
  planned_hour,
  suggestions_destination,
  updated_at
FROM sessions 
WHERE client_phone = '+33620951645'  -- Remplacer par le numéro testé
ORDER BY updated_at DESC
LIMIT 5;

-- 4. Vérifier le contenu des suggestions stockées
SELECT 'CONTENU SUGGESTIONS JSON' as type_requete;
SELECT 
  client_phone,
  etat,
  suggestions_destination::text as suggestions_brut,
  jsonb_array_length(suggestions_destination::jsonb) as nombre_suggestions,
  updated_at
FROM sessions 
WHERE suggestions_destination IS NOT NULL
  AND suggestions_destination != 'null'
ORDER BY updated_at DESC
LIMIT 5;

-- 5. Voir les sessions qui sont passées de choix_destination_multiple à prix_calcule
SELECT 'SESSIONS PRIX CALCULÉ' as type_requete;
SELECT 
  client_phone,
  etat,
  vehicle_type,
  destination_nom,
  distance_km,
  prix_estime,
  updated_at
FROM sessions 
WHERE etat = 'prix_calcule'
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;