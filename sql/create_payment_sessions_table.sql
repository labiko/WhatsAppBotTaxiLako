-- ═══════════════════════════════════════════════════════════════
-- 💾 TABLE PAYMENT_SESSIONS - SUPPORT INTÉGRATION LENGOPAY V3
-- ═══════════════════════════════════════════════════════════════

-- 🗑️ Supprimer table si existe (dev uniquement)
DROP TABLE IF EXISTS payment_sessions CASCADE;

-- 💳 CRÉATION TABLE PAYMENT_SESSIONS
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔑 IDENTIFIANTS PAIEMENT
    payment_id VARCHAR(255) NOT NULL UNIQUE,
    client_phone VARCHAR(20) NOT NULL,
    reservation_id UUID,
    
    -- 💰 DONNÉES PAIEMENT
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GNF',
    payment_url TEXT,
    
    -- 📊 STATUT ET SUIVI
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
    
    -- 🕒 HORODATAGE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
    
    -- 🔗 MÉTADONNÉES SESSION
    session_data JSONB,
    
    -- 📱 NOTIFICATIONS
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_count INTEGER DEFAULT 0,
    
    -- 🔍 INDEX ET CONTRAINTES
    CONSTRAINT payment_sessions_amount_positive CHECK (amount > 0),
    CONSTRAINT payment_sessions_phone_format CHECK (client_phone ~ '^\+?[0-9]{8,15}$')
);

-- 📇 INDEX OPTIMISATION PERFORMANCE
CREATE INDEX idx_payment_sessions_payment_id ON payment_sessions (payment_id);
CREATE INDEX idx_payment_sessions_client_phone ON payment_sessions (client_phone);
CREATE INDEX idx_payment_sessions_status ON payment_sessions (status);
CREATE INDEX idx_payment_sessions_created_at ON payment_sessions (created_at);
CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions (expires_at);

-- 🔗 INDEX COMPOSITE POUR REQUÊTES FRÉQUENTES
CREATE INDEX idx_payment_sessions_phone_status ON payment_sessions (client_phone, status);
CREATE INDEX idx_payment_sessions_status_expires ON payment_sessions (status, expires_at);

-- ⚙️ TRIGGER AUTO-UPDATE UPDATED_AT
CREATE OR REPLACE FUNCTION update_payment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER payment_sessions_updated_at_trigger
    BEFORE UPDATE ON payment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_sessions_updated_at();

-- 🧹 FONCTION NETTOYAGE SESSIONS EXPIRÉES
CREATE OR REPLACE FUNCTION cleanup_expired_payment_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Marquer comme EXPIRED les sessions expirées
    UPDATE payment_sessions 
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING' 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Optionnel: supprimer les sessions expirées de plus de 7 jours
    DELETE FROM payment_sessions 
    WHERE status = 'EXPIRED' 
      AND updated_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 🔐 POLITIQUE RLS (Row Level Security)
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture pour service_role et anon
CREATE POLICY "payment_sessions_read_policy" ON payment_sessions
    FOR SELECT USING (true);

-- Politique: Écriture pour service_role uniquement
CREATE POLICY "payment_sessions_write_policy" ON payment_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- 📝 COMMENTAIRES DOCUMENTATION
COMMENT ON TABLE payment_sessions IS 'Sessions de paiement LengoPay pour intégration WhatsApp Bot V3';
COMMENT ON COLUMN payment_sessions.payment_id IS 'ID unique du paiement LengoPay (pay_id)';
COMMENT ON COLUMN payment_sessions.client_phone IS 'Numéro WhatsApp du client';
COMMENT ON COLUMN payment_sessions.amount IS 'Montant du paiement en GNF';
COMMENT ON COLUMN payment_sessions.payment_url IS 'URL de paiement Orange Money générée par LengoPay';
COMMENT ON COLUMN payment_sessions.session_data IS 'Données session bot (vehicleType, destination, etc.)';
COMMENT ON COLUMN payment_sessions.expires_at IS 'Expiration automatique après 15 minutes';

-- ✅ VÉRIFICATION CRÉATION
SELECT 
    tablename,
    schemaname,
    tablespace
FROM pg_tables 
WHERE tablename = 'payment_sessions';

-- 📊 REQUÊTES TEST RECOMMANDÉES
/*
-- Insérer session test
INSERT INTO payment_sessions (payment_id, client_phone, amount, payment_url, session_data)
VALUES ('TEST_001', '+224123456789', 15000, 'https://pay.lengopay.com/test', '{"vehicleType": "moto", "destination": "Madina"}');

-- Vérifier session
SELECT * FROM payment_sessions WHERE payment_id = 'TEST_001';

-- Nettoyer sessions expirées
SELECT cleanup_expired_payment_sessions();

-- Statistiques
SELECT status, COUNT(*) FROM payment_sessions GROUP BY status;
*/