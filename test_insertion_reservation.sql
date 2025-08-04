-- ================================================
-- 🧪 TEST INSERTION MANUELLE RÉSERVATION
-- ================================================

-- 1. Test d'insertion avec données simulées (même format que le bot)
BEGIN;

-- Test d'insertion basique
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    position_depart,
    position_arrivee,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    conducteur_id
) VALUES (
    '+33620951645_TEST',
    'moto',
    ST_GeogFromText('POINT(2.5891503 48.6276644)'),  -- Paris coords
    ST_GeogFromText('POINT(-13.678 9.537)'),         -- Conakry coords  
    'Madina Centre',
    4636.9,
    13911000,
    'pending',
    NULL  -- Pas de conducteur assigné encore
);

-- Vérifier l'insertion
SELECT 
    id,
    client_phone,
    vehicle_type,
    ST_AsText(position_depart::geometry) as depart,
    ST_AsText(position_arrivee::geometry) as arrivee,
    destination_nom,
    distance_km,
    prix_total,
    statut,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645_TEST';

-- Nettoyer le test
DELETE FROM reservations WHERE client_phone = '+33620951645_TEST';

ROLLBACK;

-- 2. Test avec coordonnées exactes de la session
DO $$
DECLARE
    session_data RECORD;
    test_result TEXT;
BEGIN
    -- Récupérer les données de session
    SELECT 
        client_phone,
        vehicle_type,
        position_client,
        destination_position,
        destination_nom,
        distance_km,
        prix_estime
    INTO session_data
    FROM sessions 
    WHERE client_phone = '+33620951645'
      AND etat = 'prix_calcule'
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    IF session_data.client_phone IS NOT NULL THEN
        -- Tenter l'insertion avec les vraies données
        BEGIN
            INSERT INTO reservations (
                client_phone,
                vehicle_type,
                position_depart,
                position_arrivee,
                destination_nom,
                distance_km,
                prix_total,
                statut
            ) VALUES (
                session_data.client_phone || '_DEBUG',
                session_data.vehicle_type,
                session_data.position_client,
                session_data.destination_position,
                session_data.destination_nom,
                session_data.distance_km,
                session_data.prix_estime,
                'pending'
            );
            
            test_result := 'SUCCÈS: Insertion réussie avec données session';
            
            -- Nettoyer
            DELETE FROM reservations WHERE client_phone = session_data.client_phone || '_DEBUG';
            
        EXCEPTION WHEN OTHERS THEN
            test_result := 'ERREUR: ' || SQLERRM;
        END;
        
        RAISE NOTICE 'Résultat test insertion: %', test_result;
        RAISE NOTICE 'Vehicle type: %', session_data.vehicle_type;
        RAISE NOTICE 'Distance: %', session_data.distance_km;
        RAISE NOTICE 'Prix: %', session_data.prix_estime;
    ELSE
        RAISE NOTICE 'ERREUR: Aucune session trouvée avec etat=prix_calcule';
    END IF;
END $$;