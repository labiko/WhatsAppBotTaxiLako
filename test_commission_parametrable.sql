-- ========================================
-- TESTS SYSTÈME COMMISSION PARAMÉTRABLE - SCRIPT COMPLET
-- ========================================
-- Description: Tests fonctionnels pour valider le système commission
-- Usage: Exécuter après installation du système commission paramétrable
-- ========================================

-- 🧪 PRÉPARATION ENVIRONNEMENT DE TEST
-- ========================================

-- Nettoyer les données de test précédentes
DELETE FROM commission_history WHERE created_by LIKE 'test_%';
DELETE FROM entreprises WHERE nom LIKE 'TEST_%';

SELECT '🧪 DÉBUT DES TESTS SYSTÈME COMMISSION PARAMÉTRABLE' as test_status;

-- ========================================
-- 📋 TEST 1: COMMISSION 0% PAR DÉFAUT
-- ========================================

SELECT '📋 TEST 1: Commission 0% par défaut' as test_name;

-- Créer entreprise sans commission
INSERT INTO entreprises (nom, responsable) 
VALUES ('TEST_ZERO_DEFAULT', 'Test Manager')
RETURNING id as entreprise_test_id;

-- Tester commission par défaut
DO $$
DECLARE
    test_entreprise_id UUID;
    commission_defaut DECIMAL(5,2);
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE) INTO commission_defaut;
    
    IF commission_defaut = 0.00 THEN
        RAISE NOTICE '✅ TEST 1 PASS: Commission par défaut = 0%% ✓';
    ELSE
        RAISE NOTICE '❌ TEST 1 FAIL: Commission par défaut = %% (attendu: 0%%)', commission_defaut;
    END IF;
END $$;

-- ========================================
-- 📋 TEST 2: CONFIGURATION COMMISSION FUTURE
-- ========================================

SELECT '📋 TEST 2: Configuration commission future' as test_name;

DO $$
DECLARE
    test_entreprise_id UUID;
    commission_avant DECIMAL(5,2);
    commission_apres DECIMAL(5,2);
    date_future DATE := CURRENT_DATE + INTERVAL '5 days';
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    -- Programmer commission 18% dans 5 jours
    PERFORM set_commission_taux(
        test_entreprise_id, 
        18.00, 
        date_future,
        'Test commission future',
        'test_user_2'
    );
    
    -- Vérifier avant et après la date
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE) INTO commission_avant;
    SELECT get_commission_taux(test_entreprise_id, date_future) INTO commission_apres;
    
    IF commission_avant = 0.00 AND commission_apres = 18.00 THEN
        RAISE NOTICE '✅ TEST 2 PASS: Commission future OK (0%% -> 18%% le %) ✓', date_future;
    ELSE
        RAISE NOTICE '❌ TEST 2 FAIL: Commission future KO (%% avant, %% après)', commission_avant, commission_apres;
    END IF;
END $$;

-- ========================================
-- 📋 TEST 3: MODIFICATION COMMISSION AVEC HISTORIQUE
-- ========================================

SELECT '📋 TEST 3: Modification commission avec historique' as test_name;

DO $$
DECLARE
    test_entreprise_id UUID;
    commission_periode1 DECIMAL(5,2);
    commission_periode2 DECIMAL(5,2);
    commission_periode3 DECIMAL(5,2);
    date_changement1 DATE := CURRENT_DATE + INTERVAL '10 days';
    date_changement2 DATE := CURRENT_DATE + INTERVAL '20 days';
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    -- Premier changement : 15% dans 10 jours
    PERFORM set_commission_taux(
        test_entreprise_id, 
        15.00, 
        date_changement1,
        'Premier taux commission',
        'test_user_3a'
    );
    
    -- Deuxième changement : 25% dans 20 jours
    PERFORM set_commission_taux(
        test_entreprise_id, 
        25.00, 
        date_changement2,
        'Augmentation commission',
        'test_user_3b'
    );
    
    -- Vérifier les trois périodes
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE + 8) INTO commission_periode1; -- Avant premier changement
    SELECT get_commission_taux(test_entreprise_id, date_changement1 + 3) INTO commission_periode2; -- Entre les deux
    SELECT get_commission_taux(test_entreprise_id, date_changement2 + 3) INTO commission_periode3; -- Après deuxième
    
    IF commission_periode1 = 18.00 AND commission_periode2 = 15.00 AND commission_periode3 = 25.00 THEN
        RAISE NOTICE '✅ TEST 3 PASS: Historique commission OK (18%% -> 15%% -> 25%%) ✓';
    ELSE
        RAISE NOTICE '❌ TEST 3 FAIL: Historique KO (%%, %%, %%)', commission_periode1, commission_periode2, commission_periode3;
    END IF;
END $$;

-- ========================================
-- 📋 TEST 4: CONDUCTEUR FREELANCE VS ENTREPRISE
-- ========================================

