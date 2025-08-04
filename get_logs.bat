@echo off
echo Ouverture du dashboard des logs...
start https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot/logs

echo.
echo Instructions:
echo 1. Le dashboard s'est ouvert dans votre navigateur
echo 2. Filtrez par "Last 5 minutes"
echo 3. Sélectionnez et copiez tous les logs (Ctrl+A, Ctrl+C)
echo 4. Appuyez sur une touche pour ouvrir le fichier log.json
pause

echo [] > "C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json"
notepad "C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json"