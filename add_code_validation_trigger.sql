-- 🔐 TRIGGER GÉNÉRATION CODE VALIDATION AUTOMATIQUE
-- Génère un code à 4 chiffres aléatoire à chaque INSERT dans reservations

-- 1️⃣ FONCTION DE GÉNÉRATION DU CODE
CREATE OR REPLACE FUNCTION generate_validation_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Générer un code aléatoire à 4 chiffres (1000-9999)
    NEW.code_validation := LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0');
    
    RAISE NOTICE '🔐 Code validation généré: % pour réservation %', NEW.code_validation, NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ CRÉER LE TRIGGER
DROP TRIGGER IF EXISTS trigger_generate_validation_code ON reservations;
CREATE TRIGGER trigger_generate_validation_code
    BEFORE INSERT ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION generate_validation_code();

-- 3️⃣ TEST DU TRIGGER
-- Insérer une réservation test pour vérifier
/*
INSERT INTO reservations (client_phone, vehicle_type, position_depart, statut)
VALUES ('+33123456789', 'voiture', ST_GeogFromText('POINT(2.3522 48.8566)'), 'pending');
*/

-- 4️⃣ VÉRIFICATION
SELECT 
    id,
    client_phone,
    code_validation,
    created_at
FROM reservations 
ORDER BY created_at DESC 
LIMIT 5;

-- ✅ TRIGGER CRÉÉ - Chaque INSERT génèrera automatiquement un code à 4 chiffres