SELECT '📋 TEST 4: Conducteur Freelance vs Entreprise' as test_name;

-- Créer conducteurs de test
INSERT INTO conducteurs (nom, telephone, vehicle_type, entreprise_id, actif)
VALUES 
    ('TEST_FREELANCE', '+224 600 000 001', 'moto', NULL, true),
    ('TEST_ENTREPRISE', '+224 600 000 002', 'voiture', 
     (SELECT id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT'), true);

-- Vérifier les commissions via la vue
SELECT 
    '👤 ' || nom as conducteur,
    type_conducteur,
    commission_display,
    CASE 
        WHEN nom = 'TEST_FREELANCE' AND commission_display = '0% (Freelance)' THEN '✅ PASS'
        WHEN nom = 'TEST_ENTREPRISE' AND commission_actuelle > 0 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as test_result
FROM conducteurs_avec_commission
WHERE nom IN ('TEST_FREELANCE', 'TEST_ENTREPRISE')
ORDER BY nom;

-- ========================================
-- 📋 TEST 5: SUPPRESSION COMMISSION
-- ========================================

SELECT '📋 TEST 5: Suppression commission' as test_name;

DO $$
DECLARE
    test_entreprise_id UUID;
    commission_avant DECIMAL(5,2);
    commission_apres DECIMAL(5,2);
    date_suppression DATE := CURRENT_DATE + INTERVAL '25 days';
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    -- Commission avant suppression
    SELECT get_commission_taux(test_entreprise_id, date_suppression - 1) INTO commission_avant;
    
    -- Supprimer commission à partir d'une date
    PERFORM remove_commission(
        test_entreprise_id,
        date_suppression,
        'Test suppression commission',
        'test_user_5'
    );
    
    -- Commission après suppression
    SELECT get_commission_taux(test_entreprise_id, date_suppression + 1) INTO commission_apres;
    
    IF commission_avant > 0 AND commission_apres = 0.00 THEN
        RAISE NOTICE '✅ TEST 5 PASS: Suppression commission OK (%% -> 0%%) ✓', commission_avant;
    ELSE
        RAISE NOTICE '❌ TEST 5 FAIL: Suppression KO (%% -> %%)', commission_avant, commission_apres;
    END IF;
END $$;

-- ========================================
-- 📋 TEST 6: CONTRAINTES ET VALIDATIONS
-- ========================================

SELECT '📋 TEST 6: Contraintes et validations' as test_name;

-- Test taux négatif (doit échouer)
DO $$
DECLARE
    test_entreprise_id UUID;
    result BOOLEAN;
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    BEGIN
        INSERT INTO commission_history (entreprise_id, taux_commission, date_debut)
        VALUES (test_entreprise_id, -5.00, CURRENT_DATE);
        RAISE NOTICE '❌ TEST 6a FAIL: Taux négatif accepté (ne devrait pas)';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ TEST 6a PASS: Taux négatif rejeté ✓';
    END;
END $$;

-- Test taux > 100% (doit échouer)
DO $$
DECLARE
    test_entreprise_id UUID;
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    BEGIN
        INSERT INTO commission_history (entreprise_id, taux_commission, date_debut)
        VALUES (test_entreprise_id, 150.00, CURRENT_DATE);
        RAISE NOTICE '❌ TEST 6b FAIL: Taux > 100%% accepté (ne devrait pas)';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '✅ TEST 6b PASS: Taux > 100%% rejeté ✓';
    END;
END $$;

-- ========================================
-- 📋 TEST 7: PERFORMANCE FONCTION get_commission_taux
-- ========================================

SELECT '📋 TEST 7: Performance fonction get_commission_taux' as test_name;

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    test_entreprise_id UUID;
    i INTEGER;
    dummy_result DECIMAL(5,2);
BEGIN
    SELECT id INTO test_entreprise_id FROM entreprises WHERE nom = 'TEST_ZERO_DEFAULT';
    
    start_time := clock_timestamp();
    
    -- Exécuter 1000 fois la fonction
    FOR i IN 1..1000 LOOP
        SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE) INTO dummy_result;
    END LOOP;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    IF EXTRACT(MILLISECONDS FROM duration) < 1000 THEN -- Moins de 1 seconde pour 1000 appels
        RAISE NOTICE '✅ TEST 7 PASS: Performance OK (1000 appels en %) ✓', duration;
    ELSE
        RAISE NOTICE '⚠️ TEST 7 WARNING: Performance lente (1000 appels en %)', duration;
    END IF;
END $$;

-- ========================================
-- 📋 TEST 8: INTÉGRITÉ HISTORIQUE
-- ========================================

SELECT '📋 TEST 8: Intégrité historique' as test_name;

-- Vérifier qu'il n'y a pas de chevauchement de dates
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TEST 8 PASS: Aucun chevauchement de dates ✓'
        ELSE '❌ TEST 8 FAIL: ' || COUNT(*) || ' chevauchements détectés'
    END as test_result
FROM (
    SELECT ch1.entreprise_id
    FROM commission_history ch1
    JOIN commission_history ch2 ON ch1.entreprise_id = ch2.entreprise_id 
        AND ch1.id != ch2.id
        AND ch1.actif = true AND ch2.actif = true
        AND ch1.date_debut <= COALESCE(ch2.date_fin, '9999-12-31')
        AND ch2.date_debut <= COALESCE(ch1.date_fin, '9999-12-31')
) chevauchements;

-- ========================================
-- 📊 RAPPORT DE TESTS
-- ========================================

SELECT '📊 RAPPORT FINAL DES TESTS' as section;

-- Statistiques historique de test
SELECT 
    '📈 DONNÉES TEST' as type,
    COUNT(*) as total_entrees,
    COUNT(CASE WHEN created_by LIKE 'test_%' THEN 1 END) as entrees_test,
    MIN(date_debut) as premiere_date,
    MAX(date_debut) as derniere_date
FROM commission_history;

-- Vérification entreprise de test
SELECT 
    '🏢 ENTREPRISE TEST' as type,
    nom as entreprise,
    get_commission_taux(id, CURRENT_DATE) as commission_actuelle,
    get_commission_taux(id, CURRENT_DATE + 30) as commission_dans_30j
FROM entreprises 
WHERE nom = 'TEST_ZERO_DEFAULT';

-- Historique complet de test
SELECT 
    '📚 HISTORIQUE TEST' as type,
    taux_commission || '%' as taux,
    date_debut,
    date_fin,
    statut,
    motif
FROM historique_commissions 
WHERE entreprise_nom = 'TEST_ZERO_DEFAULT'
ORDER BY date_debut;

-- ========================================
-- 🧹 NETTOYAGE DONNÉES DE TEST
-- ========================================

SELECT '🧹 NETTOYAGE DONNÉES DE TEST' as section;

-- Supprimer conducteurs de test
DELETE FROM conducteurs WHERE nom IN ('TEST_FREELANCE', 'TEST_ENTREPRISE');
SELECT 'Conducteurs de test supprimés' as action;

-- Supprimer historique de test
DELETE FROM commission_history WHERE created_by LIKE 'test_%';
SELECT 'Historique de test supprimé' as action;

-- Supprimer entreprise de test
DELETE FROM entreprises WHERE nom LIKE 'TEST_%';
SELECT 'Entreprises de test supprimées' as action;

-- ========================================
-- ✅ TESTS TERMINÉS
-- ========================================

SELECT 
    '✅ TESTS SYSTÈME COMMISSION PARAMÉTRABLE TERMINÉS' as status,
    'Tous les tests de base ont été exécutés' as description,
    'Vérifier les messages ✅ PASS / ❌ FAIL ci-dessus' as instruction;

-- ========================================
-- 📋 TESTS MANUELS RECOMMANDÉS
-- ========================================

/*
📋 TESTS MANUELS À EFFECTUER:

1. 🎯 Test Interface Utilisateur:
   - Créer entreprise via interface admin
   - Modifier commission via interface
   - Vérifier affichage historique

2. 🤖 Test Intégration Bot WhatsApp:
   - Réservation avec conducteur freelance
   - Réservation avec conducteur d'entreprise
   - Vérifier calcul commission dans confirmation

3. 📊 Test Rapports:
   - Générer rapport mensuel commissions
   - Exporter données historique
   - Vérifier cohérence calculs

4. 🔐 Test Sécurité:
   - Permissions modification commission
   - Audit trail des changements
   - Validation données d'entrée

5. ⚡ Test Performance:
   - Test avec 1000+ entreprises
   - Test avec historique 1 an+
   - Temps de réponse vues complexes

COMMANDES UTILES POUR TESTS MANUELS:

-- Créer scénario test complet
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'VOTRE_ENTREPRISE'),
    15.00,
    '2025-08-01',
    'Test manuel',
    'votre_nom'
);

-- Simuler réservation avec commission
SELECT 
    'Réservation 50000 GNF' as course,
    get_commission_taux(
        (SELECT entreprise_id FROM conducteurs WHERE nom = 'VOTRE_CONDUCTEUR'),
        CURRENT_DATE
    ) as taux_commission,
    (50000 * get_commission_taux(
        (SELECT entreprise_id FROM conducteurs WHERE nom = 'VOTRE_CONDUCTEUR'),
        CURRENT_DATE
    ) / 100) as montant_commission;

-- Voir évolution commission dans le temps
SELECT 
    date_debut,
    taux_commission,
    get_commission_taux(
        (SELECT id FROM entreprises WHERE nom = 'VOTRE_ENTREPRISE'),
        date_debut
    ) as taux_effectif
FROM commission_history
WHERE entreprise_id = (SELECT id FROM entreprises WHERE nom = 'VOTRE_ENTREPRISE')
ORDER BY date_debut;
*/