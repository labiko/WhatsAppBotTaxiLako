-- =====================================================
-- 🧪 TEST RÉSERVATION SCHEDULED - SERVICE C# MODIFIÉ
-- =====================================================
-- 
-- OBJECTIF : Tester notification avec "Code de validation : XXXX"
-- MÉTHODE : Insert scheduled → Accept → Service C# traite
-- RÉSULTAT ATTENDU : Message WhatsApp complet avec code validation
--
-- =====================================================

-- 📊 ÉTAPE 1: Créer réservation scheduled de test
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    position_depart,
    destination_nom,
    position_arrivee,
    distance_km,
    prix_total,
    statut,
    date_reservation,
    heure_reservation,
    minute_reservation,
    code_validation,
    created_at,
    updated_at
) VALUES (
    '+33620951645',                                    -- Ton numéro
    'moto',
    ST_GeogFromText('POINT(2.3522 48.8566)'),        -- Paris Louvre
    'Aéroport Charles de Gaulle',                     -- Destination claire
    ST_GeogFromText('POINT(2.5479 49.0097)'),        -- CDG coordonnées
    35.2,                                              -- Distance Paris-CDG
    45000,                                             -- 45€
    'scheduled',                                       -- 🎯 STATUT NOUVEAU
    CURRENT_DATE + INTERVAL '1 day',                  -- Demain
    8,                                                 -- 8h
    0,                                                 -- 8h00
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0'), -- Code aléatoire 4 chiffres
    NOW(),
    NOW()
)
RETURNING 
    '✅ RÉSERVATION SCHEDULED CRÉÉE' as resultat,
    id as reservation_id,
    client_phone,
    destination_nom,
    code_validation,
    'Statut: ' || statut as statut_info;

-- 📊 ÉTAPE 2: Vérifier la création
SELECT 
    '📋 RÉSERVATION TEST SCHEDULED CRÉÉE' as titre,
    id,
    client_phone,
    statut,
    date_reservation,
    heure_reservation,
    destination_nom
FROM reservations 
WHERE client_phone = '+33620951645' 
    AND statut = 'scheduled'
    AND destination_nom = 'Test Airport Notification'
ORDER BY created_at DESC 
LIMIT 1;

-- 🎯 ÉTAPE 2: SIMULER ACCEPTATION CONDUCTEUR
-- (Exécuter APRÈS avoir récupéré l'ID ci-dessus)

-- Template à personnaliser avec l'ID réel :
/*
UPDATE reservations 
SET 
    conducteur_id = (
        SELECT id FROM conducteurs 
        WHERE vehicle_type = 'moto' 
        AND statut = 'disponible' 
        LIMIT 1
    ),
    statut = 'accepted',
    updated_at = NOW()
WHERE client_phone = '+33620951645' 
    AND statut = 'scheduled'
    AND destination_nom = 'Aéroport Charles de Gaulle'
RETURNING 
    '🎯 ACCEPTATION SIMULÉE - NOTIFICATION GÉNÉRÉE!' as resultat,
    id as reservation_id,
    'Statut: ' || statut as nouveau_statut,
    'Conducteur: ' || conducteur_id as conducteur_assigne;
*/

-- 📊 ÉTAPE 3: VÉRIFIER NOTIFICATION GÉNÉRÉE
SELECT 
    '📬 VÉRIFICATION NOTIFICATIONS :' as check_title,
    COUNT(*) as notifications_pending_count,
    'Doit être > 0 après acceptation' as attendu
FROM notifications_pending np
JOIN reservations r ON r.id = np.reservation_id
WHERE r.client_phone = '+33620951645' 
    AND r.destination_nom = 'Aéroport Charles de Gaulle'
    AND np.processed_at IS NULL;

-- 📱 INSTRUCTIONS FINALES
SELECT '📱 RÉSULTAT ATTENDU WHATSAPP (+33620951645) :' as instructions;
SELECT '✅ CONDUCTEUR ASSIGNÉ' as message_line_1;
SELECT '🚖 [Nom Conducteur] • ⭐ [Note]/5' as message_line_2;
SELECT '📱 [Téléphone conducteur]' as message_line_3;
SELECT '🚗 [Couleur Marque Modèle]' as message_line_4;
SELECT '🏷️ [Plaque]' as message_line_5;
SELECT '🔐 *Code de validation : [4 chiffres]*' as message_line_6_important;
SELECT '💰 *45000 GNF*' as message_line_7;
SELECT 'Arrivée dans ⏰ *[X] min*' as message_line_8;
SELECT 'Le conducteur vous contactera bientôt. Bon voyage! 🛣️' as message_line_9;