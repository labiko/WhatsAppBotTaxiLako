-- Script pour désactiver toutes les contraintes de la table reservations
-- Exécuter dans Supabase SQL Editor

-- 1. Désactiver toutes les contraintes de clé étrangère
ALTER TABLE reservations DISABLE TRIGGER ALL;

-- 2. Désactiver les contraintes CHECK (si elles existent)
-- Lister d'abord les contraintes existantes
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'reservations'::regclass;

-- 3. Supprimer les contraintes NOT NULL temporairement (optionnel)
-- ALTER TABLE reservations ALTER COLUMN destination_id DROP NOT NULL;
-- ALTER TABLE reservations ALTER COLUMN conducteur_id DROP NOT NULL;
-- ALTER TABLE reservations ALTER COLUMN position_arrivee DROP NOT NULL;

-- 4. Désactiver RLS temporairement (si activé)
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- 5. Vérifier la structure de la table (commande psql non supportée dans Supabase)
-- \d reservations;

-- 6. Test d'insertion simple pour debug
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    statut
) VALUES (
    '+33TEST123',
    'moto',
    'pending'
);

-- 7. Supprimer le test
DELETE FROM reservations WHERE client_phone = '+33TEST123';