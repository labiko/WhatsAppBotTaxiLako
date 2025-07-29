-- Table pour stocker les sessions utilisateur
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL UNIQUE,
  vehicle_type text,
  step text NOT NULL DEFAULT 'init',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON user_sessions(client_phone);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON user_sessions(updated_at DESC);

-- Fonction pour nettoyer les sessions expirées (plus de 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE updated_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;