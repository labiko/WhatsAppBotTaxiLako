-- ===============================================
-- SUPPRIMER LA CONTRAINTE UNIQUE SUR client_phone
-- ===============================================

-- Supprimer la contrainte unique qui cause l'erreur 409
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_client_phone_key;

-- Vérifier que la contrainte a été supprimée
SELECT 
    conname as constraint_name, 
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass 
  AND conname LIKE '%client_phone%';

-- Afficher toutes les contraintes restantes
SELECT 
    'REMAINING_CONSTRAINTS' as section,
    conname as constraint_name, 
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass;