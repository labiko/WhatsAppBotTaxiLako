-- ========================================
-- SYSTÈME COMMISSION PARAMÉTRABLE - ADAPTÉ À LA STRUCTURE EXISTANTE
-- ========================================
-- Description: Ajout système commission basé sur l'analyse de db_structure.sql
-- Version: v3.0 - Adapté à la structure réelle
-- Date: 2025-07-31
-- Usage: À exécuter sur la base existante avec tables réelles identifiées
-- ========================================

-- 🔍 ANALYSE STRUCTURE EXISTANTE DÉTECTÉE
-- ========================================

SELECT '🔍 ANALYSE STRUCTURE EXISTANTE' as status;

-- Vérifier les tables existantes détectées
SELECT 
    'Tables détectées dans la base:' as info,
    string_agg(tablename, ', ' ORDER BY tablename) as tables_presentes
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('adresses', 'conducteurs', 'reservations', 'sessions', 'tarifs', 'parametres', 'notifications_pending', 'reservation_refus', 'user_sessions', 'spatial_ref_sys');

-- ========================================
-- 🧩 ÉTAPE 1: EXTENSIONS REQUISES (SI MANQUANTES)
-- ========================================

-- Extensions pour commission et authentification
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Hachage mots de passe
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Recherche fuzzy (si pas installé)
CREATE EXTENSION IF NOT EXISTS "unaccent";         -- Normalisation accents (si pas installé)

-- ========================================
-- 📋 ÉTAPE 2: CRÉATION TABLE ENTREPRISES
-- ========================================

-- Table entreprises (nouvelle - pas détectée dans la structure)
CREATE TABLE IF NOT EXISTS entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informations entreprise
    nom VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    responsable VARCHAR(100),
    
    -- Authentification (nouveau)
    login VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    
    -- État
    actif BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ========================================
-- 📋 ÉTAPE 3: TABLE COMMISSION_HISTORY
-- ========================================

-- Table historique commission (nouvelle)
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
-- 🔧 ÉTAPE 4: MODIFICATION TABLE CONDUCTEURS EXISTANTE
-- ========================================

-- Ajouter colonne entreprise_id si elle n'existe pas
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS entreprise_id UUID;

-- Ajouter contrainte foreign key
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

-- Ajouter colonnes géolocalisation extraites si manquantes (basé sur structure existante)
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ========================================
-- 🔧 ÉTAPE 5: MODIFICATION TABLE RESERVATIONS EXISTANTE
-- ========================================

-- Ajouter colonnes commission si elles n'existent pas
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS commission_taux DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_montant INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS entreprise_id UUID;

