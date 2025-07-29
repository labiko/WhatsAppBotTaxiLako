-- ===============================================
-- DÉSACTIVER TOUTES LES CONTRAINTES SUR SESSIONS
-- ===============================================

-- Lister toutes les contraintes actuelles
SELECT 
    'BEFORE_REMOVAL' as section,
    conname as constraint_name, 
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass;

-- Supprimer toutes les contraintes sur sessions (sauf PRIMARY KEY)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_client_phone_key;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_etat_check;  
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_destination_id_fkey;

-- Vérifier qu'il ne reste que la PRIMARY KEY
SELECT 
    'AFTER_REMOVAL' as section,
    conname as constraint_name, 
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass;