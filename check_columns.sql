-- Vérifier si les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
  AND column_name IN ('note_moyenne', 'metadata')
ORDER BY column_name;