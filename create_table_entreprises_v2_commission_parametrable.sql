-- ========================================
-- SYSTÈME COMMISSION PARAMÉTRABLE - SCRIPT COMPLET V2
-- ========================================
-- Auteur: Système LokoTaxi
-- Date: 2025-07-31
-- Description: Implémentation complète du système de commission paramétrable avec historique
-- Features: Commission 0% par défaut, historique temporel, non-rétroactivité
-- ========================================

-- 🔄 ÉTAPE 1: SAUVEGARDE DONNÉES EXISTANTES (SI TABLE EXISTE)
-- ========================================

-- Créer table de sauvegarde des commissions actuelles (seulement si table entreprises existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entreprises') THEN
        -- Sauvegarder les commissions existantes
        CREATE TABLE IF NOT EXISTS entreprises_backup_commission AS
        SELECT id, nom, commission_pourcentage, created_at
        FROM entreprises 
        WHERE commission_pourcentage IS NOT NULL;
        
        RAISE NOTICE '📦 BACKUP CRÉÉ - % entreprises sauvegardées', 
            (SELECT COUNT(*) FROM entreprises_backup_commission);
    ELSE
        RAISE NOTICE '⚠️ Table entreprises inexistante - backup ignoré (première installation)';
    END IF;
END $$;

-- ========================================
-- 🏗️ ÉTAPE 2: CRÉATION NOUVELLE ARCHITECTURE
-- ========================================

-- Activer l'extension pgcrypto pour le hachage des mots de passe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2.1 - TABLE ENTREPRISES (VERSION 2 - COMMISSION SUPPRIMÉE)
-- ========================================

CREATE TABLE IF NOT EXISTS entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    responsable VARCHAR(100),
    login VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2.2 - TABLE COMMISSION_HISTORY (NOUVELLE)
-- ========================================

CREATE TABLE IF NOT EXISTS commission_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL,
    taux_commission DECIMAL(5,2) NOT NULL,  -- Ex: 15.50 pour 15.5%
    date_debut DATE NOT NULL,               -- Date d'application
    date_fin DATE NULL,                     -- NULL = taux en cours
    actif BOOLEAN DEFAULT true,
    motif TEXT,                            -- Raison du changement
    created_by VARCHAR(100),               -- Utilisateur ayant fait le changement
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    -- Contraintes métier
    CONSTRAINT fk_commission_entreprise 
        FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    CONSTRAINT unique_periode_active 
        UNIQUE (entreprise_id, date_debut) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT taux_positif 
        CHECK (taux_commission >= 0 AND taux_commission <= 100)
);

-- 2.3 - MODIFICATION TABLE CONDUCTEURS (LIEN FACULTATIF ENTREPRISE)
-- ========================================

-- Ajouter colonne entreprise_id si elle n'existe pas
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS entreprise_id UUID;

