-- 1. Vérifier tous les conducteurs MOTO disponibles
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  statut,
  ST_X(position_actuelle::geometry) as longitude,
  ST_Y(position_actuelle::geometry) as latitude
FROM conducteurs
WHERE vehicle_type = 'moto' 
  AND statut = 'disponible';

-- 2. Vérifier spécifiquement le conducteur de test
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  statut,
  ST_X(position_actuelle::geometry) as longitude,
  ST_Y(position_actuelle::geometry) as latitude,
  position_actuelle
FROM conducteurs
WHERE position_actuelle = '0101000020E610000082B4B574BB5D2BC00D5531957E0E2340'::geography;

-- 3. Distance entre Station Shell Lambanyi et le conducteur de test
SELECT 
  c.id,
  c.prenom || ' ' || c.nom as conducteur,
  c.vehicle_type,
  c.statut,
  ST_Distance(
    c.position_actuelle,
    ST_GeogFromText('POINT(-13.6125611 9.6410198)')  -- Station Shell Lambanyi
  ) as distance_metres,
  ST_Distance(
    c.position_actuelle,
    ST_GeogFromText('POINT(-13.6125611 9.6410198)')
  ) / 1000.0 as distance_km
FROM conducteurs c
WHERE c.position_actuelle = '0101000020E610000082B4B574BB5D2BC00D5531957E0E2340'::geography;

-- 4. Vérifier si conducteurs_with_coords existe et contient les données
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  statut,
  latitude,
  longitude
FROM conducteurs_with_coords
WHERE vehicle_type = 'moto' 
  AND statut = 'disponible'
LIMIT 5;