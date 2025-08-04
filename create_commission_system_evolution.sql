-- ========================================
-- SYSTÈME COMMISSION PARAMÉTRABLE - ÉVOLUTION SANS MODIFICATION TABLES EXISTANTES
-- ========================================
-- Description: Ajout système commission via relations existantes sans modification
-- Version: v4.0 - Évolution non-intrusive
-- Date: 2025-07-31
-- Usage: Tables reservations et conducteurs restent inchangées
-- Calcul: reservations → conducteurs → entreprises (via relations)
-- ========================================

-- 🎯 PRINCIPE FONDAMENTAL
-- ========================================
-- ❌ PAS de modification table reservations (commission_taux, commission_montant supprimés)
-- ❌ PAS de modification structure conducteurs existante
-- ✅ CALCUL par jointures : reservations.conducteur_id → conducteurs.entreprise_id → commission
-- ✅ Interface entreprise via vues pour consulter leurs conducteurs avec commissions

SELECT '🎯 SYSTÈME COMMISSION ÉVOLUTION - SANS MODIFICATION TABLES EXISTANTES' as status;

-- ========================================
-- 🔍 VÉRIFICATION STRUCTURE EXISTANTE
-- ========================================

-- Afficher les tables existantes détectées
SELECT 
    '🔍 Tables existantes dans la base:' as info,
    string_agg(tablename, ', ' ORDER BY tablename) as tables_presentes
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('adresses', 'conducteurs', 'reservations', 'sessions', 'tarifs', 'parametres', 'notifications_pending', 'reservation_refus', 'user_sessions', 'spatial_ref_sys');

-- Vérifier colonnes importantes
SELECT 
    'Colonnes table conducteurs:' as table_info,
    string_agg(column_name, ', ' ORDER BY column_name) as colonnes
FROM information_schema.columns 
WHERE table_name = 'conducteurs' AND table_schema = 'public';

SELECT 
    'Colonnes table reservations:' as table_info,
    string_agg(column_name, ', ' ORDER BY column_name) as colonnes
FROM information_schema.columns 
WHERE table_name = 'reservations' AND table_schema = 'public';

-- ========================================
-- 📋 ÉTAPE 1: EXTENSIONS REQUISES
-- ========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Hachage mots de passe entreprises
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Recherche fuzzy (si pas installé)
CREATE EXTENSION IF NOT EXISTS "unaccent";         -- Normalisation accents (si pas installé)

-- ========================================
-- 📋 ÉTAPE 2: CRÉATION TABLE ENTREPRISES (NOUVELLE)
-- ========================================

-- Table entreprises - NOUVELLE (pas de modification existante)
CREATE TABLE IF NOT EXISTS entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informations entreprise
    nom VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    adresse TEXT,
    telephone VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    responsable VARCHAR(100),
    
    -- Authentification espace client
    password_hash VARCHAR(255),
    
    -- État
    actif BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- 📋 ÉTAPE 3: TABLE COMMISSION_HISTORY (NOUVELLE)
-- ========================================

-- Table historique commission avec périodes
CREATE TABLE IF NOT EXISTS commission_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL,
    taux_commission DECIMAL(5,2) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NULL,
    actif BOOLEAN DEFAULT true,
    motif TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT fk_commission_entreprise 
        FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
    CONSTRAINT unique_periode_active 
        UNIQUE (entreprise_id, date_debut) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT taux_positif 
        CHECK (taux_commission >= 0 AND taux_commission <= 100)
);

-- ========================================
-- 🔧 ÉTAPE 4: AJOUT MINIMAL À TABLE CONDUCTEURS
-- ========================================