-- Ajouter contrainte entreprise pour reservations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reservations_entreprise') THEN
        ALTER TABLE reservations 
        ADD CONSTRAINT fk_reservations_entreprise 
            FOREIGN KEY (entreprise_id) 
            REFERENCES entreprises(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Normaliser colonnes position (basé sur structure détectée)
-- La table a déjà position_depart (text) et position_arrivee (USER-DEFINED)
-- Ajouter position_depart_geo si nécessaire
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS position_depart_geo GEOGRAPHY(POINT, 4326);

-- ========================================
-- ⚙️ ÉTAPE 6: FONCTIONS MÉTIER
-- ========================================

-- 6.1 - FONCTION CALCUL COMMISSION
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
    
    -- Récupérer le taux applicable à la date
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

-- 6.2 - FONCTION MODIFICATION COMMISSION
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
    
    -- Fermer l'ancien taux
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

-- 6.3 - FONCTION AUTHENTIFICATION ENTREPRISE
-- ========================================

CREATE OR REPLACE FUNCTION authenticate_entreprise(
    p_login VARCHAR(50),
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
    -- Vérifier si login existe et entreprise active
    SELECT id, nom, password_hash, actif
    INTO v_entreprise_record
    FROM entreprises 
    WHERE login = p_login AND actif = true;
    
    -- Si login non trouvé
    IF v_entreprise_record.id IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::UUID, NULL::VARCHAR(100),
            'Login non trouvé ou entreprise inactive'::TEXT;
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
-- 🔄 ÉTAPE 7: TRIGGERS POUR TABLES EXISTANTES
-- ========================================

-- 7.1 - TRIGGER COORDONNÉES CONDUCTEURS
-- ========================================

CREATE OR REPLACE FUNCTION update_conducteur_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    -- Extraire coordonnées de position_actuelle vers latitude/longitude
    IF NEW.position_actuelle IS NOT NULL THEN
        NEW.latitude = ST_Y(NEW.position_actuelle::geometry);
        NEW.longitude = ST_X(NEW.position_actuelle::geometry);
    END IF;
    NEW.derniere_activite = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conducteur_coordinates ON conducteurs;
CREATE TRIGGER trigger_update_conducteur_coordinates
    BEFORE INSERT OR UPDATE ON conducteurs
    FOR EACH ROW
    EXECUTE FUNCTION update_conducteur_coordinates();

-- 7.2 - TRIGGER TIMESTAMP TABLES NOUVELLES
-- ========================================

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
-- 📇 ÉTAPE 8: INDEX ET OPTIMISATIONS
-- ========================================

-- Index sur nouvelles tables
CREATE INDEX IF NOT EXISTS idx_entreprises_nom_actif ON entreprises(nom, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_entreprises_login ON entreprises(login) WHERE login IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commission_history_entreprise_date ON commission_history(entreprise_id, date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_commission_history_periode ON commission_history(date_debut, date_fin) WHERE actif = true;

-- Index sur colonnes ajoutées aux tables existantes
CREATE INDEX IF NOT EXISTS idx_conducteurs_entreprise_actif ON conducteurs(entreprise_id, actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_reservations_entreprise_date ON reservations(entreprise_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_commission ON reservations(commission_taux) WHERE commission_taux > 0;

-- ========================================
-- 📊 ÉTAPE 9: VUES FACILITATRICES
-- ========================================

-- 9.1 - VUE CONDUCTEURS AVEC COMMISSION (ADAPTÉE)
-- ========================================

CREATE OR REPLACE VIEW conducteurs_avec_commission AS
SELECT 
    c.id, c.nom, c.prenom, c.telephone, c.vehicle_type,
    c.vehicle_marque, c.vehicle_modele, c.vehicle_couleur, c.vehicle_plaque,
    c.position_actuelle, c.latitude, c.longitude,
    c.statut, c.note_moyenne, c.nombre_courses, c.actif,
    c.date_inscription, c.derniere_activite,
    
    -- Informations entreprise
    c.entreprise_id, e.nom as entreprise_nom, e.responsable as entreprise_responsable,
    
    -- Commission calculée
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

-- 9.2 - VUE CONDUCTEURS DISPONIBLES (ADAPTÉE À LA STRUCTURE)
-- ========================================

CREATE OR REPLACE VIEW conducteurs_disponibles AS
SELECT 
    c.id, c.nom, c.prenom, c.telephone, c.vehicle_type,
    CONCAT(c.vehicle_marque, ' ', c.vehicle_modele, ' ', c.vehicle_couleur) as vehicule_complet,
    c.vehicle_plaque, c.position_actuelle, c.latitude, c.longitude,
    c.note_moyenne, c.nombre_courses, c.derniere_activite,
    c.entreprise_id, e.nom as entreprise_nom,
    get_commission_taux(c.entreprise_id, CURRENT_DATE) as commission_actuelle
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
WHERE c.actif = true 
  AND c.statut = 'disponible'
  AND c.hors_ligne = false  -- Utilise la colonne détectée dans la structure
ORDER BY c.note_moyenne DESC, c.nombre_courses ASC;

-- 9.3 - VUE RÉSERVATIONS AVEC COMMISSION (ADAPTÉE)
-- ========================================

CREATE OR REPLACE VIEW reservations_avec_commission AS
SELECT 
    r.*, 
    c.nom as conducteur_nom, c.prenom as conducteur_prenom, c.telephone as conducteur_telephone,
    c.entreprise_id as conducteur_entreprise_id, e.nom as entreprise_nom,
    
    -- Commission réelle appliquée
    CASE 
        WHEN r.commission_taux IS NOT NULL THEN r.commission_taux
        ELSE get_commission_taux(c.entreprise_id, r.created_at::DATE)
    END as commission_reelle,
    CASE 
        WHEN r.commission_montant IS NOT NULL THEN r.commission_montant
        ELSE ROUND((COALESCE(r.prix_total, 0) * get_commission_taux(c.entreprise_id, r.created_at::DATE)) / 100)
    END as commission_montant_reel,
    
    -- Montant net conducteur (utilise prix_total de la structure existante)
    COALESCE(r.prix_total, 0) - COALESCE(r.commission_montant, 0) as montant_net_conducteur
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
LEFT JOIN entreprises e ON COALESCE(r.entreprise_id, c.entreprise_id) = e.id;

-- 9.4 - VUE HISTORIQUE COMMISSIONS
-- ========================================

CREATE OR REPLACE VIEW historique_commissions AS
SELECT 
    e.id as entreprise_id, e.nom as entreprise_nom, e.responsable,
    ch.id as commission_id, ch.taux_commission, ch.date_debut, ch.date_fin,
    ch.motif, ch.created_by, ch.created_at,
    CASE 
        WHEN ch.date_fin IS NULL AND ch.date_debut <= CURRENT_DATE THEN 'Actif'
        WHEN ch.date_fin IS NULL AND ch.date_debut > CURRENT_DATE THEN 'Programmé'
        WHEN ch.date_fin IS NOT NULL AND ch.date_fin < CURRENT_DATE THEN 'Archivé'
        ELSE 'Inconnu'
    END as statut,
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
-- 🧪 ÉTAPE 10: DONNÉES D'INITIALISATION
-- ========================================

-- 10.1 - ENTREPRISES D'EXEMPLE
-- ========================================

INSERT INTO entreprises (nom, adresse, telephone, responsable, login, password_hash) VALUES 
('Taxi Express Conakry', 'Quartier Kaloum, Conakry', '+224 622 001 111', 'Mamadou Diallo', 'taxi_express', crypt('TaxiExpress2025!', gen_salt('bf'))),
('Moto Rapide Guinée', 'Quartier Madina, Conakry', '+224 655 002 222', 'Ibrahima Sow', 'moto_rapide', crypt('MotoRapide2025!', gen_salt('bf'))),
('Transport Alpha Ratoma', 'Quartier Ratoma, Conakry', '+224 666 003 333', 'Alpha Barry', 'alpha_transport', crypt('AlphaTransport2025!', gen_salt('bf'))),
('Freelance Motors', 'Quartier Dixinn, Conakry', '+224 677 004 444', 'Amadou Bah', NULL, NULL)
ON CONFLICT (login) DO NOTHING;

-- 10.2 - ATTRIBUTION EXEMPLE CONDUCTEURS À ENTREPRISES
-- ========================================

-- Attribuer quelques conducteurs existants aux entreprises (sans forcer)
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

-- 10.3 - CONFIGURATION COMMISSION EXEMPLE
-- ========================================

-- Taxi Express : Commission 15% à partir d'aujourd'hui
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry'),
    15.00,
    CURRENT_DATE,
    'Configuration initiale commission système v3',
    'admin_system'
);

-- Moto Rapide : Commission 12% à partir du mois prochain
SELECT set_commission_taux(
    (SELECT id FROM entreprises WHERE nom = 'Moto Rapide Guinée'),
    12.00,
    CURRENT_DATE + INTERVAL '30 days',
    'Commission différée période test',
    'admin_system'
);

-- 10.4 - PARAMÈTRES SYSTÈME (DANS TABLE EXISTANTE)
-- ========================================

INSERT INTO parametres (cle, valeur, description, type) VALUES
('commission_enabled', 'true', 'Activation système commission paramétrable', 'boolean'),
('commission_default_rate', '0', 'Taux commission par défaut (0% = freelance)', 'nombre'),
('commission_max_rate', '50', 'Taux commission maximum autorisé', 'nombre')
ON CONFLICT (cle) DO UPDATE SET 
    valeur = EXCLUDED.valeur,
    description = EXCLUDED.description,
    updated_at = now();

-- ========================================
-- ✅ ÉTAPE 11: VALIDATION ET RAPPORT
-- ========================================

-- 11.1 - VALIDATION STRUCTURE
-- ========================================

SELECT '✅ VALIDATION SYSTÈME COMMISSION PARAMÉTRABLE V3' as status;

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

-- Vérifier colonnes ajoutées
SELECT 
    'Colonnes ajoutées:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conducteurs' AND column_name = 'entreprise_id') 
        THEN '✅ conducteurs.entreprise_id'
        ELSE '❌ conducteurs.entreprise_id manquante'
    END ||
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'commission_taux') 
        THEN ' ✅ reservations.commission_taux'
        ELSE ' ❌ reservations.commission_taux manquante'
    END as colonnes_status;

-- Vérifier fonctions créées
SELECT 
    'Fonctions commission:' as section,
    COUNT(CASE WHEN proname = 'get_commission_taux' THEN 1 END) as get_commission,
    COUNT(CASE WHEN proname = 'set_commission_taux' THEN 1 END) as set_commission,
    COUNT(CASE WHEN proname = 'authenticate_entreprise' THEN 1 END) as authenticate
FROM pg_proc 
WHERE proname IN ('get_commission_taux', 'set_commission_taux', 'authenticate_entreprise');

-- 11.2 - RAPPORT FINAL
-- ========================================

SELECT 
    '🎉 SYSTÈME COMMISSION PARAMÉTRABLE V3 INSTALLÉ' as status,
    (SELECT COUNT(*) FROM entreprises WHERE actif = true) as entreprises_actives,
    (SELECT COUNT(*) FROM conducteurs WHERE entreprise_id IS NOT NULL) as conducteurs_entreprise,
    (SELECT COUNT(*) FROM conducteurs WHERE entreprise_id IS NULL) as conducteurs_freelance,
    (SELECT COUNT(*) FROM commission_history WHERE actif = true) as historique_commissions;

-- ========================================
-- 📋 COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE entreprises IS 'Entreprises de transport avec authentification - Adapté structure existante v3';
COMMENT ON TABLE commission_history IS 'Historique taux commission avec périodes application - Système paramétrable v3';
COMMENT ON COLUMN conducteurs.entreprise_id IS 'Lien facultatif vers entreprise (NULL = freelance 0% commission)';
COMMENT ON COLUMN reservations.commission_taux IS 'Taux commission appliqué lors réservation (conservé historiquement)';
COMMENT ON COLUMN reservations.commission_montant IS 'Montant commission calculé en unités prix_total';

COMMENT ON FUNCTION get_commission_taux(UUID, DATE) IS 'Calcule taux commission applicable selon historique - v3';
COMMENT ON FUNCTION set_commission_taux(UUID, DECIMAL, DATE, TEXT, VARCHAR) IS 'Modifie commission avec gestion historique - v3';
COMMENT ON FUNCTION authenticate_entreprise(VARCHAR, TEXT) IS 'Authentification entreprise pour interface admin - v3';

COMMENT ON VIEW conducteurs_avec_commission IS 'Conducteurs avec commission actuelle - Adapté structure existante v3';
COMMENT ON VIEW reservations_avec_commission IS 'Réservations avec calculs commission réels - Utilise prix_total existant v3';

-- ========================================
-- 🎯 INSTRUCTIONS POST-INSTALLATION
-- ========================================

/*
📋 PROCHAINES ÉTAPES APRÈS INSTALLATION:

1. 🧪 TESTS DE VALIDATION:
   - Tester get_commission_taux() avec différentes dates
   - Vérifier l'authentification authenticate_entreprise()
   - Valider les vues avec des données réelles

2. ✏️ PARAMÉTRAGE:
   - Configurer les taux de commission réels via set_commission_taux()
   - Attribuer les conducteurs existants aux bonnes entreprises
   - Ajuster les paramètres dans la table parametres

3. 🤖 INTÉGRATION BOT:
   - Modifier le bot WhatsApp pour utiliser get_commission_taux()
   - Mettre à jour les calculs de prix avec commission
   - Adapter l'affichage des confirmations

4. 📊 MONITORING:
   - Surveiller les vues reservations_avec_commission
   - Vérifier la cohérence des calculs
   - Contrôler les changements via historique_commissions

COMMANDES UTILES:
- Test commission: SELECT get_commission_taux('uuid-entreprise', CURRENT_DATE);
- Changer taux: SELECT set_commission_taux('uuid', 20.00, '2025-08-01', 'Nouveau taux', 'admin');
- Voir historique: SELECT * FROM historique_commissions WHERE entreprise_nom = 'NOM';
- Stats globales: SELECT * FROM reservations_avec_commission WHERE created_at >= CURRENT_DATE - 7;
*/

SELECT '🎯 SYSTÈME COMMISSION PARAMÉTRABLE V3 PRÊT POUR PRODUCTION' as final_status;