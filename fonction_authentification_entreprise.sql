-- ========================================
-- FONCTIONS AUTHENTIFICATION ENTREPRISE
-- ========================================
-- Description: Fonctions pour gestion login/password entreprises
-- Usage: Authentification interface admin entreprises
-- ========================================

-- 🔐 FONCTION AUTHENTIFICATION ENTREPRISE
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
    SELECT 
        id, nom, password_hash, actif
    INTO v_entreprise_record
    FROM entreprises 
    WHERE login = p_login AND actif = true;
    
    -- Si login non trouvé
    IF v_entreprise_record.id IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            NULL::UUID as entreprise_id,
            NULL::VARCHAR(100) as entreprise_nom,
            'Login non trouvé ou entreprise inactive'::TEXT as message;
        RETURN;
    END IF;
    
    -- Si pas de mot de passe configuré
    IF v_entreprise_record.password_hash IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            NULL::UUID as entreprise_id,
            NULL::VARCHAR(100) as entreprise_nom,
            'Authentification non configurée pour cette entreprise'::TEXT as message;
        RETURN;
    END IF;
    
    -- Vérifier mot de passe avec crypt
    IF crypt(p_password, v_entreprise_record.password_hash) = v_entreprise_record.password_hash THEN
        -- Authentification réussie
        RETURN QUERY SELECT 
            true::BOOLEAN as success,
            v_entreprise_record.id as entreprise_id,
            v_entreprise_record.nom as entreprise_nom,
            'Authentification réussie'::TEXT as message;
        
        -- Log de connexion (optionnel)
        INSERT INTO logs_connexion_entreprise (entreprise_id, success, ip_address)
        VALUES (v_entreprise_record.id, true, inet_client_addr())
        ON CONFLICT DO NOTHING; -- Ignore si table n'existe pas
        
    ELSE
        -- Mot de passe incorrect
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            NULL::UUID as entreprise_id,
            NULL::VARCHAR(100) as entreprise_nom,
            'Mot de passe incorrect'::TEXT as message;
        
        -- Log échec connexion (optionnel)
        INSERT INTO logs_connexion_entreprise (entreprise_id, success, ip_address)
        VALUES (v_entreprise_record.id, false, inet_client_addr())
        ON CONFLICT DO NOTHING; -- Ignore si table n'existe pas
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔑 FONCTION CHANGEMENT MOT DE PASSE
-- ========================================