-- SEULE modification : Ajouter colonne entreprise_id à conducteurs
-- (si elle n'existe pas déjà)
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS entreprise_id UUID;

-- Ajouter contrainte foreign key si pas déjà présente
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
-- ⚙️ ÉTAPE 5: FONCTIONS MÉTIER COMMISSION
-- ========================================

-- 5.1 - FONCTION CALCUL COMMISSION (CŒUR DU SYSTÈME)
-- ========================================

CREATE OR REPLACE FUNCTION get_commission_taux(
    p_entreprise_id UUID,
    p_date_reservation DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_taux DECIMAL(5,2);
BEGIN
    -- 🎯 RÈGLE : Freelance (entreprise_id NULL) = 0% commission
    IF p_entreprise_id IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Récupérer le taux applicable à la date de la réservation
    SELECT taux_commission INTO v_taux
    FROM commission_history
    WHERE entreprise_id = p_entreprise_id
      AND date_debut <= p_date_reservation
      AND (date_fin IS NULL OR date_fin > p_date_reservation)
      AND actif = true
    ORDER BY date_debut DESC
    LIMIT 1;
    
    -- 🎯 RÈGLE : Si aucun taux défini = 0% (PAS DE COMMISSION PAR DÉFAUT)
    RETURN COALESCE(v_taux, 0.00);
END;
$$ LANGUAGE plpgsql;

-- 5.2 - FONCTION CALCUL MONTANT COMMISSION
-- ========================================

CREATE OR REPLACE FUNCTION calculate_commission_montant(
    p_prix_total NUMERIC,
    p_taux_commission DECIMAL(5,2)
) RETURNS INTEGER AS $$
BEGIN
    -- Calcul en unités entières (ex: 15000 GNF avec 15% = 2250)
    RETURN ROUND((COALESCE(p_prix_total, 0) * p_taux_commission) / 100)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- 5.3 - FONCTION MODIFICATION COMMISSION
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
    -- Vérifier que l'entreprise existe et est active
    SELECT nom INTO v_entreprise_nom 
    FROM entreprises 
    WHERE id = p_entreprise_id AND actif = true;
    
    IF v_entreprise_nom IS NULL THEN
        RAISE NOTICE 'Entreprise non trouvée ou inactive: %', p_entreprise_id;
        RETURN false;
    END IF;
    
    -- Fermer l'ancien taux (non-rétroactif)
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
    
    RAISE NOTICE '✅ Commission modifiée pour % : % %% à partir du %', 
        v_entreprise_nom, p_nouveau_taux, p_date_debut;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du changement de commission: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 5.4 - FONCTION AUTHENTIFICATION ENTREPRISE
-- ========================================

CREATE OR REPLACE FUNCTION authenticate_entreprise(
    p_telephone VARCHAR(20),
    p_password TEXT
) RETURNS TABLE (
    success BOOLEAN,
    entreprise_id UUID,
    entreprise_nom VARCHAR(100),
    message TEXT
) AS $$
DECLARE
    v_entreprise_record RECORD;
BEGIN
    -- Vérifier si telephone existe et entreprise active
    SELECT id, nom, password_hash, actif
    INTO v_entreprise_record
    FROM entreprises 
    WHERE telephone = p_telephone AND actif = true;
    
    -- Si telephone non trouvé
    IF v_entreprise_record.id IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::UUID, NULL::VARCHAR(100),
            'Telephone non trouvé ou entreprise inactive'::TEXT;
        RETURN;
    END IF;
    
    -- Si pas de mot de passe configuré
    IF v_entreprise_record.password_hash IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::UUID, NULL::VARCHAR(100),
            'Authentification non configurée pour cette entreprise'::TEXT;
        RETURN;
    END IF;
    
    -- Vérifier mot de passe
    IF crypt(p_password, v_entreprise_record.password_hash) = v_entreprise_record.password_hash THEN
        RETURN QUERY SELECT 
            true::BOOLEAN, v_entreprise_record.id, v_entreprise_record.nom,
            'Authentification réussie'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::UUID, NULL::VARCHAR(100),
            'Mot de passe incorrect'::TEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 🔄 ÉTAPE 6: TRIGGERS POUR NOUVELLES TABLES
-- ========================================

-- Trigger timestamp pour nouvelles tables
CREATE OR REPLACE FUNCTION update_timestamp_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer aux nouvelles tables
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
-- 📇 ÉTAPE 7: INDEX ET OPTIMISATIONS
-- ========================================

-- Index sur nouvelles tables
CREATE INDEX IF NOT EXISTS idx_entreprises_nom_actif ON entreprises(nom, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_entreprises_telephone ON entreprises(telephone) WHERE telephone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_history_entreprise_date ON commission_history(entreprise_id, date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_commission_history_periode ON commission_history(date_debut, date_fin) WHERE actif = true;

-- Index sur colonne ajoutée à conducteurs
CREATE INDEX IF NOT EXISTS idx_conducteurs_entreprise_actif ON conducteurs(entreprise_id, actif) WHERE actif = true;

-- ========================================
-- 📊 ÉTAPE 8: VUES FACILITATRICES POUR INTERFACE ENTREPRISE
-- ========================================

-- 8.1 - VUE CONDUCTEURS AVEC COMMISSION ACTUELLE
-- ========================================

CREATE OR REPLACE VIEW conducteurs_avec_commission AS
SELECT 
    c.id, c.nom, c.prenom, c.telephone, c.vehicle_type,
    c.vehicle_marque, c.vehicle_modele, c.vehicle_couleur, c.vehicle_plaque,
    c.position_actuelle, c.statut, c.note_moyenne, c.nombre_courses, c.actif,
    c.date_inscription, c.derniere_activite,
    
    -- Informations entreprise
    c.entreprise_id, 
    e.nom as entreprise_nom, 
    e.responsable as entreprise_responsable,
    
    -- Commission calculée dynamiquement
    get_commission_taux(c.entreprise_id, CURRENT_DATE) as commission_actuelle,
    
    -- Type de conducteur
    CASE 
        WHEN c.entreprise_id IS NULL THEN 'Freelance'
        ELSE 'Entreprise'
    END as type_conducteur,
    
    -- Affichage commission
    CASE 
        WHEN c.entreprise_id IS NULL THEN '0% (Freelance)'
        ELSE get_commission_taux(c.entreprise_id, CURRENT_DATE)::TEXT || '%'
    END as commission_display
    
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
WHERE c.actif = true;

-- 8.2 - VUE RÉSERVATIONS AVEC COMMISSION CALCULÉE
-- ========================================

CREATE OR REPLACE VIEW reservations_avec_commission AS
SELECT 
    r.*, 
    c.nom as conducteur_nom, 
    c.prenom as conducteur_prenom, 
    c.telephone as conducteur_telephone,
    c.entreprise_id as conducteur_entreprise_id, 
    e.nom as entreprise_nom,
    
    -- 🎯 COMMISSION CALCULÉE VIA RELATIONS (pas stockée dans reservations)
    get_commission_taux(c.entreprise_id, COALESCE(r.date_reservation, r.created_at::DATE)) as commission_taux_applicable,
    
    -- Montant commission calculé
    calculate_commission_montant(
        r.prix_total, 
        get_commission_taux(c.entreprise_id, COALESCE(r.date_reservation, r.created_at::DATE))
    ) as commission_montant_calcule,
    
    -- Montant net conducteur
    COALESCE(r.prix_total, 0) - calculate_commission_montant(
        r.prix_total, 
        get_commission_taux(c.entreprise_id, COALESCE(r.date_reservation, r.created_at::DATE))
    ) as montant_net_conducteur,
    
    -- Informations supplémentaires
    CASE 
        WHEN c.entreprise_id IS NULL THEN 'Freelance (0%)'
        ELSE e.nom || ' (' || get_commission_taux(c.entreprise_id, COALESCE(r.date_reservation, r.created_at::DATE))::TEXT || '%)'
    END as commission_info
    
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN entreprises e ON c.entreprise_id = e.id;

-- 8.3 - VUE DASHBOARD ENTREPRISE
-- ========================================

CREATE OR REPLACE VIEW dashboard_entreprise AS
SELECT 
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    e.responsable,
    e.actif as entreprise_active,
    
    -- Statistiques conducteurs
    COUNT(DISTINCT c.id) as nb_conducteurs_total,
    COUNT(DISTINCT CASE WHEN c.actif = true THEN c.id END) as nb_conducteurs_actifs,
    COUNT(DISTINCT CASE WHEN c.statut = 'disponible' AND c.actif = true THEN c.id END) as nb_conducteurs_disponibles,
    
    -- Commission actuelle
    get_commission_taux(e.id, CURRENT_DATE) as commission_actuelle,
    
    -- Statistiques réservations (30 derniers jours)
    COUNT(DISTINCT CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN r.id END) as reservations_30j,
    SUM(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN COALESCE(r.prix_total, 0) ELSE 0 END) as ca_brut_30j,
    SUM(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 
        calculate_commission_montant(r.prix_total, get_commission_taux(e.id, COALESCE(r.date_reservation, r.created_at::DATE)))
        ELSE 0 END) as commission_totale_30j,
    
    -- Note moyenne entreprise
    AVG(c.note_moyenne) as note_moyenne_entreprise
    
FROM entreprises e
LEFT JOIN conducteurs c ON c.entreprise_id = e.id
LEFT JOIN reservations r ON r.conducteur_id = c.id
WHERE e.actif = true
GROUP BY e.id, e.nom, e.responsable, e.actif;

-- 8.4 - VUE HISTORIQUE COMMISSIONS
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
    
    -- Statut de la commission
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

-- ========================================
-- 🧪 ÉTAPE 9: DONNÉES D'INITIALISATION
-- ========================================

-- 9.1 - ENTREPRISES D'EXEMPLE
-- ========================================

INSERT INTO entreprises (nom, adresse, telephone, responsable, password_hash) VALUES 
('Taxi Express Conakry', 'Quartier Kaloum, Conakry', '+224 622 001 111', 'Mamadou Diallo', crypt('TaxiExpress2025!', gen_salt('bf'))),
('Moto Rapide Guinée', 'Quartier Madina, Conakry', '+224 655 002 222', 'Ibrahima Sow', crypt('MotoRapide2025!', gen_salt('bf'))),
('Transport Alpha Ratoma', 'Quartier Ratoma, Conakry', '+224 666 003 333', 'Alpha Barry', crypt('AlphaTransport2025!', gen_salt('bf')))
ON CONFLICT (telephone) DO NOTHING;

-- 9.2 - ATTRIBUTION EXEMPLE CONDUCTEURS À ENTREPRISES
-- ========================================

-- Attribuer quelques conducteurs existants aux entreprises (examples)
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

-- 9.3 - CONFIGURATION COMMISSION EXEMPLE
-- ========================================

-- Taxi Express : Commission 15% à partir d'aujourd'hui
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'),
    15.00,
    CURRENT_DATE,
    'Configuration initiale commission système évolution v4',
    'admin_system'
);

-- Moto Rapide : Commission 12% à partir du mois prochain (non-rétroactif)
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Moto Rapide Guinée'),
    12.00,
    (CURRENT_DATE + INTERVAL '30 days')::DATE,
    'Commission différée période test - non rétroactive',
    'admin_system'
);

-- 9.4 - PARAMÈTRES SYSTÈME
-- ========================================

INSERT INTO parametres (cle, valeur, description, type) VALUES
('commission_enabled', 'true', 'Activation système commission paramétrable évolution', 'boolean'),
('commission_default_rate', '0', 'Taux commission par défaut (0% = freelance)', 'nombre'),
('commission_max_rate', '50', 'Taux commission maximum autorisé', 'nombre'),
('commission_calculation_method', 'via_relations', 'Méthode calcul: via_relations ou stored_values', 'texte')
ON CONFLICT (cle) DO UPDATE SET 
    valeur = EXCLUDED.valeur,
    description = EXCLUDED.description,
    updated_at = now();

-- ========================================
-- ✅ ÉTAPE 10: VALIDATION ET RAPPORT
-- ========================================

-- 10.1 - VALIDATION STRUCTURE
-- ========================================

SELECT '✅ VALIDATION SYSTÈME COMMISSION ÉVOLUTION V4' as status;

-- Vérifier tables créées
SELECT 
    'Tables système commission:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'entreprises') THEN '✅ entreprises'
        ELSE '❌ entreprises manquante'
    END ||
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'commission_history') THEN ' ✅ commission_history'
        ELSE ' ❌ commission_history manquante'
    END as tables_status;

-- Vérifier colonne ajoutée à conducteurs
SELECT 
    'Colonne ajoutée:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conducteurs' AND column_name = 'entreprise_id') 
        THEN '✅ conducteurs.entreprise_id ajoutée'
        ELSE '❌ conducteurs.entreprise_id manquante'
    END as colonne_status;