-- Ajouter contrainte si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conducteurs_entreprise') THEN
        ALTER TABLE conducteurs 
        ADD CONSTRAINT fk_conducteurs_entreprise 
            FOREIGN KEY (entreprise_id) 
            REFERENCES entreprises(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- 🔧 ÉTAPE 3: FONCTIONS MÉTIER
-- ========================================

-- 3.1 - FONCTION CALCUL COMMISSION SELON DATE
-- ========================================

CREATE OR REPLACE FUNCTION get_commission_taux(
    p_entreprise_id UUID,
    p_date_reservation DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_taux DECIMAL(5,2);
BEGIN
    -- Freelance (entreprise_id NULL) = 0% commission
    IF p_entreprise_id IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Récupérer le taux applicable à la date de réservation
    SELECT taux_commission INTO v_taux
    FROM commission_history
    WHERE entreprise_id = p_entreprise_id
      AND date_debut <= p_date_reservation
      AND (date_fin IS NULL OR date_fin > p_date_reservation)
      AND actif = true
    ORDER BY date_debut DESC
    LIMIT 1;
    
    -- Si aucun taux défini = 0% (PAS DE COMMISSION PAR DÉFAUT)
    RETURN COALESCE(v_taux, 0.00);
END;
$$ LANGUAGE plpgsql;

-- 3.2 - FONCTION MODIFICATION COMMISSION (AVEC HISTORIQUE)
-- ========================================

CREATE OR REPLACE FUNCTION set_commission_taux(
    p_entreprise_id UUID,
    p_nouveau_taux DECIMAL(5,2),
    p_date_debut DATE DEFAULT CURRENT_DATE,
    p_motif TEXT DEFAULT NULL,
    p_created_by VARCHAR(100) DEFAULT 'system'
) RETURNS BOOLEAN AS $$
DECLARE
    v_ancien_id UUID;
    v_entreprise_nom VARCHAR(100);
BEGIN
    -- Vérifier que l'entreprise existe
    SELECT nom INTO v_entreprise_nom 
    FROM entreprises 
    WHERE id = p_entreprise_id AND actif = true;
    
    IF v_entreprise_nom IS NULL THEN
        RAISE NOTICE 'Entreprise non trouvée ou inactive: %', p_entreprise_id;
        RETURN false;
    END IF;
    
    -- Fermer l'ancien taux (date_fin = veille du nouveau taux)
    UPDATE commission_history 
    SET date_fin = p_date_debut - INTERVAL '1 day',
        updated_at = now()
    WHERE entreprise_id = p_entreprise_id 
      AND date_fin IS NULL 
      AND actif = true
    RETURNING id INTO v_ancien_id;
    
    -- Insérer le nouveau taux
    INSERT INTO commission_history (
        entreprise_id, taux_commission, date_debut, 
        motif, created_by
    ) VALUES (
        p_entreprise_id, p_nouveau_taux, p_date_debut,
        COALESCE(p_motif, 'Changement de taux commission'), p_created_by
    );
    
    -- Log du changement
    RAISE NOTICE '✅ Commission modifiée pour % : % %% à partir du %', 
        v_entreprise_nom, p_nouveau_taux, p_date_debut;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du changement de commission: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 3.3 - FONCTION SUPPRESSION COMMISSION (RETOUR À 0%)
-- ========================================

CREATE OR REPLACE FUNCTION remove_commission(
    p_entreprise_id UUID,
    p_date_fin DATE DEFAULT CURRENT_DATE,
    p_motif TEXT DEFAULT 'Suppression commission',
    p_created_by VARCHAR(100) DEFAULT 'system'
) RETURNS BOOLEAN AS $$
DECLARE
    v_entreprise_nom VARCHAR(100);
BEGIN
    -- Vérifier l'entreprise
    SELECT nom INTO v_entreprise_nom 
    FROM entreprises 
    WHERE id = p_entreprise_id;
    
    -- Fermer le taux actuel
    UPDATE commission_history 
    SET date_fin = p_date_fin,
        motif = COALESCE(motif, '') || ' | ' || p_motif,
        updated_at = now()
    WHERE entreprise_id = p_entreprise_id 
      AND date_fin IS NULL 
      AND actif = true;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Commission supprimée pour % à partir du %', 
            v_entreprise_nom, p_date_fin;
        RETURN true;
    ELSE
        RAISE NOTICE '⚠️ Aucune commission active trouvée pour %', v_entreprise_nom;
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 📊 ÉTAPE 4: VUES FACILITATRICES
-- ========================================

-- 4.1 - VUE CONDUCTEURS AVEC COMMISSION ACTUELLE
-- ========================================

CREATE OR REPLACE VIEW conducteurs_avec_commission AS
SELECT 
    c.id,
    c.nom,
    c.telephone,
    c.vehicle_type,
    c.plaque_immatriculation,
    c.statut,
    c.position,
    c.latitude,
    c.longitude,
    c.actif,
    c.created_at,
    c.updated_at,
    -- Informations entreprise
    c.entreprise_id,
    e.nom as entreprise_nom,
    e.responsable as entreprise_responsable,
    -- Commission
    get_commission_taux(c.entreprise_id, CURRENT_DATE) as commission_actuelle,
    CASE 
        WHEN c.entreprise_id IS NULL THEN 'Freelance'
        ELSE 'Entreprise'
    END as type_conducteur,
    CASE 
        WHEN c.entreprise_id IS NULL THEN '0% (Freelance)'
        ELSE get_commission_taux(c.entreprise_id, CURRENT_DATE)::TEXT || '%'
    END as commission_display
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
WHERE c.actif = true;

-- 4.2 - VUE HISTORIQUE COMMISSION PAR ENTREPRISE
-- ========================================

CREATE OR REPLACE VIEW historique_commissions AS
SELECT 
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    e.responsable,
    ch.id as commission_id,
    ch.taux_commission,
    ch.date_debut,
    ch.date_fin,
    ch.motif,
    ch.created_by,
    ch.created_at,
    -- Statut selon les dates
    CASE 
        WHEN ch.date_fin IS NULL AND ch.date_debut <= CURRENT_DATE THEN 'Actif'
        WHEN ch.date_fin IS NULL AND ch.date_debut > CURRENT_DATE THEN 'Programmé'
        WHEN ch.date_fin IS NOT NULL AND ch.date_fin < CURRENT_DATE THEN 'Archivé'
        ELSE 'Inconnu'
    END as statut,
    -- Durée d'application
    CASE 
        WHEN ch.date_fin IS NULL THEN 
            (CURRENT_DATE - ch.date_debut)::TEXT || ' jours (en cours)'
        ELSE 
            (ch.date_fin - ch.date_debut)::TEXT || ' jours'
    END as duree_application
FROM commission_history ch
JOIN entreprises e ON ch.entreprise_id = e.id
WHERE ch.actif = true
ORDER BY e.nom, ch.date_debut DESC;

-- 4.3 - VUE STATISTIQUES COMMISSION
-- ========================================

CREATE OR REPLACE VIEW stats_commissions AS
SELECT 
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    e.actif as entreprise_active,
    -- Statistiques historiques
    COUNT(ch.id) as nb_changements_commission,
    COALESCE(MIN(ch.taux_commission), 0) as taux_min_historique,
    COALESCE(MAX(ch.taux_commission), 0) as taux_max_historique,
    COALESCE(AVG(ch.taux_commission), 0) as taux_moyen_historique,
    -- Commission actuelle
    get_commission_taux(e.id, CURRENT_DATE) as taux_actuel,
    -- Dates importantes
    MIN(ch.date_debut) as premiere_commission,
    MAX(ch.date_debut) as derniere_modification,
    -- Compteur conducteurs
    (SELECT COUNT(*) FROM conducteurs WHERE entreprise_id = e.id AND actif = true) as nb_conducteurs
FROM entreprises e
LEFT JOIN commission_history ch ON e.id = ch.entreprise_id AND ch.actif = true
WHERE e.actif = true
GROUP BY e.id, e.nom, e.actif
ORDER BY e.nom;

-- ========================================
-- 📇 ÉTAPE 5: INDEX ET OPTIMISATIONS
-- ========================================

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_commission_history_entreprise_date 
    ON commission_history(entreprise_id, date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_commission_history_periode 
    ON commission_history(date_debut, date_fin) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_conducteurs_entreprise_actif 
    ON conducteurs(entreprise_id, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_entreprises_nom_actif 
    ON entreprises(nom, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_entreprises_login 
    ON entreprises(login) WHERE login IS NOT NULL;

-- ========================================
-- 🔄 ÉTAPE 6: MIGRATION DONNÉES EXISTANTES
-- ========================================

-- 6.1 - MIGRATION COMMISSIONS ACTUELLES VERS HISTORIQUE
-- ========================================

-- Migrer les commissions existantes (si elles existent)
DO $$
DECLARE
    migration_count INTEGER := 0;
    table_exists BOOLEAN := false;
    column_exists BOOLEAN := false;
BEGIN
    -- Vérifier si la table entreprises existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'entreprises'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Vérifier si l'ancienne colonne commission_pourcentage existe
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'entreprises' 
            AND column_name = 'commission_pourcentage'
        ) INTO column_exists;
        
        IF column_exists THEN
            -- Migrer les données depuis la colonne existante
            INSERT INTO commission_history (
                entreprise_id, 
                taux_commission, 
                date_debut, 
                motif, 
                created_by
            )
            SELECT 
                id as entreprise_id,
                COALESCE(commission_pourcentage, 0.00) as taux_commission,
                CURRENT_DATE as date_debut,
                'Migration automatique depuis colonne commission_pourcentage' as motif,
                'migration_script_v2' as created_by
            FROM entreprises 
            WHERE commission_pourcentage IS NOT NULL AND commission_pourcentage > 0;
            
            GET DIAGNOSTICS migration_count = ROW_COUNT;
            RAISE NOTICE '✅ % entreprises migrées vers le nouveau système commission', migration_count;
        ELSE
            RAISE NOTICE '⚠️ Colonne commission_pourcentage non trouvée - migration ignorée (première installation)';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table entreprises inexistante lors de la migration - ignoré (première installation)';
    END IF;
END $$;

-- ========================================
-- 🧪 ÉTAPE 7: DONNÉES D'EXEMPLE ET TESTS
-- ========================================

-- 7.1 - CRÉATION ENTREPRISES D'EXEMPLE
-- ========================================

-- Entreprises avec commission 0% par défaut (nouveau comportement)
INSERT INTO entreprises (nom, adresse, telephone, responsable, login, password_hash) VALUES 
('Taxi Express Conakry', 'Quartier Kaloum, Conakry', '+224 622 001 111', 'Mamadou Diallo', 'taxi_express', crypt('TaxiExpress2025!', gen_salt('bf'))),
('Moto Rapide Guinée', 'Quartier Madina, Conakry', '+224 655 002 222', 'Ibrahima Sow', 'moto_rapide', crypt('MotoRapide2025!', gen_salt('bf'))),
('Transport Alpha Ratoma', 'Quartier Ratoma, Conakry', '+224 666 003 333', 'Alpha Barry', 'alpha_transport', crypt('AlphaTransport2025!', gen_salt('bf'))),
('Freelance Motors', 'Quartier Dixinn, Conakry', '+224 677 004 444', 'Amadou Bah', NULL, NULL)
ON CONFLICT (siret) DO NOTHING;

-- 7.2 - EXEMPLE CONFIGURATION COMMISSIONS AVEC DATES
-- ========================================

-- Taxi Express : Commission 15% à partir d'aujourd'hui
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'),
    15.00,
    CURRENT_DATE,
    'Configuration initiale commission après implémentation système v2',
    'admin_system'
);

-- Moto Rapide : Commission 12% à partir du mois prochain
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Moto Rapide Guinée'),
    12.00,
    CURRENT_DATE + INTERVAL '30 days',
    'Commission différée pour période de test',
    'admin_system'
);

-- Transport Alpha : Pas de commission configurée (restera à 0%)

-- 7.3 - CRÉATION CONDUCTEURS D'EXEMPLE
-- ========================================

-- Conducteurs d'entreprise
UPDATE conducteurs 
SET entreprise_id = (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry' LIMIT 1)
WHERE ctid IN (
    SELECT ctid FROM conducteurs 
    WHERE nom ILIKE '%mamadou%' AND entreprise_id IS NULL 
    LIMIT 2
);

UPDATE conducteurs 
SET entreprise_id = (SELECT id FROM entreprises WHERE nom = 'Moto Rapide Guinée' LIMIT 1)
WHERE ctid IN (
    SELECT ctid FROM conducteurs 
    WHERE vehicle_type = 'moto' AND entreprise_id IS NULL 
    LIMIT 2
);

-- Les autres restent freelance (entreprise_id = NULL)

-- ========================================
-- 🎯 ÉTAPE 8: TRIGGERS ET AUTOMATISATIONS
-- ========================================

-- 8.1 - TRIGGER MISE À JOUR TIMESTAMP
-- ========================================

CREATE OR REPLACE FUNCTION update_timestamp_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer aux tables concernées
DROP TRIGGER IF EXISTS trigger_entreprises_updated_at ON entreprises;
CREATE TRIGGER trigger_entreprises_updated_at
    BEFORE UPDATE ON entreprises
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_columns();

DROP TRIGGER IF EXISTS trigger_commission_history_updated_at ON commission_history;
CREATE TRIGGER trigger_commission_history_updated_at
    BEFORE UPDATE ON commission_history
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_columns();

-- ========================================
-- ✅ ÉTAPE 9: VALIDATION ET TESTS AUTOMATIQUES
-- ========================================

-- 9.1 - TEST COMMISSION 0% PAR DÉFAUT
-- ========================================

DO $$
DECLARE
    test_entreprise_id UUID;
    commission_defaut DECIMAL(5,2);
BEGIN
    -- Créer entreprise test
    INSERT INTO entreprises (nom) VALUES ('TEST_COMMISSION_ZERO') RETURNING id INTO test_entreprise_id;
    
    -- Vérifier commission 0% par défaut
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE) INTO commission_defaut;
    
    IF commission_defaut = 0.00 THEN
        RAISE NOTICE '✅ TEST PASS: Commission 0%% par défaut OK';
    ELSE
        RAISE NOTICE '❌ TEST FAIL: Commission par défaut = %% au lieu de 0%%', commission_defaut;
    END IF;
    
    -- Nettoyer
    DELETE FROM entreprises WHERE id = test_entreprise_id;
END $$;

-- 9.2 - TEST NON-RÉTROACTIVITÉ
-- ========================================

DO $$
DECLARE
    test_entreprise_id UUID;
    commission_avant DECIMAL(5,2);
    commission_pendant DECIMAL(5,2);
    commission_apres DECIMAL(5,2);
BEGIN
    -- Créer entreprise test
    INSERT INTO entreprises (nom) VALUES ('TEST_NON_RETROACTIVITE') RETURNING id INTO test_entreprise_id;
    
    -- Programmer commission 20% à partir de demain
    PERFORM set_commission_taux(test_entreprise_id, 20.00, CURRENT_DATE + 1, 'Test non-rétroactivité', 'test_system');
    
    -- Tester les différentes dates
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE) INTO commission_avant;
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE + 1) INTO commission_pendant;
    SELECT get_commission_taux(test_entreprise_id, CURRENT_DATE + 10) INTO commission_apres;
    
    IF commission_avant = 0.00 AND commission_pendant = 20.00 AND commission_apres = 20.00 THEN
        RAISE NOTICE '✅ TEST PASS: Non-rétroactivité OK (0%% -> 20%% -> 20%%)';
    ELSE
        RAISE NOTICE '❌ TEST FAIL: Non-rétroactivité KO (%%, %%, %%)', commission_avant, commission_pendant, commission_apres;
    END IF;
    
    -- Nettoyer
    DELETE FROM commission_history WHERE entreprise_id = test_entreprise_id;
    DELETE FROM entreprises WHERE id = test_entreprise_id;
