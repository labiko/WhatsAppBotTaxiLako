-- Mettre à jour la position du conducteur de test près de Station Shell Lambanyi
-- Nouvelles coordonnées: 9.643415934737696, -13.61115968745612

UPDATE conducteurs 
SET position_actuelle = ST_GeogFromText('POINT(-13.61115968745612 9.643415934737696)')
WHERE id = 'c1682dd2-655e-4755-8c79-e0e837b3a457';

-- Vérifier la mise à jour
SELECT 
  id,
  prenom,
  nom,
  vehicle_type,
  statut,
  ST_X(position_actuelle::geometry) as longitude,
  ST_Y(position_actuelle::geometry) as latitude,
  ST_Distance(
    position_actuelle,
    ST_GeogFromText('POINT(-13.6125611 9.6410198)')  -- Station Shell Lambanyi
  ) / 1000.0 as distance_km_station
FROM conducteurs
WHERE id = 'c1682dd2-655e-4755-8c79-e0e837b3a457';