-- Vérifier que reservations reste inchangée (pas de colonnes commission)
SELECT 
    'Table reservations:' as section,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'commission_taux') 
        THEN '✅ reservations.commission_taux NON ajoutée (correct)'
        ELSE '⚠️ reservations.commission_taux présente (pas prévu)'
    END ||
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'commission_montant') 
        THEN ' ✅ reservations.commission_montant NON ajoutée (correct)'
        ELSE ' ⚠️ reservations.commission_montant présente (pas prévu)'
    END as reservations_status;

-- Vérifier fonctions créées
SELECT 
    'Fonctions commission:' as section,
    COUNT(CASE WHEN proname = 'get_commission_taux' THEN 1 END) as get_commission,
    COUNT(CASE WHEN proname = 'set_commission_taux' THEN 1 END) as set_commission,
    COUNT(CASE WHEN proname = 'calculate_commission_montant' THEN 1 END) as calculate_commission,
    COUNT(CASE WHEN proname = 'authenticate_entreprise' THEN 1 END) as authenticate
FROM pg_proc 
WHERE proname IN ('get_commission_taux', 'set_commission_taux', 'calculate_commission_montant', 'authenticate_entreprise');

-- 10.2 - RAPPORT FINAL
-- ========================================

SELECT 
    '🎉 SYSTÈME COMMISSION ÉVOLUTION V4 INSTALLÉ' as status,
    (SELECT COUNT(*) FROM entreprises WHERE actif = true) as entreprises_actives,
    (SELECT COUNT(*) FROM conducteurs WHERE entreprise_id IS NOT NULL) as conducteurs_entreprise,
    (SELECT COUNT(*) FROM conducteurs WHERE entreprise_id IS NULL) as conducteurs_freelance,
    (SELECT COUNT(*) FROM commission_history WHERE actif = true) as historique_commissions;