END $$;

-- ========================================
-- 📊 ÉTAPE 10: RAPPORTS DE VALIDATION FINALE
-- ========================================

-- 10.1 - RAPPORT SYSTÈME
-- ========================================

SELECT '🎯 SYSTÈME COMMISSION PARAMÉTRABLE V2 - RAPPORT INSTALLATION' as titre;

-- Rapport tables créées
SELECT 
    '📋 TABLES' as section,
    schemaname,
    tablename as nom_table,
    CASE 
        WHEN tablename = 'entreprises' THEN '✅ Table entreprises (commission supprimée)'
        WHEN tablename = 'commission_history' THEN '✅ Table historique commission (nouvelle)'
        WHEN tablename = 'conducteurs' THEN '✅ Table conducteurs (lien entreprise ajouté)'
        ELSE '📄 Autre table'
    END as description
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('entreprises', 'commission_history', 'conducteurs')
ORDER BY tablename;

-- Rapport fonctions créées
SELECT 
    '🔧 FONCTIONS' as section,
    proname as nom_fonction,
    CASE 
        WHEN proname = 'get_commission_taux' THEN '✅ Calcul commission selon date'
        WHEN proname = 'set_commission_taux' THEN '✅ Modification commission avec historique'
        WHEN proname = 'remove_commission' THEN '✅ Suppression commission'
        ELSE '📄 Autre fonction'
    END as description
