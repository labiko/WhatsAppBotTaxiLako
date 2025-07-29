@echo off
title TESTEUR BOT WHATSAPP - MODE CONVERSATION
color 0A
cls

echo.
echo ========================================
echo    TESTEUR BOT WHATSAPP - MODE LIBRE
echo ========================================
echo.
echo SIMULATION CONVERSATION WHATSAPP
echo Numero test: +33620951645
echo.
echo Instructions:
echo - Le bot comprend des MOTS-CLES EXACTS (pas de phrases)
echo - Apres "taxi" tapez "moto" ou "voiture" 
echo - Pour GPS: "gps:48.6276555,2.5891366"
echo - Pour destination: "donka", "madina", "kipe"
echo - Pour confirmer: "oui" ou "non"
echo - "quit" pour quitter
echo.
echo ========================================
echo.

:CONVERSATION
set /p message="Vous: "

if /i "%message%"=="quit" goto EXIT
if /i "%message%"=="exit" goto EXIT

REM Detecter commande GPS
echo %message% | findstr /i "gps:" >nul 2>&1
if %errorlevel%==0 (
    REM Extraire coordonnees apres "gps:"
    for /f "tokens=2 delims=:" %%a in ("%message%") do set coords=%%a
    for /f "tokens=1,2 delims=," %%a in ("!coords!") do (
        set lat=%%a
        set lon=%%b
    )
    set lat=%lat: =%
    set lon=%lon: =%
    echo Partage GPS: %lat%, %lon%
    call :SEND_MESSAGE "" "%lat%" "%lon%"
) else (
    REM Message texte normal
    call :SEND_MESSAGE "%message%" "" ""
)

echo.
goto CONVERSATION

:SEND_MESSAGE
set "text=%~1"
set "latitude=%~2"
set "longitude=%~3"

if "%latitude%"=="" (
    echo Bot recoit: "%text%"
) else (
    echo Bot recoit: GPS %latitude%, %longitude%
)

curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=%text%&Latitude=%latitude%&Longitude=%longitude%&MediaUrl0=" > response.xml 2>nul

if exist response.xml (
    echo.
    echo Bot:
    echo ----------------------------------------
    
    for /f "delims=" %%i in ('findstr /i "<Message>" response.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    
    echo ----------------------------------------
    del response.xml >nul 2>&1
) else (
    echo Bot: [Pas de reponse]
)
goto :eof

:EXIT
echo.
echo Conversation terminee!
pause
exit