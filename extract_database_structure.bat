@echo off
REM ========================================
REM EXTRACTION STRUCTURE BASE LOKOTAXI VIA PG_DUMP
REM ========================================
REM Description: Utilise pg_dump pour extraire la structure complète
REM Usage: Modifier les paramètres de connexion et exécuter
REM ========================================

echo ========================================
echo EXTRACTION STRUCTURE BASE LOKOTAXI
echo ========================================

REM Configuration Supabase (À MODIFIER)
set DB_HOST=nmwnibzgvwltipmtwhzo.supabase.co
set DB_PORT=5432
set DB_NAME=postgres
set DB_USER=postgres
set DB_PASSWORD=VOTRE_PASSWORD_SUPABASE

REM Fichier de sortie
set OUTPUT_FILE=lokotaxi_structure_dump.sql

echo Extraction en cours...
echo Host: %DB_HOST%
echo Database: %DB_NAME%
echo Output: %OUTPUT_FILE%
echo.

REM Commande pg_dump pour structure seulement
pg_dump ^
  --host=%DB_HOST% ^
  --port=%DB_PORT% ^
  --username=%DB_USER% ^
  --dbname=%DB_NAME% ^
  --schema-only ^
  --no-owner ^
  --no-privileges ^
  --clean ^
  --if-exists ^
  --file=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo EXTRACTION TERMINEE AVEC SUCCES
    echo ========================================
    echo Fichier genere: %OUTPUT_FILE%
    echo Taille: 
    dir %OUTPUT_FILE% | findstr %OUTPUT_FILE%
    echo.
    echo Le fichier contient la structure complete de la base:
    echo - Tables avec colonnes et types
    echo - Contraintes PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK
    echo - Index et optimisations
    echo - Vues et fonctions
    echo - Triggers et extensions
    echo.
    echo Vous pouvez maintenant analyser %OUTPUT_FILE%
) else (
    echo.
    echo ========================================
    echo ERREUR LORS DE L'EXTRACTION
    echo ========================================
    echo Verifiez:
    echo - pg_dump est installe et dans le PATH
    echo - Les parametres de connexion sont corrects
    echo - Le mot de passe Supabase est valide
    echo - La connexion reseau fonctionne
)

pause