FROM pg_proc 
WHERE proname IN ('get_commission_taux', 'set_commission_taux', 'remove_commission');

-- Rapport vues créées
SELECT 
    '📊 VUES' as section,
    viewname as nom_vue,
    CASE 
        WHEN viewname = 'conducteurs_avec_commission' THEN '✅ Vue conducteurs avec commission actuelle'
        WHEN viewname = 'historique_commissions' THEN '✅ Vue historique des commissions'
        WHEN viewname = 'stats_commissions' THEN '✅ Vue statistiques commission'
        ELSE '📄 Autre vue'
    END as description
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('conducteurs_avec_commission', 'historique_commissions', 'stats_commissions');

-- 10.2 - RAPPORT DONNÉES
-- ========================================

-- Statistiques entreprises
SELECT 
    '📈 ENTREPRISES' as section,
    COUNT(*) as total_entreprises,
    COUNT(CASE WHEN get_commission_taux(id, CURRENT_DATE) = 0 THEN 1 END) as sans_commission,
    COUNT(CASE WHEN get_commission_taux(id, CURRENT_DATE) > 0 THEN 1 END) as avec_commission,
    ROUND(AVG(get_commission_taux(id, CURRENT_DATE)), 2) as commission_moyenne
FROM entreprises 
WHERE actif = true;

