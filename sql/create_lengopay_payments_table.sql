-- Table pour stocker tous les callbacks de paiement LengoPay
CREATE TABLE IF NOT EXISTS lengopay_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(255) UNIQUE NOT NULL,  -- ID unique du paiement LengoPay
    status VARCHAR(50) NOT NULL,              -- SUCCESS, FAILED, PENDING
    amount DECIMAL(12,2) NOT NULL,            -- Montant en GNF
    currency VARCHAR(10) DEFAULT 'GNF',       -- Devise
    client_phone VARCHAR(50),                 -- Numéro du client payeur
    message TEXT,                              -- Message de LengoPay
    raw_json JSONB,                           -- JSON brut complet pour audit
    
    -- Métadonnées de traçabilité
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Lien potentiel avec une réservation
    reservation_id UUID,
    
    -- Index pour recherches rapides
    CONSTRAINT fk_reservation 
        FOREIGN KEY (reservation_id) 
        REFERENCES reservations(id) 
        ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_lengopay_payments_status ON lengopay_payments(status);
CREATE INDEX IF NOT EXISTS idx_lengopay_payments_client_phone ON lengopay_payments(client_phone);
CREATE INDEX IF NOT EXISTS idx_lengopay_payments_created_at ON lengopay_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lengopay_payments_reservation_id ON lengopay_payments(reservation_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lengopay_payments_updated_at 
    BEFORE UPDATE ON lengopay_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires sur la table
COMMENT ON TABLE lengopay_payments IS 'Stockage des callbacks de paiement LengoPay';
COMMENT ON COLUMN lengopay_payments.payment_id IS 'Identifiant unique du paiement côté LengoPay';
COMMENT ON COLUMN lengopay_payments.status IS 'Statut du paiement: SUCCESS, FAILED, PENDING';
COMMENT ON COLUMN lengopay_payments.client_phone IS 'Numéro de téléphone du client qui a effectué le paiement';
COMMENT ON COLUMN lengopay_payments.raw_json IS 'Payload JSON complet reçu de LengoPay pour audit';