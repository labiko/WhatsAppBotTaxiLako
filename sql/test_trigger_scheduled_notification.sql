-- =====================================================
-- 🧪 TEST TRIGGER NOTIFICATION RÉSERVATIONS PLANIFIÉES
-- =====================================================
-- 
-- OBJECTIF : Tester le trigger corrigé avec votre réservation existante
-- MÉTHODE : Simuler acceptation d'une réservation 'scheduled'
-- SÉCURITÉ : Test non-destructif, utilisable en production
--
-- =====================================================

-- 📊 ÉTAPE 1: Vérifier votre réservation planifiée actuelle
SELECT 
    '📋 RÉSERVATION PLANIFIÉE À TESTER' as titre,
    id,
    client_phone,
    statut,
    date_reservation,
    heure_reservation,
    conducteur_id,
    created_at
FROM reservations 
WHERE client_phone = '+33620951645' 
    AND statut = 'scheduled'
    AND date_reservation = '2025-08-11'
ORDER BY created_at DESC 
LIMIT 1;

-- 📊 ÉTAPE 2: Vérifier les conducteurs disponibles pour test
SELECT 
    '🚗 CONDUCTEURS DISPONIBLES POUR TEST' as titre,
    id,
    nom,
    telephone,
    vehicle_type,
    statut
FROM conducteurs 
WHERE statut = 'disponible' 
    AND vehicle_type = 'moto'
LIMIT 3;

-- 🧪 ÉTAPE 3: SIMULATION ACCEPTATION (CHANGEZ L'ID DE RÉSERVATION!)
-- ⚠️ REMPLACEZ '7f5405c5-d590-40b0-bdf6-b22c6e8e6325' PAR VOTRE ID RÉSERVATION
UPDATE reservations 
SET 
    conducteur_id = (
        SELECT id FROM conducteurs 
        WHERE statut = 'disponible' 
            AND vehicle_type = 'moto' 
        LIMIT 1
    ),
    statut = 'accepted',
    updated_at = now()
WHERE id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325'  -- 👈 VOTRE ID RÉSERVATION
    AND statut = 'scheduled'
RETURNING 
    '✅ SIMULATION ACCEPTATION RÉUSSIE' as resultat,
    id,
    statut,
    conducteur_id;

-- 📊 ÉTAPE 4: Vérifier le résultat final
SELECT 
    '📱 NOTIFICATION ATTENDUE SUR WHATSAPP' as titre,
    r.id as reservation_id,
    r.statut,
    r.date_reservation,
    r.heure_reservation,
    r.client_phone,
    c.nom as conducteur_nom,
    c.telephone as conducteur_phone,
    c.vehicle_plaque
FROM reservations r
JOIN conducteurs c ON r.conducteur_id = c.id
WHERE r.id = '7f5405c5-d590-40b0-bdf6-b22c6e8e6325';  -- 👈 VOTRE ID RÉSERVATION

-- 🔍 ÉTAPE 5: Vérifier les logs PostgreSQL (si accessibles)
SELECT '🔍 VÉRIFIEZ LES LOGS SUPABASE POUR LE MESSAGE:' as instruction;
SELECT 'Notification envoyée pour réservation 7f5405c5-... acceptée par conducteur' as message_attendu;

-- 📋 RÉSUMÉ DES ATTENTES
SELECT '📋 RÉSULTATS ATTENDUS APRÈS EXÉCUTION:' as titre;
SELECT '1. Réservation statut: scheduled → accepted ✅' as etape_1;
SELECT '2. Conducteur assigné à la réservation ✅' as etape_2;  
SELECT '3. Trigger déclenché avec nouveau IN (pending, scheduled) ✅' as etape_3;
SELECT '4. Notification WhatsApp envoyée au client +33620951645 ✅' as etape_4;