-- Script pour ajouter les colonnes temporelles à la table reservations
-- Pour supporter les réservations planifiées (ex: "demain 14h")

-- 1. Ajouter les colonnes temporelles
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS date_reservation DATE NULL,
ADD COLUMN IF NOT EXISTS heure_reservation INTEGER NULL CHECK (heure_reservation >= 0 AND heure_reservation <= 23),
ADD COLUMN IF NOT EXISTS minute_reservation INTEGER NULL CHECK (minute_reservation >= 0 AND minute_reservation <= 59);

-- 2. Ajouter des commentaires pour documentation
COMMENT ON COLUMN public.reservations.date_reservation IS 'Date de la réservation planifiée (YYYY-MM-DD)';
COMMENT ON COLUMN public.reservations.heure_reservation IS 'Heure de la réservation planifiée (0-23)';
COMMENT ON COLUMN public.reservations.minute_reservation IS 'Minute de la réservation planifiée (0-59)';

-- 3. Créer un index pour améliorer les performances des requêtes temporelles
CREATE INDEX IF NOT EXISTS idx_reservations_date_heure 
ON public.reservations(date_reservation, heure_reservation, minute_reservation) 
WHERE date_reservation IS NOT NULL;

-- 4. Test de vérification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    check_clause
FROM information_schema.columns 
LEFT JOIN information_schema.check_constraints 
    ON column_name = constraint_name
WHERE table_name = 'reservations' 
    AND column_name IN ('date_reservation', 'heure_reservation', 'minute_reservation')
ORDER BY ordinal_position;

-- 5. Test d'insertion avec données temporelles
-- (Commenté pour éviter d'insérer des données de test)
/*
INSERT INTO reservations (
    client_phone,
    vehicle_type,
    position_depart,
    destination_nom,
    date_reservation,
    heure_reservation,
    minute_reservation,
    statut
) VALUES (
    '+33600000000',
    'moto',
    'POINT(2.5891416 48.6276593)',
    'Test Temporel',
    '2025-07-28',  -- Demain
    14,            -- 14h
    0,             -- 00 minutes
    'pending'
);

-- Vérifier l'insertion
SELECT 
    id,
    client_phone,
    date_reservation,
    heure_reservation,
    minute_reservation,
    created_at
FROM reservations 
WHERE client_phone = '+33600000000'
ORDER BY created_at DESC
LIMIT 1;

-- Nettoyer après test
DELETE FROM reservations WHERE client_phone = '+33600000000';
*/

-- Message de succès
SELECT 'Colonnes temporelles ajoutées avec succès à la table reservations' AS message;