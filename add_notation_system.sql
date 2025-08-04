-- 🌟 SYSTÈME DE NOTATION CONDUCTEUR - IMPLÉMENTATION COMPLÈTE
-- Plan: Validation course + Notation client + Remerciements automatiques

-- =================================================================
-- 1️⃣ AJOUT DES NOUVELLES COLONNES À LA TABLE RESERVATIONS
-- =================================================================

-- Colonne pour commentaire client
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS commentaire TEXT NULL;

-- Colonne pour note conducteur (1-5 étoiles)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS note_conducteur INTEGER 
CHECK (note_conducteur >= 1 AND note_conducteur <= 5);

-- Colonne pour timestamp ajout commentaire
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS date_add_commentaire TIMESTAMP WITH TIME ZONE NULL;

-- =================================================================
-- 2️⃣ FONCTION TRIGGER - VALIDATION RÉSERVATION
-- =================================================================

CREATE OR REPLACE FUNCTION notify_reservation_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Détecter quand date_code_validation passe de NULL à NOT NULL
    IF OLD.date_code_validation IS NULL AND NEW.date_code_validation IS NOT NULL THEN
        
        -- Créer notification pour demander note
        INSERT INTO notifications_pending (reservation_id, type, created_at)
        VALUES (NEW.id, 'course_validated', now())
        ON CONFLICT (reservation_id, type) DO NOTHING;
        
        -- Notifier via PostgreSQL NOTIFY
        PERFORM pg_notify('whatsapp_notification', json_build_object(
            'action', 'request_rating',
            'reservation_id', NEW.id,
            'client_phone', NEW.client_phone,
            'message', 'Course validée ! Notez votre conducteur ⭐

A = Très mauvais (1⭐)
B = Mauvais (2⭐) 
C = Correct (3⭐)
D = Bien (4⭐)
E = Excellent (5⭐)'
        )::text);
        
        RAISE NOTICE '⭐ Demande notation envoyée pour réservation % (client: %)', NEW.id, NEW.client_phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 3️⃣ FONCTION TRIGGER - REMERCIEMENT CLIENT
-- =================================================================

CREATE OR REPLACE FUNCTION notify_thanks_client()
RETURNS TRIGGER AS $$
BEGIN
    -- Détecter quand date_add_commentaire est renseigné
    IF OLD.date_add_commentaire IS NULL AND NEW.date_add_commentaire IS NOT NULL THEN
        
        -- Créer notification de remerciement
        INSERT INTO notifications_pending (reservation_id, type, created_at)
        VALUES (NEW.id, 'thanks_client', now())
        ON CONFLICT (reservation_id, type) DO NOTHING;
        
        -- Notifier via PostgreSQL NOTIFY
        PERFORM pg_notify('whatsapp_notification', json_build_object(
            'action', 'send_thanks',
            'reservation_id', NEW.id,
            'client_phone', NEW.client_phone,
            'message', 'Merci pour votre avis ! À bientôt sur LokoTaxi 🚕'
        )::text);
        
        RAISE NOTICE '🙏 Message remerciement envoyé pour réservation % (client: %)', NEW.id, NEW.client_phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 4️⃣ CRÉATION DES TRIGGERS
-- =================================================================

-- Trigger pour validation réservation
DROP TRIGGER IF EXISTS trigger_reservation_validated ON reservations;
CREATE TRIGGER trigger_reservation_validated
    AFTER UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION notify_reservation_validation();

-- Trigger pour remerciement client
DROP TRIGGER IF EXISTS trigger_thanks_client ON reservations;
CREATE TRIGGER trigger_thanks_client
    AFTER UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION notify_thanks_client();

-- =================================================================
-- 5️⃣ FONCTION BONUS - MISE À JOUR NOTE MOYENNE CONDUCTEUR
-- =================================================================

CREATE OR REPLACE FUNCTION update_conducteur_note_moyenne()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand une nouvelle note est ajoutée, recalculer la moyenne du conducteur
    IF NEW.note_conducteur IS NOT NULL AND NEW.conducteur_id IS NOT NULL THEN
        
        UPDATE conducteurs 
        SET note_moyenne = (
            SELECT ROUND(AVG(note_conducteur::numeric), 2)
            FROM reservations 
            WHERE conducteur_id = NEW.conducteur_id 
              AND note_conducteur IS NOT NULL
        )
        WHERE id = NEW.conducteur_id;
        
        RAISE NOTICE '📊 Note moyenne conducteur % mise à jour', NEW.conducteur_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour note moyenne conducteur
DROP TRIGGER IF EXISTS trigger_update_conducteur_note ON reservations;
CREATE TRIGGER trigger_update_conducteur_note
    AFTER UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_conducteur_note_moyenne();

-- =================================================================
-- 6️⃣ VÉRIFICATION DE L'INSTALLATION
-- =================================================================

-- Vérifier les nouvelles colonnes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
  AND column_name IN ('commentaire', 'note_conducteur', 'date_add_commentaire')
ORDER BY column_name;

-- Vérifier les triggers créés
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'reservations'
  AND trigger_name IN ('trigger_reservation_validated', 'trigger_thanks_client', 'trigger_update_conducteur_note');

-- =================================================================
-- ✅ SYSTÈME DE NOTATION INSTALLÉ
-- =================================================================

-- WORKFLOW AUTOMATIQUE:
-- 1. date_code_validation renseigné → Message "Notez (1-5) ⭐"
-- 2. Bot gère note → Sauvegarde dans note_conducteur
-- 3. Bot gère commentaire → Sauvegarde + date_add_commentaire
-- 4. date_add_commentaire renseigné → Message "Merci ! À bientôt 🚕"
-- 5. Note moyenne conducteur recalculée automatiquement