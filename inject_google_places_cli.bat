@echo off
echo ========================================
echo 🚀 INJECTION GOOGLE PLACES VIA SUPABASE CLI
echo ========================================
echo.

REM Vérifier si Supabase CLI est installé
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Erreur: Supabase CLI n'est pas installé
    echo 💡 Installez-le avec: scoop install supabase
    pause
    exit /b 1
)

echo ✅ Supabase CLI détecté
echo.

REM Se placer dans le bon répertoire
cd /d "C:\Users\diall\Documents\LokoTaxi"

echo 📂 Répertoire de travail: %cd%
echo.

REM Vérifier si le fichier SQL existe
if not exist "conakry_google_grid_2025-07-30T15-23-17-434Z.sql" (
    echo ❌ Erreur: Fichier SQL non trouvé
    echo Assurez-vous que conakry_google_grid_2025-07-30T15-23-17-434Z.sql existe
    pause
    exit /b 1
)

echo ✅ Fichier SQL trouvé
echo 📊 Taille: 
dir conakry_google_grid_2025-07-30T15-23-17-434Z.sql | find "conakry"
echo.

echo ⚠️  ATTENTION: Cette opération va:
echo    1. Supprimer les anciennes données Google Places
echo    2. Injecter 2,877 nouveaux lieux
echo    3. Utiliser une TRANSACTION (rollback en cas d'erreur)
echo.
echo Appuyez sur CTRL+C pour annuler ou...
pause

echo.
echo 🔄 Connexion à la base de données...
echo.

REM Configuration de l'URL de connexion
set "DB_URL=postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

REM Vérifier si psql est disponible
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Erreur: psql (PostgreSQL client) n'est pas installé
    echo 💡 Solutions:
    echo    1. Installer PostgreSQL client
    echo    2. Utiliser Supabase Dashboard SQL Editor
    pause
    exit /b 1
)

echo ✅ PostgreSQL client détecté
echo.

REM Test de connexion simple
echo 🔌 Test de connexion à Supabase...
echo SELECT 1 as test; | psql "%DB_URL%" >nul 2>&1
if errorlevel 1 (
    echo ❌ Erreur de connexion à la base Supabase
    echo 💡 Vérifiez:
    echo    - La connexion internet
    echo    - Le mot de passe de la base
    echo    - L'URL Supabase
    pause
    exit /b 1
)

echo ✅ Connexion Supabase établie
echo.

REM Exécuter le script SQL via psql
echo 💾 Injection en cours (peut prendre 1-2 minutes)...
echo ⏳ Ne fermez pas cette fenêtre...
psql "%DB_URL%" -f conakry_google_grid_2025-07-30T15-23-17-434Z.sql

if errorlevel 1 (
    echo.
    echo ❌ ERREUR lors de l'injection!
    echo Vérifiez les logs ci-dessus
    pause
    exit /b 1
)

echo.
echo ✅ INJECTION RÉUSSIE!
echo.

REM Vérifications post-injection
echo 🔍 Vérification des données injectées...
echo.

REM Créer un fichier de vérification
echo -- Vérifications post-injection > verify_injection.sql
echo SELECT COUNT(*) as total_google FROM adresses WHERE source_donnees = 'google_places_grid_search'; >> verify_injection.sql
echo SELECT COUNT(*) as total_2lk FROM adresses WHERE nom ILIKE '%%2LK%%'; >> verify_injection.sql
echo SELECT nom, telephone, note_moyenne FROM adresses WHERE nom ILIKE '%%2LK%%'; >> verify_injection.sql

REM Exécuter les vérifications
psql "%DB_URL%" -f verify_injection.sql

echo.
echo 🎉 TERMINÉ!
echo.
echo 📊 Résultats attendus:
echo    - 2,877 lieux Google Places
echo    - 2LK RESTAURANT-LOUNGE disponible
echo    - Bot WhatsApp enrichi avec nouvelles données
echo.

REM Nettoyer
del verify_injection.sql 2>nul

pause