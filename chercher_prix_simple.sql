-- Script simple pour chercher 6,889,756.117 dans la base
-- Exécuter ligne par ligne dans Supabase SQL Editor

-- 1. Lister toutes les tables existantes
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. Chercher dans les sessions (table temporaire bot Pular)
SELECT * FROM sessions WHERE client_phone = '+33620951645';

-- 3. Vérifier les colonnes de la table sessions
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions';

-- 4. Chercher dans les tables de logs si elles existent
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%log%';

-- 5. Test de calcul inverse - d'où vient 6,889,756.117 ?
SELECT 
    6889756.117 / 4589.8 as tarif_par_km_si_distance_4589,
    6889756.117 / 12.2 as tarif_par_km_si_distance_12,
    4589.8 * 1500 as si_tarif_1500_distance_4589,
    4589.8 * 1000 as si_tarif_1000_distance_4589;

-- 6. Chercher toutes les colonnes contenant "prix" ou "price"
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name LIKE '%prix%' 
   OR column_name LIKE '%price%' 
   OR column_name LIKE '%montant%'
   OR column_name LIKE '%total%';

-- 7. Si table notifications existe, vérifier dedans
SELECT * FROM notifications_pending WHERE reservation_id IN (
    SELECT id FROM reservations WHERE client_phone = '+33620951645'
) LIMIT 5;