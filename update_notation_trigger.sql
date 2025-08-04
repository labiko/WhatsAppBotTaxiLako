-- 🔄 MISE À JOUR TRIGGER NOTATION - UTILISATION LETTRES A-E
-- Pour éviter conflits avec sélection destinations (1-5)

-- 1️⃣ RECRÉER LA FONCTION AVEC NOUVEAU MESSAGE
CREATE OR REPLACE FUNCTION notify_reservation_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Détecter quand date_code_validation passe de NULL à NOT NULL
    IF OLD.date_code_validation IS NULL AND NEW.date_code_validation IS NOT NULL THEN
        
        -- Créer notification pour demander note
        INSERT INTO notifications_pending (reservation_id, type, created_at)
        VALUES (NEW.id, 'course_validated', now())
        ON CONFLICT (reservation_id, type) DO NOTHING;
        
        -- Notifier via PostgreSQL NOTIFY avec système lettres
        PERFORM pg_notify('whatsapp_notification', json_build_object(
            'action', 'request_rating',
            'reservation_id', NEW.id,
            'client_phone', NEW.client_phone,
            'message', 'Course validée ! Notez votre conducteur ⭐

A = Très mauvais (1⭐)
B = Mauvais (2⭐) 
C = Correct (3⭐)
D = Bien (4⭐)
E = Excellent (5⭐)

Tapez A, B, C, D ou E'
        )::text);
        
        RAISE NOTICE '⭐ Demande notation (lettres A-E) envoyée pour réservation % (client: %)', NEW.id, NEW.client_phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ TRIGGER DÉJÀ EXISTANT - FONCTION MISE À JOUR