-- Script pour ajouter les colonnes manquantes pour le système de notation
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter les colonnes pour le système de notation
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS waiting_for_note BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS waiting_for_comment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reservation_to_rate UUID NULL,
ADD COLUMN IF NOT EXISTS current_rating INTEGER NULL;

-- 2. Ajouter un index pour les sessions en attente de notation
CREATE INDEX IF NOT EXISTS idx_sessions_waiting_note 
ON public.sessions (client_phone, waiting_for_note) 
WHERE waiting_for_note = TRUE;

-- 3. Vérifier que les colonnes ont été ajoutées
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
AND column_name IN ('waiting_for_note', 'waiting_for_comment', 'reservation_to_rate', 'current_rating')
ORDER BY ordinal_position;

-- 4. Mettre à jour la requête de vérification
SELECT 
    id,
    client_phone,
    waiting_for_note,
    waiting_for_comment,
    reservation_to_rate,
    vehicle_type,
    etat,
    created_at,
    updated_at,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS "minutes_until_expiry"
FROM sessions
WHERE client_phone = '+33620951645'
ORDER BY updated_at DESC;