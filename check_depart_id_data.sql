-- Vérifier les données depart_id dans les sessions

-- 1. Compter les sessions avec depart_id non null
SELECT 
  COUNT(*) as total_sessions,
  COUNT(depart_id) as sessions_avec_depart_id,
  COUNT(*) - COUNT(depart_id) as sessions_sans_depart_id
FROM public.sessions;

-- 2. Voir les 10 dernières sessions avec leurs depart_id
SELECT 
  client_phone,
  depart_nom,
  depart_id,
  destination_nom,
  destination_id,
  etat,
  updated_at
FROM public.sessions 
ORDER BY updated_at DESC 
LIMIT 10;

-- 3. Chercher spécifiquement les sessions "Pharmacie Donka"
SELECT 
  client_phone,
  depart_nom,
  depart_id,
  etat,
  updated_at
FROM public.sessions 
WHERE depart_nom ILIKE '%donka%'
ORDER BY updated_at DESC;