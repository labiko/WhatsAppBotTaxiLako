-- ================================================
-- 🔍 DIAGNOSTIC STRUCTURE TABLE RESERVATIONS
-- ================================================

-- 1. Vérifier la structure de la table reservations
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'reservations';

-- 3. Vérifier les index
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'reservations';

-- 4. Compter les réservations existantes
SELECT 
    COUNT(*) as total_reservations,
    COUNT(CASE WHEN statut = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN statut = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN statut = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN statut = 'canceled' THEN 1 END) as canceled
FROM reservations;