CREATE OR REPLACE FUNCTION change_entreprise_password(
    p_entreprise_id UUID,
    p_old_password TEXT,
    p_new_password TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current_hash VARCHAR(255);
    v_entreprise_nom VARCHAR(100);
BEGIN
    -- Récupérer hash actuel
    SELECT password_hash, nom INTO v_current_hash, v_entreprise_nom
    FROM entreprises 
    WHERE id = p_entreprise_id AND actif = true;
    
    -- Vérifier entreprise existe
    IF v_entreprise_nom IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            'Entreprise non trouvée ou inactive'::TEXT as message;
        RETURN;
    END IF;
    
    -- Si pas de mot de passe actuel, permettre définition directe
    IF v_current_hash IS NULL THEN
        UPDATE entreprises 
        SET password_hash = crypt(p_new_password, gen_salt('bf')),
            updated_at = now()
        WHERE id = p_entreprise_id;
        
        RETURN QUERY SELECT 
            true::BOOLEAN as success,
            'Mot de passe défini avec succès'::TEXT as message;
        RETURN;
    END IF;
    
    -- Vérifier ancien mot de passe
    IF crypt(p_old_password, v_current_hash) != v_current_hash THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            'Ancien mot de passe incorrect'::TEXT as message;
        RETURN;
    END IF;
    
    -- Validation nouveau mot de passe
    IF LENGTH(p_new_password) < 8 THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            'Le nouveau mot de passe doit contenir au moins 8 caractères'::TEXT as message;
        RETURN;
    END IF;
    
    -- Mettre à jour mot de passe
    UPDATE entreprises 
    SET password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_entreprise_id;
    
    RETURN QUERY SELECT 
        true::BOOLEAN as success,
        'Mot de passe modifié avec succès'::TEXT as message;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔓 FONCTION RÉINITIALISATION MOT DE PASSE (ADMIN)
-- ========================================

CREATE OR REPLACE FUNCTION reset_entreprise_password(
    p_entreprise_id UUID,
    p_new_password TEXT,
    p_admin_user VARCHAR(100) DEFAULT 'admin'
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_entreprise_nom VARCHAR(100);
BEGIN
    -- Vérifier entreprise existe
    SELECT nom INTO v_entreprise_nom
    FROM entreprises 
    WHERE id = p_entreprise_id AND actif = true;
    
    IF v_entreprise_nom IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            'Entreprise non trouvée ou inactive'::TEXT as message;
        RETURN;
    END IF;
    
    -- Validation mot de passe
    IF LENGTH(p_new_password) < 8 THEN
        RETURN QUERY SELECT 
            false::BOOLEAN as success,
            'Le mot de passe doit contenir au moins 8 caractères'::TEXT as message;
        RETURN;
    END IF;
    
    -- Réinitialiser mot de passe
    UPDATE entreprises 
    SET password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_entreprise_id;
    
    -- Log réinitialisation
    INSERT INTO logs_reset_password (entreprise_id, admin_user, reset_date)
    VALUES (p_entreprise_id, p_admin_user, now())
    ON CONFLICT DO NOTHING; -- Ignore si table n'existe pas
    
    RETURN QUERY SELECT 
        true::BOOLEAN as success,
        'Mot de passe réinitialisé avec succès pour ' || v_entreprise_nom::TEXT as message;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📊 FONCTION VÉRIFICATION LOGIN DISPONIBLE
-- ========================================

CREATE OR REPLACE FUNCTION check_login_availability(
    p_login VARCHAR(50),
    p_entreprise_id UUID DEFAULT NULL
) RETURNS TABLE (
    available BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- Vérifier si login existe déjà
    SELECT id INTO v_existing_id
    FROM entreprises 
    WHERE login = p_login AND actif = true;
    
    -- Si login libre
    IF v_existing_id IS NULL THEN
        RETURN QUERY SELECT 
            true::BOOLEAN as available,
            'Login disponible'::TEXT as message;
        RETURN;
    END IF;
    
    -- Si c'est la même entreprise (modification)
    IF v_existing_id = p_entreprise_id THEN
        RETURN QUERY SELECT 
            true::BOOLEAN as available,
            'Login disponible (entreprise actuelle)'::TEXT as message;
        RETURN;
    END IF;
    
    -- Login déjà pris
    RETURN QUERY SELECT 
        false::BOOLEAN as available,
        'Login déjà utilisé par une autre entreprise'::TEXT as message;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 📋 TABLES LOGS OPTIONNELLES
-- ========================================

-- Table logs connexion (optionnelle)
CREATE TABLE IF NOT EXISTS logs_connexion_entreprise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID REFERENCES entreprises(id),
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    connexion_date TIMESTAMP DEFAULT now()
);

-- Table logs réinitialisation password (optionnelle)
CREATE TABLE IF NOT EXISTS logs_reset_password (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID REFERENCES entreprises(id),
    admin_user VARCHAR(100),
    reset_date TIMESTAMP DEFAULT now()
);

-- Index pour performance logs
CREATE INDEX IF NOT EXISTS idx_logs_connexion_entreprise_date 
    ON logs_connexion_entreprise(entreprise_id, connexion_date DESC);
CREATE INDEX IF NOT EXISTS idx_logs_reset_password_date 
    ON logs_reset_password(entreprise_id, reset_date DESC);

-- ========================================
-- 🧪 EXEMPLES D'USAGE
-- ========================================

/*
-- Authentification entreprise
SELECT * FROM authenticate_entreprise('taxi_express', 'TaxiExpress2025!');

-- Résultat attendu:
-- success | entreprise_id | entreprise_nom      | message
-- true    | uuid-123...   | Taxi Express Conakry| Authentification réussie

-- Changer mot de passe
SELECT * FROM change_entreprise_password(
    'uuid-entreprise',
    'TaxiExpress2025!',  -- ancien
    'NouveauMotDePasse2025!'  -- nouveau
);

-- Vérifier disponibilité login
SELECT * FROM check_login_availability('nouveau_login');

-- Réinitialiser mot de passe (admin)
SELECT * FROM reset_entreprise_password(
    'uuid-entreprise',
    'MotDePasseTemporaire2025!',
    'admin_system'
);
*/

-- ========================================
-- 📋 COMMENTAIRES
-- ========================================

COMMENT ON FUNCTION authenticate_entreprise(VARCHAR, TEXT) IS 'Authentifie une entreprise avec login/password';
COMMENT ON FUNCTION change_entreprise_password(UUID, TEXT, TEXT) IS 'Change le mot de passe d''une entreprise';
COMMENT ON FUNCTION reset_entreprise_password(UUID, TEXT, VARCHAR) IS 'Réinitialise le mot de passe (fonction admin)';
COMMENT ON FUNCTION check_login_availability(VARCHAR, UUID) IS 'Vérifie la disponibilité d''un login';

COMMENT ON TABLE logs_connexion_entreprise IS 'Logs des tentatives de connexion entreprises';
COMMENT ON TABLE logs_reset_password IS 'Logs des réinitialisations de mot de passe';

-- ========================================
-- ✅ INSTALLATION TERMINÉE
-- ========================================

SELECT 
    '✅ FONCTIONS AUTHENTIFICATION ENTREPRISE CRÉÉES' as status,
    '🔐 authenticate_entreprise()' as fonction_1,
    '🔑 change_entreprise_password()' as fonction_2,
    '🔓 reset_entreprise_password()' as fonction_3,
    '📊 check_login_availability()' as fonction_4;