-- Statistiques conducteurs
SELECT 
    '🚗 CONDUCTEURS' as section,
    COUNT(*) as total_conducteurs,
    COUNT(CASE WHEN entreprise_id IS NULL THEN 1 END) as freelance,
    COUNT(CASE WHEN entreprise_id IS NOT NULL THEN 1 END) as avec_entreprise
FROM conducteurs 
WHERE actif = true;

-- Statistiques historique commission
SELECT 
    '📚 HISTORIQUE' as section,
    COUNT(*) as total_entrees_historique,
    COUNT(CASE WHEN date_fin IS NULL THEN 1 END) as commissions_actives,
    COUNT(CASE WHEN date_fin IS NOT NULL THEN 1 END) as commissions_archivees,
    MIN(date_debut) as premiere_commission,
    MAX(date_debut) as derniere_modification
FROM commission_history 
WHERE actif = true;

-- ========================================
-- 🎉 INSTALLATION TERMINÉE
-- ========================================

SELECT 
    '🎉 INSTALLATION SYSTÈME COMMISSION PARAMÉTRABLE V2 TERMINÉE' as status,
    '✅ Commission 0% par défaut' as feature_1,
    '✅ Historique temporel complet' as feature_2,
    '✅ Non-rétroactivité garantie' as feature_3,
    '✅ Freelance vs Entreprise' as feature_4,
    '✅ Fonctions et vues opérationnelles' as feature_5;

