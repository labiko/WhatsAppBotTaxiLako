@echo off
title TESTEUR BOT WHATSAPP - CMD
color 0A

:MENU
cls
echo.
echo ========================================
echo          TESTEUR BOT WHATSAPP
echo ========================================
echo.
echo Numero test: +33620951645
echo Edge Function: Direct API
echo.
echo =======================================
echo   MENU PRINCIPAL
echo =======================================
echo.
echo 1. Test scenario TEMPOREL
echo 2. Test scenario SIMPLE
echo 3. Mode INTERACTIF
echo 4. Quitter
echo.
set /p choice="Votre choix (1-4): "

if "%choice%"=="1" goto TEMPORAL
if "%choice%"=="2" goto SIMPLE
if "%choice%"=="3" goto INTERACTIVE
if "%choice%"=="4" goto EXIT
echo Choix invalide
pause
goto MENU

:TEMPORAL
cls
echo.
echo TEST SCENARIO TEMPOREL
echo ======================
echo.
echo 1. Message vocal transcrit
echo EXEMPLE: "Je veux un taxi-moto pour demain 6h"
set /p audio_text="Votre message: "
call :SEND_REQUEST "%audio_text%" "" "" ""
echo.
pause

echo 2. Reponse pour confirmation depart
echo TAPEZ: "oui" ou "non"
set /p response="Votre reponse: "
call :SEND_REQUEST "%response%" "" "" ""
echo.
pause

echo 3. Partage de votre position
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :GET_LOCATION
echo.
pause

echo 4. Saisie destination
echo EXEMPLES: "donka", "chu donka", "madina", "kipe"
set /p destination="Votre destination: "
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :SEND_REQUEST "%destination%" "" "" ""
echo.
pause

echo 5. Confirmation finale
echo TAPEZ: "oui" pour confirmer ou "non" pour annuler
set /p final="Votre choix: "
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :SEND_REQUEST "%final%" "" "" ""
echo.
echo Test temporel termine!
pause
goto MENU

:SIMPLE
cls
echo.
echo TEST SCENARIO SIMPLE
echo ====================
echo.
echo 1. Demande taxi
call :SEND_REQUEST "taxi" "" "" ""
echo.
pause

echo 2. Choix vehicule
echo TAPEZ: "moto" ou "voiture" (pas de chiffre)
set /p vehicle="Votre choix: "
echo.
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :SEND_REQUEST "%vehicle%" "" "" ""
echo.
pause

echo 3. Partage de votre position
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :GET_LOCATION
echo.
pause

echo 4. Saisie destination
echo EXEMPLES: "donka", "chu donka", "madina", "kipe"
set /p destination="Votre destination: "
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :SEND_REQUEST "%destination%" "" "" ""
echo.
pause

echo 5. Confirmation finale
echo TAPEZ: "oui" pour confirmer ou "non" pour annuler
set /p final="Votre choix: "
echo INFO: Attendre 2 secondes pour la session...
timeout 2 >nul
call :SEND_REQUEST "%final%" "" "" ""
echo.
echo Test simple termine!
pause
goto MENU

:INTERACTIVE
cls
echo.
echo MODE INTERACTIF
echo ===============
echo.
echo Tapez vos messages. Commandes speciales:
echo - "gps" pour partager votre position GPS
echo - "menu" pour retour menu
echo.

:INTERACTIVE_LOOP
set /p message="Vous: "
if "%message%"=="menu" goto MENU
if "%message%"=="gps" (
    call :GET_LOCATION
) else (
    call :SEND_REQUEST "%message%" "" "" ""
)
echo.
goto INTERACTIVE_LOOP

:GET_LOCATION
echo.
set /p location="Entrez vos coordonnees (ex: 48.6276555, 2.5891366) ou une adresse: "

echo %location% | findstr "," >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=1,2 delims=," %%a in ("%location%") do (
        set "lat=%%a"
        set "lon=%%b"
    )
    set "lat=%lat: =%"
    set "lon=%lon: =%"
    
    echo Partage GPS: %lat%, %lon%
    call :SEND_REQUEST "" "%lat%" "%lon%" ""
) else (
    echo Partage adresse: %location%
    call :SEND_REQUEST "%location%" "" "" ""
)
goto :eof

:SEND_REQUEST
set "body=%~1"
set "lat=%~2"
set "lon=%~3"
set "media=%~4"

if "%lat%"=="" if "%lon%"=="" (
    echo Envoi message: "%body%"
) else (
    echo Envoi GPS: %lat%, %lon%
)
echo Attente reponse...

curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=%body%&Latitude=%lat%&Longitude=%lon%&MediaUrl0=%media%" > temp_response.xml 2>nul

if exist temp_response.xml (
    echo.
    echo REPONSE BOT:
    echo ----------------------------------------
    
    for /f "delims=" %%i in ('findstr /i "<Message>" temp_response.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    
    echo ----------------------------------------
    echo.
    call :INTERPRET_RESPONSE "%body%" "%lat%" "%lon%"
    del temp_response.xml >nul 2>&1
) else (
    echo Erreur: Pas de reponse du serveur
)
goto :eof

:INTERPRET_RESPONSE
set "sent_msg=%~1"
set "sent_lat=%~2" 
set "sent_lon=%~3"

REM Éviter les doublons - une seule interprétation
if "%sent_msg%"=="taxi" (
    echo ^> PROCHAINE ETAPE: Tapez "moto" ou "voiture"
) else if "%sent_msg%"=="moto" (
    echo ^> ATTENTION: Prochaine etape = PARTAGER VOTRE POSITION GPS
    echo ^> DANS L'ETAPE 3, tapez vos coordonnees: 48.6276555, 2.5891366
) else if "%sent_msg%"=="voiture" (
    echo ^> ATTENTION: Prochaine etape = PARTAGER VOTRE POSITION GPS
    echo ^> DANS L'ETAPE 3, tapez vos coordonnees: 48.6276555, 2.5891366
) else if not "%sent_lat%"=="" (
    echo ^> GPS RECU! Prochaine etape = nom de destination
    echo ^> DANS L'ETAPE 4, tapez: "donka" ou "madina" (PAS des coordonnees)
) else (
    echo ^> Continuez selon les instructions du bot
)
goto :eof

:EXIT
cls
echo.
echo Au revoir!
echo.
timeout 2 >nul
exit