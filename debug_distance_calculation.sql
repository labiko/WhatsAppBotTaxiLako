-- Debug du calcul de distance pour la session actuelle

-- 1. Voir la session la plus récente avec ses coordonnées
SELECT 
  client_phone,
  depart_nom,
  depart_id,
  destination_nom,
  destination_id,
  distance_km,
  etat,
  updated_at
FROM public.sessions 
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC 
LIMIT 1;

-- 2. Vérifier les coordonnées du départ (Pharmacie Donka)
SELECT 
  id,
  nom,
  latitude,
  longitude
FROM public.adresses_with_coords 
WHERE id = '5b70b314-d287-4722-aeed-0ba5856a64cc';

-- 3. Chercher l'ID de "Ecole primaire de Denki madina"
SELECT 
  id,
  nom,
  ville,
  latitude,
  longitude
FROM public.adresses_with_coords 
WHERE nom ILIKE '%denki%madina%'
   OR nom ILIKE '%ecole%denki%'
ORDER BY nom;

-- 4. Calculer manuellement la distance si on trouve les deux points
-- (sera complété après avoir les IDs exacts)