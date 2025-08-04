@echo off
echo ========================================
echo VERIFICATION RAPIDE INJECTION
echo ========================================
echo.

cd "C:\Users\diall\Documents\LokoTaxi"

echo Test 1: Comptage Google Places...
echo SELECT COUNT(*) FROM adresses WHERE source_donnees = 'google_places_grid_search'; | psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

echo.
echo Test 2: Recherche 2LK...
echo SELECT nom, telephone FROM adresses WHERE nom ILIKE '%%2LK%%'; | psql "postgresql://postgres:kZlDbxjn6zGgiuGm@db.nmwnibzgvwltipmtwhzo.supabase.co:5432/postgres"

echo.
echo ========================================
echo TESTS TERMINES
echo ========================================
pause