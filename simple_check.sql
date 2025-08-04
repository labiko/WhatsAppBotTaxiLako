-- Vérification rapide des colonnes
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'adresses' 
ORDER BY column_name;