-- ========================================
-- 📋 COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE entreprises IS 'Entreprises de transport avec authentification - Évolution v4 non-intrusive';
COMMENT ON TABLE commission_history IS 'Historique taux commission avec périodes - Calcul via relations v4';
COMMENT ON COLUMN conducteurs.entreprise_id IS 'Lien facultatif vers entreprise (NULL = freelance 0% commission) - Évolution v4';

COMMENT ON FUNCTION get_commission_taux(UUID, DATE) IS 'Calcule taux commission selon historique - Évolution v4';
COMMENT ON FUNCTION calculate_commission_montant(NUMERIC, DECIMAL) IS 'Calcule montant commission en unités entières - v4';
COMMENT ON FUNCTION set_commission_taux(UUID, DECIMAL, DATE, TEXT, VARCHAR) IS 'Modifie commission avec gestion historique non-rétroactive - v4';
COMMENT ON FUNCTION authenticate_entreprise(VARCHAR, TEXT) IS 'Authentification entreprise via telephone pour interface client - v4';

COMMENT ON VIEW conducteurs_avec_commission IS 'Conducteurs avec commission actuelle calculée - Évolution v4';
COMMENT ON VIEW reservations_avec_commission IS 'Réservations avec commissions calculées via relations - Table reservations inchangée v4';
COMMENT ON VIEW dashboard_entreprise IS 'Dashboard entreprise avec KPIs et statistiques - Interface client v4';

