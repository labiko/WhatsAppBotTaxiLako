@echo off
echo 🚀 INJECTION MASSIVE 15,000 LIEUX GUINÉE via PSQL
echo ================================================

echo.
echo 📋 INFORMATIONS DE CONNEXION:
echo Host: aws-0-eu-central-1.pooler.supabase.com
echo Port: 6543
echo Database: postgres
echo User: postgres.nmwnibzgvwltipmtwhzo

echo.
echo ⚠️ ATTENTION: Le mot de passe sera demandé
echo.

echo 🔄 Lancement injection SQL...
psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U postgres.nmwnibzgvwltipmtwhzo -d postgres -f guinea_complete_injection.sql

echo.
echo ✅ Injection terminée !
echo 📊 Vérifiez le résultat dans les logs ci-dessus
pause