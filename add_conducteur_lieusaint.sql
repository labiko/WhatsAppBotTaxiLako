-- Script SQL pour ajouter des conducteurs à Lieusaint 77127
-- Coordonnées GPS de Lieusaint: 48.6276, 2.5891 (proche de votre position de test)

-- 1. Conducteur MOTO
INSERT INTO conducteurs (
    nom,
    prenom,
    telephone,
    vehicle_type,
    vehicle_marque,
    vehicle_modele,
    vehicle_couleur,
    vehicle_plaque,
    position_actuelle,
    statut,
    note_moyenne,
    nombre_courses,
    date_inscription,
    derniere_activite,
    actif
) VALUES (
    'Diallo',
    'Mamadou',
    '+33620951999',
    'moto',
    'Yamaha',
    'NMAX 125',
    'Noir',
    'AB-123-CD',
    ST_GeogFromText('POINT(2.5891 48.6276)'),  -- Coordonnées Lieusaint
    'disponible',
    4.8,
    42,
    NOW(),
    NOW(),
    true
);

-- 2. Conducteur VOITURE  
INSERT INTO conducteurs (
    nom,
    prenom,
    telephone,
    vehicle_type,
    vehicle_marque,
    vehicle_modele,
    vehicle_couleur,
    vehicle_plaque,
    position_actuelle,
    statut,
    note_moyenne,
    nombre_courses,
    date_inscription,
    derniere_activite,
    actif
) VALUES (
    'Martin',
    'Pierre',
    '+33620952000',
    'voiture',
    'Renault',
    'Clio V',
    'Blanc',
    'EF-456-GH',
    ST_GeogFromText('POINT(2.5900 48.6280)'),  -- Légèrement décalé
    'disponible',
    4.5,
    28,
    NOW(),
    NOW(),
    true
);

-- Vérification: voir les nouveaux conducteurs ajoutés
SELECT 
    nom,
    prenom,
    vehicle_type,
    vehicle_marque,
    vehicle_modele,
    statut,
    ST_AsText(position_actuelle::geometry) as coordinates,
    ROUND(
        ST_Distance(
            position_actuelle::geography,
            ST_MakePoint(2.5891535, 48.627667)::geography
        )::numeric, 
        0
    ) as distance_from_test_point_meters
FROM conducteurs 
WHERE nom IN ('Diallo', 'Martin')
ORDER BY distance_from_test_point_meters;

-- Test de la vue conducteurs_with_coords si elle existe
SELECT 
    nom,
    prenom,
    vehicle_type,
    latitude,
    longitude,
    statut
FROM conducteurs_with_coords 
WHERE nom IN ('Diallo', 'Martin');