-- Script SQL pour modifier la table reservations existante
-- pour correspondre au code du bot WhatsApp
-- Exécuter dans Supabase SQL Editor

-- 0. Sauvegarder la définition de la vue avant de la supprimer
-- Récupérer la définition de la vue reservations_completes
SELECT pg_get_viewdef('reservations_completes', true) AS view_definition;

-- Supprimer temporairement la vue qui dépend de la colonne
DROP VIEW IF EXISTS reservations_completes;

-- 1. Renommer les colonnes pour correspondre au bot
-- Renommer pickup_location → position_depart
ALTER TABLE reservations 
RENAME COLUMN pickup_location TO position_depart;

-- Renommer status → statut
ALTER TABLE reservations 
RENAME COLUMN status TO statut;

-- 2. Modifier le type de la colonne position_depart
-- Changer le type pour accepter les strings POINT()
ALTER TABLE reservations 
ALTER COLUMN position_depart TYPE text;

-- 3. Ajuster les contraintes de statut
-- Supprimer l'ancienne contrainte de statut si elle existe
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

-- Ajouter nouvelle contrainte pour 'confirmee' au lieu de 'pending'
ALTER TABLE reservations 
ADD CONSTRAINT reservations_statut_check 
CHECK (statut IN ('pending', 'confirmee', 'accepted', 'completed', 'canceled'));

-- Changer la valeur par défaut
ALTER TABLE reservations 
ALTER COLUMN statut SET DEFAULT 'pending';

-- 4. Vérifier la structure finale
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;

-- 5. Test d'insertion pour vérifier la compatibilité
-- Cette requête devrait fonctionner après les modifications
INSERT INTO reservations (
  client_phone, 
  conducteur_id, 
  vehicle_type, 
  position_depart, 
  statut
) VALUES (
  '+33123456789', 
  '9c247ae9-6162-4eef-9e45-2fef45124dfb',
  'moto',
  'POINT(2.5891416 48.6276593)',
  'confirmee'
);

-- Supprimer le test après vérification
DELETE FROM reservations WHERE client_phone = '+33123456789';

-- 6. Recréer la vue reservations_completes avec les nouveaux noms de colonnes
CREATE VIEW reservations_completes AS
SELECT 
    r.id,
    r.client_phone,
    r.vehicle_type,
    r.position_depart,  -- ancien pickup_location
    r.statut,          -- ancien status
    r.created_at,
    c.nom AS conducteur_nom,
    c.prenom AS conducteur_prenom,
    c.telephone AS conducteur_telephone,
    concat(c.vehicle_marque, ' ', c.vehicle_modele, ' ', c.vehicle_couleur) AS vehicule_info,
    c.vehicle_plaque,
    c.note_moyenne AS conducteur_note
FROM reservations r
LEFT JOIN conducteurs c ON r.conducteur_id = c.id
ORDER BY r.created_at DESC;