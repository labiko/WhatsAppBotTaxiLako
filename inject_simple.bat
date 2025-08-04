@echo off
echo ========================================
echo INJECTION GOOGLE PLACES DIRECT
echo ========================================
echo.

cd "C:\Users\diall\Documents\LokoTaxi"

echo Verification du fichier SQL...
if not exist "conakry_google_grid_2025-07-30T15-23-17-434Z.sql" (
    echo ERREUR: Fichier SQL non trouve
    pause
    exit /b 1
)

echo ✅ Fichier SQL trouve
echo.

echo ATTENTION: Cette operation va injecter 2,877 lieux Google Places
echo.
echo Appuyez sur une touche pour continuer ou CTRL+C pour annuler...
pause

echo.
echo Injection en cours...
psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres" -f "conakry_google_grid_2025-07-30T15-23-17-434Z.sql"

if errorlevel 1 (
    echo.
    echo ERREUR lors de l'injection
    pause
    exit /b 1
)

echo.
echo ✅ INJECTION TERMINEE!
echo.
echo Verification...
echo SELECT COUNT(*) FROM adresses WHERE source_donnees = 'google_places_grid_search'; | psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

echo.
echo Recherche 2LK...
echo SELECT nom, telephone FROM adresses WHERE nom ILIKE '%%2LK%%'; | psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

echo.
echo TERMINE! Testez maintenant le bot avec "2LK"
pause