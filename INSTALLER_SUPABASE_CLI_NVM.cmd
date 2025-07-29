@echo off
REM ==============================
REM INSTALLATION SUPABASE CLI - SOLUTION NVM
REM ==============================

echo.
echo 🚀 INSTALLATION SUPABASE CLI - COMPATIBLE NVM
echo ==============================================
echo.

echo ❌ L'installation NPM globale n'est plus supportée par Supabase CLI
echo ✅ Solution : Installation via Chocolatey ou téléchargement direct
echo.

REM Vérifier si Chocolatey est disponible
where choco >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Chocolatey détecté, installation via Chocolatey...
    choco install supabase -y
    echo.
    echo ✅ Installation terminée !
    echo.
    echo 🧪 Test de l'installation :
    supabase --version
    echo.
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Supabase CLI installé avec succès !
        goto CONFIGURE
    ) else (
        echo ❌ Installation échouée, passage au téléchargement direct
        goto MANUAL
    )
) else (
    echo ❌ Chocolatey non trouvé
    goto MANUAL
)

:MANUAL
echo.
echo 📥 INSTALLATION MANUELLE REQUISE
echo ================================
echo.
echo 1. Allez sur : https://github.com/supabase/cli/releases/latest
echo 2. Téléchargez : supabase_windows_amd64.zip
echo 3. Extrayez dans C:\supabase\
echo 4. Ajoutez C:\supabase\ au PATH système
echo.
echo OU utilisez ces commandes PowerShell :
echo.
echo # Créer dossier
echo mkdir C:\supabase
echo.
echo # Télécharger (remplacez VERSION par la dernière version)
echo curl -L -o C:\supabase\supabase.zip https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip
echo.
echo # Extraire
echo Expand-Archive C:\supabase\supabase.zip C:\supabase\
echo.
echo # Ajouter au PATH (redémarrage requis)
echo [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\supabase", "Machine")
echo.
pause
goto END

:CONFIGURE
echo.
echo 🔑 CONFIGURATION SUPABASE
echo =========================
echo.
echo Connexion au projet...
supabase login
echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ Connexion réussie !
    echo.
    echo 📁 Liaison au projet LokoTaxi...
    supabase link --project-ref nmwnibzgvwltipmtwhzo
    echo.
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Projet lié avec succès !
        echo.
        echo 🎉 INSTALLATION TERMINÉE !
        echo ==========================
        echo.
        echo Vous pouvez maintenant exécuter :
        echo DEPLOYER_V2_HUGGINGFACE.cmd
        echo.
    ) else (
        echo ❌ Erreur liaison projet
        echo Vérifiez votre token d'accès
    )
) else (
    echo ❌ Erreur connexion
    echo Vérifiez votre compte Supabase
)

:END
pause