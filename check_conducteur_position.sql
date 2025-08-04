-- Vérifier la position du conducteur de test
SELECT 
  id,
  prenom,
  nom,
  type_vehicule,
  ST_X(position_actuelle::geometry) as longitude,
  ST_Y(position_actuelle::geometry) as latitude,
  position_actuelle
FROM conducteurs
WHERE position_actuelle = '0101000020E610000082B4B574BB5D2BC00D5531957E0E2340'::geography;

-- Calculer la distance entre le conducteur et Station Shell Lambanyi
SELECT 
  c.id,
  c.prenom,
  c.nom,
  ST_Distance(
    c.position_actuelle,
    ST_GeogFromText('POINT(-13.6125611 9.6410198)')  -- Station Shell Lambanyi
  ) / 1000.0 as distance_km
FROM conducteurs c
WHERE c.position_actuelle = '0101000020E610000082B4B574BB5D2BC00D5531957E0E2340'::geography;