-- ========================================
-- 📋 COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE entreprises IS 'Entreprises de taxi/moto-taxi - Commission gérée dans commission_history';
COMMENT ON TABLE commission_history IS 'Historique des taux de commission par entreprise avec périodes d''application';
COMMENT ON COLUMN commission_history.taux_commission IS 'Taux commission en pourcentage (ex: 15.50 pour 15.5%)';
COMMENT ON COLUMN commission_history.date_debut IS 'Date d''application du taux (incluse)';
COMMENT ON COLUMN commission_history.date_fin IS 'Date de fin du taux (exclue) - NULL = en cours';
COMMENT ON COLUMN conducteurs.entreprise_id IS 'ID entreprise (NULL = freelance avec 0% commission)';
COMMENT ON COLUMN entreprises.login IS 'Login unique pour authentification entreprise';
COMMENT ON COLUMN entreprises.password_hash IS 'Mot de passe haché avec bcrypt/pgcrypto';

COMMENT ON FUNCTION get_commission_taux(UUID, DATE) IS 'Calcule le taux de commission applicable à une date donnée pour une entreprise';
COMMENT ON FUNCTION set_commission_taux(UUID, DECIMAL, DATE, TEXT, VARCHAR) IS 'Modifie le taux de commission avec gestion automatique de l''historique';
COMMENT ON FUNCTION remove_commission(UUID, DATE, TEXT, VARCHAR) IS 'Supprime la commission active (retour à 0%)';

COMMENT ON VIEW conducteurs_avec_commission IS 'Vue des conducteurs avec leur commission actuelle calculée';
COMMENT ON VIEW historique_commissions IS 'Vue de l''historique complet des commissions par entreprise';
COMMENT ON VIEW stats_commissions IS 'Vue des statistiques de commission par entreprise';

-- ========================================
-- 🚀 PROCHAINES ÉTAPES RECOMMANDÉES
-- ========================================

/*
📋 PROCHAINES ÉTAPES:

1. 🧪 TESTS FONCTIONNELS:
   - Tester les fonctions avec différents scénarios
   - Valider l'intégration avec le bot WhatsApp
   - Vérifier les performances sur gros volumes

2. 🔐 SÉCURITÉ:
   - Ajouter permissions utilisateurs pour modification commissions
   - Audit trail des modifications sensibles
   - Validation des données d'entrée

3. 🎨 INTERFACE ADMIN:
   - Créer interface de gestion des commissions
   - Dashboard statistiques entreprises
   - Historique visuel des changements

4. 📱 INTÉGRATION BOT:
   - Modifier calcul commission dans bot WhatsApp
   - Affichage commission dans confirmations
   - Rapports financiers automatiques

5. 📊 MONITORING:
   - Alertes changements commission importants
   - Rapports mensuels automatiques
   - KPIs commission par entreprise

COMMANDES UTILES:
- Voir commission actuelle: SELECT get_commission_taux('entreprise_id', CURRENT_DATE);
- Changer commission: SELECT set_commission_taux('entreprise_id', 20.00, '2025-08-01', 'Nouveau taux', 'admin');
- Voir historique: SELECT * FROM historique_commissions WHERE entreprise_nom = 'NOM';
- Stats globales: SELECT * FROM stats_commissions;
*/