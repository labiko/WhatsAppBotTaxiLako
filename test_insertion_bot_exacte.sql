-- ===============================================
-- 🧪 TEST INSERTION EXACTE - MÊMES VALEURS QUE LE BOT
-- ===============================================

-- Données extraites des logs de session (debug_reservation.txt ligne 113)
-- client_phone: +33620951645
-- vehicle_type: moto  
-- destination_nom: Madina
-- destination_id: c22fa7f9-d150-4f51-aa27-93f38109c5c8
-- distance_km: 4636.87
-- prix_estime: 13911000.00
-- position_client (GPS): POINT(2.5891503 48.6276644) -- Paris
-- destination_position: 0101000020E61000004B8D751662FA27C0CCA1A06F668B2140 -- Binaire

-- 1. Test avec les VRAIES valeurs du bot
INSERT INTO reservations (
    client_phone,
    conducteur_id,
    vehicle_type,
    position_depart,
    destination_nom,
    destination_id,
    position_arrivee,
    distance_km,
    prix_total,
    statut
) VALUES (
    '+33620951645',
    NULL,
    'moto',
    'POINT(2.5891503 48.6276644)',  -- Format TEXT comme le fix du bot
    'Madina',
    'c22fa7f9-d150-4f51-aa27-93f38109c5c8'::uuid,  -- UUID de la session
    '0101000020E61000004B8D751662FA27C0CCA1A06F668B2140'::geography,  -- Binaire exact de la session
    4636.87,
    13911000.00,
    'pending'
);

-- 2. Vérifier l'insertion
SELECT 
    id,
    client_phone,
    vehicle_type,
    position_depart,
    destination_nom,
    destination_id,
    ST_AsText(position_arrivee::geometry) as position_arrivee_readable,
    distance_km,
    prix_total,
    statut,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645'
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Nettoyer le test si tout va bien
-- DELETE FROM reservations WHERE client_phone = '+33620951645' AND statut = 'pending';

-- ===============================================
-- 🔍 TESTS ALTERNATIFS SI L'INSERTION ÉCHOUE
-- ===============================================

-- Test A: Sans destination_id (au cas où FK échoue)
/*
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    position_depart,
    destination_nom,
    distance_km,
    prix_total,
    statut
) VALUES (
    '+33620951645_TEST_A',
    'moto',
    'POINT(2.5891503 48.6276644)',
    'Madina',
    4636.87,
    13911000.00,
    'pending'
);
*/

-- Test B: Sans position_arrivee (au cas où GEOGRAPHY échoue)  
/*
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    position_depart,
    destination_nom,
    destination_id,
    distance_km,
    prix_total,
    statut
) VALUES (
    '+33620951645_TEST_B',
    'moto',
    'POINT(2.5891503 48.6276644)',
    'Madina',
    'c22fa7f9-d150-4f51-aa27-93f38109c5c8'::uuid,
    4636.87,
    13911000.00,
    'pending'
);
*/

-- Test C: Vérifier si l'UUID destination existe
SELECT 
    id,
    nom,
    ville,
    ST_AsText(position::geometry) as coords
FROM adresses 
WHERE id = 'c22fa7f9-d150-4f51-aa27-93f38109c5c8';

-- Test D: Vérifier les contraintes qui pourraient échouer
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'reservations' 
    AND constraint_type IN ('FOREIGN KEY', 'CHECK');