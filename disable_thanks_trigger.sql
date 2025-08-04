-- Désactiver temporairement le trigger thanks_client pour éviter duplication
DROP TRIGGER IF EXISTS trigger_thanks_client ON reservations;
