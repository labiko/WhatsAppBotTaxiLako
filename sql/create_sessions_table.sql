-- Script SQL pour créer la table sessions pour persistance des états utilisateur WhatsApp
-- Exécuter dans Supabase SQL Editor

-- Créer la table sessions pour stocker les états des conversations WhatsApp
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_phone text NOT NULL UNIQUE,
  vehicle_type text CHECK (vehicle_type IN ('moto', 'voiture')),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '1 hour')
);

-- Index pour optimiser les recherches par téléphone
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(client_phone);

-- Index pour nettoyer les sessions expirées
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- RLS (Row Level Security) - optionnel pour sécuriser
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Politique permettant à la fonction Edge de lire/écrire
CREATE POLICY "Allow Edge Functions access to sessions" 
ON sessions FOR ALL 
TO service_role 
USING (true);

-- Fonction pour nettoyer automatiquement les sessions expirées
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < now();
END;
$$;

-- Vérifier la structure créée
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;