-- ========================================
-- 🎯 INSTRUCTIONS UTILISATION ÉVOLUTION V4
-- ========================================

/*
📋 SYSTÈME COMMISSION ÉVOLUTION V4 - GUIDE D'UTILISATION

🎯 PRINCIPE FONDAMENTAL:
- Table 'reservations' reste INTACTE (aucune colonne commission ajoutée)
- Commission calculée via relations: reservations → conducteurs → entreprises
- Interface entreprise via vues pour consulter leurs conducteurs et réservations

🔧 COMMANDES UTILES:

1. 🧪 TESTER LE SYSTÈME:
   -- Voir commission d'une entreprise
   SELECT get_commission_taux('uuid-entreprise', CURRENT_DATE);
   
   -- Voir toutes les réservations avec commission
   SELECT * FROM reservations_avec_commission WHERE entreprise_nom = 'Taxi Express Conakry';
   
   -- Dashboard entreprise
   SELECT * FROM dashboard_entreprise WHERE entreprise_nom = 'Taxi Express Conakry';

2. ✏️ GESTION COMMISSIONS:
   -- Changer taux commission (non-rétroactif)
   SELECT set_commission_taux('uuid-entreprise', 20.00, '2025-08-01', 'Nouveau taux', 'admin');
   
   -- Voir historique commissions
   SELECT * FROM historique_commissions WHERE entreprise_nom = 'Taxi Express Conakry';

3. 👥 GESTION CONDUCTEURS:
   -- Attribuer conducteur à entreprise
   UPDATE conducteurs SET entreprise_id = 'uuid-entreprise' WHERE id = 'uuid-conducteur';
   
   -- Libérer conducteur (freelance)
   UPDATE conducteurs SET entreprise_id = NULL WHERE id = 'uuid-conducteur';

4. 🔐 AUTHENTIFICATION ENTREPRISE:
   -- Tester authentification entreprise avec telephone
   SELECT * FROM authenticate_entreprise('+224 622 001 111', 'TaxiExpress2025!');

📊 VUES DISPONIBLES POUR INTERFACE CLIENT:
- conducteurs_avec_commission: Tous conducteurs avec commission
- reservations_avec_commission: Réservations avec calculs commission
- dashboard_entreprise: KPIs et statistiques par entreprise
- historique_commissions: Évolution des taux dans le temps

🎯 AVANTAGES ÉVOLUTION V4:
✅ Aucune modification table reservations (bot reste fonctionnel)
✅ Calcul commission dynamique via relations
✅ Gestion historique non-rétroactive
✅ Interface entreprise complète
✅ Système freelance (commission 0% automatique)
✅ Authentification sécurisée entreprises
*/

SELECT '🎯 SYSTÈME COMMISSION ÉVOLUTION V4 PRÊT POUR INTERFACE ENTREPRISE' as final_status;