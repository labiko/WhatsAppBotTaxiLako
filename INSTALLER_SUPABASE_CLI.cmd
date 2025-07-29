@echo off
REM ==============================
REM INSTALLATION SUPABASE CLI
REM ==============================

echo.
echo 🚀 INSTALLATION SUPABASE CLI
echo =============================
echo.

REM Vérifier si NPM est disponible
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ NPM détecté, installation via NPM...
    npm install -g supabase
    echo.
    echo ✅ Installation terminée !
    echo.
    echo 🧪 Test de l'installation :
    supabase --version
    echo.
    echo 🔑 Connexion au projet :
    supabase login
    echo.
    echo 📁 Lier au projet existant :
    supabase link --project-ref nmwnibzgvwltipmtwhzo
    echo.
    pause
) else (
    echo ❌ NPM non trouvé
    echo.
    echo 📥 Téléchargement direct depuis GitHub...
    echo 1. Allez sur : https://github.com/supabase/cli/releases/latest
    echo 2. Téléchargez : supabase_windows_amd64.zip
    echo 3. Extrayez dans C:\supabase\
    echo 4. Ajoutez C:\supabase\ au PATH
    echo.
    echo Puis relancez ce script.
    pause
)