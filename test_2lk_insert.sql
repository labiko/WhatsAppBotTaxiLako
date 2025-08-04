-- 🧪 TEST INSERTION 2LK RESTAURANT-LOUNGE
-- Pour tester l'injection directement en base

-- Test avec 2LK Restaurant spécifiquement
INSERT INTO public.adresses (
    nom,
    nom_normalise,
    adresse_complete,
    ville,
    position,
    type_lieu,
    actif,
    source_donnees,
    telephone,
    note_moyenne,
    metadata
) VALUES (
    '2LK RESTAURANT-LOUNGE',
    '2lk restaurant-lounge',
    'Conakry, Guinée',
    'conakry',
    ST_GeogFromText('POINT(-13.677 9.537)'),
    'restaurant',
    true,
    'google_places_grid_search',
    '+224 XXX XX XX XX',
    4.8,
    '{"google_place_id": "test_2lk", "business_status": "OPERATIONAL", "types": ["restaurant", "food", "establishment"]}'::jsonb
) ON CONFLICT (nom) DO UPDATE SET
    telephone = EXCLUDED.telephone,
    note_moyenne = EXCLUDED.note_moyenne,
    source_donnees = EXCLUDED.source_donnees,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- Vérification
SELECT nom, telephone, note_moyenne, source_donnees 
FROM public.adresses 
WHERE nom ILIKE '%2LK%';