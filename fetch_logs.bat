@echo off
echo Vidage du fichier de logs...
echo [] > "C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json"

echo Pour récupérer les logs Edge Functions:
echo 1. Allez sur https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot/logs
echo 2. Cliquez sur "Export" ou copiez les logs des dernières minutes
echo 3. Collez dans le fichier log.json
echo.
echo Ou utilisez curl avec votre token:
echo curl -H "Authorization: Bearer VOTRE_ANON_KEY" "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/_internal/logs?function=whatsapp-bot&since=2m"
echo.