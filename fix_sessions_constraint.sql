-- ===============================================
-- FIX URGENT - Contrainte sessions_etat_check
-- ===============================================

-- Supprimer l'ancienne contrainte
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_etat_check;

-- Ajouter la nouvelle contrainte avec tous les états nécessaires
ALTER TABLE sessions ADD CONSTRAINT sessions_etat_check 
CHECK (etat IN (
  'initial', 
  'vehicule_choisi', 
  'position_recue', 
  'destination_saisie', 
  'prix_calcule', 
  'confirme',
  'vehicule_et_destination_ia',     -- NOUVEAU : État IA audio
  'position_recue_avec_destination_ia', -- NOUVEAU : GPS après IA
  'test_manual'                     -- NOUVEAU : Pour les tests
));

-- Vérification
SELECT constraint_name, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.sessions'::regclass 
  AND constraint_name = 'sessions_etat_check';