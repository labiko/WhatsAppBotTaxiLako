-- Vérifier les coordonnées des deux lieux

-- 2. Coordonnées du départ (Pharmacie Donka)
SELECT 
  id,
  nom,
  latitude,
  longitude
FROM public.adresses_with_coords 
WHERE id = '5b70b314-d287-4722-aeed-0ba5856a64cc';

-- 3. Coordonnées de la destination (Ecole primaire de Denki madina)
SELECT 
  id,
  nom,
  ville,
  latitude,
  longitude
FROM public.adresses_with_coords 
WHERE id = '7ab366c5-cc8d-4a29-a3e0-4a2890cc534e';

-- 4. Calcul manuel de distance avec formule Haversine
SELECT 
  d.nom as depart_nom,
  d.latitude as depart_lat,
  d.longitude as depart_lon,
  dest.nom as destination_nom,
  dest.latitude as dest_lat,
  dest.longitude as dest_lon,
  -- Formule Haversine simplifiée pour test
  ROUND(
    ST_Distance(
      ST_MakePoint(d.longitude, d.latitude)::geography,
      ST_MakePoint(dest.longitude, dest.latitude)::geography
    ) / 1000.0, 2
  ) as distance_km_calculee
FROM 
  (SELECT nom, latitude, longitude FROM public.adresses_with_coords WHERE id = '5b70b314-d287-4722-aeed-0ba5856a64cc') d,
  (SELECT nom, latitude, longitude FROM public.adresses_with_coords WHERE id = '7ab366c5-cc8d-4a29-a3e0-4a2890cc534e') dest;