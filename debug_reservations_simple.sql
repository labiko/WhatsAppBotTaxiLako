-- Script simplifié pour debug réservations
-- Exécuter une par une dans Supabase SQL Editor

-- 1. Voir la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;

-- 2. Désactiver toutes les contraintes temporairement
ALTER TABLE reservations DISABLE TRIGGER ALL;

-- 3. Désactiver RLS
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- 4. Test insertion minimal
INSERT INTO reservations (client_phone, vehicle_type, statut) 
VALUES ('+33TEST', 'moto', 'pending') 
RETURNING id, client_phone, vehicle_type, statut;

-- 5. Nettoyer le test
DELETE FROM reservations WHERE client_phone = '+33TEST';