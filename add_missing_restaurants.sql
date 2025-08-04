-- AJOUT MANUEL DES RESTAURANTS IMPORTANTS MANQUANTS DANS OSM
-- À exécuter dans l'éditeur SQL Supabase après l'injection OSM

-- 🍽️ 2LK RESTAURANT-LOUNGE (Conakry)
-- Coordonnées approximatives basées sur votre image Google Maps
INSERT INTO adresses (
  nom, 
  nom_normalise, 
  adresse_complete, 
  ville, 
  position, 
  type_lieu, 
  actif,
  popularite,
  source_donnees
) VALUES (
  '2LK RESTAURANT-LOUNGE',
  '2lk restaurant lounge',
  '2LK Restaurant-Lounge, Conakry, Guinée',
  'conakry',
  ST_GeogFromText('POINT(-13.677 9.537)'), -- Coordonnées approximatives centre Conakry
  'restaurant',
  true,
  100, -- Popularité élevée car important pour taxi
  'manual_google_maps'
) ON CONFLICT (nom, ville) DO UPDATE SET
  nom_normalise = EXCLUDED.nom_normalise,
  adresse_complete = EXCLUDED.adresse_complete,
  position = EXCLUDED.position,
  popularite = EXCLUDED.popularite,
  source_donnees = EXCLUDED.source_donnees;

-- 🏨 AUTRES LIEUX IMPORTANTS À AJOUTER (exemples)
-- Ajoutez ici d'autres restaurants/hôtels/lieux importants pour votre bot taxi

-- Restaurant Le Damier (si manquant)
INSERT INTO adresses (
  nom, nom_normalise, adresse_complete, ville, position, type_lieu, actif, popularite, source_donnees
) VALUES (
  'Restaurant Le Damier',
  'restaurant le damier',
  'Restaurant Le Damier, Conakry, Guinée',
  'conakry',
  ST_GeogFromText('POINT(-13.680 9.540)'),
  'restaurant',
  true,
  80,
  'manual_local_knowledge'
) ON CONFLICT (nom, ville) DO NOTHING;

-- Hôtel Riviera (si manquant)
INSERT INTO adresses (
  nom, nom_normalise, adresse_complete, ville, position, type_lieu, actif, popularite, source_donnees
) VALUES (
  'Hôtel Riviera',
  'hotel riviera',
  'Hôtel Riviera, Conakry, Guinée',
  'conakry',
  ST_GeogFromText('POINT(-13.675 9.535)'),
  'hotel',
  true,
  90,
  'manual_local_knowledge'
) ON CONFLICT (nom, ville) DO NOTHING;

-- 📊 VÉRIFICATION POST-INSERTION
SELECT 
  nom,
  ville,
  type_lieu,
  popularite,
  source_donnees,
  ST_Y(position::geometry) as latitude,
  ST_X(position::geometry) as longitude
FROM adresses 
WHERE source_donnees = 'manual_google_maps' 
   OR source_donnees = 'manual_local_knowledge'
ORDER BY popularite DESC;

-- 🎯 SCRIPT DE RECHERCHE TEST
-- Tester que 2LK est maintenant trouvable
SELECT 
  nom,
  similarity(nom_normalise, '2lk restaurant') as score,
  ST_Y(position::geometry) as lat,
  ST_X(position::geometry) as lng
FROM adresses 
WHERE similarity(nom_normalise, '2lk restaurant') > 0.3
ORDER BY score DESC
LIMIT 5;