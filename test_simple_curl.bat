@echo off
title TEST CONFIRMATION DEPART
color 0A
cls

echo.
echo ========================================
echo   TEST CONFIRMATION DEPART - MODIFIE
echo ========================================
echo.

echo Test 1: Demande taxi
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=taxi&Latitude=&Longitude=&MediaUrl0=" > temp1.xml 2>nul

if exist temp1.xml (
    echo Bot:
    for /f "delims=" %%i in ('findstr /i "<Message>" temp1.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    del temp1.xml >nul 2>&1
)

echo.
echo ========================================
echo.
pause

echo Test 2: Choisir moto (devrait demander confirmation maintenant)
timeout 3 >nul
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=moto&Latitude=&Longitude=&MediaUrl0=" > temp2.xml 2>nul

if exist temp2.xml (
    echo Bot:
    for /f "delims=" %%i in ('findstr /i "<Message>" temp2.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    del temp2.xml >nul 2>&1
)

echo.
echo ========================================
echo.
pause

echo Test 3: Repondre "oui" (devrait demander GPS)
timeout 3 >nul
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=oui&Latitude=&Longitude=&MediaUrl0=" > temp3.xml 2>nul

if exist temp3.xml (
    echo Bot:
    for /f "delims=" %%i in ('findstr /i "<Message>" temp3.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    del temp3.xml >nul 2>&1
)

echo.
echo ========================================
echo.
pause

echo Test 4: Branch "non" - Redemander taxi puis moto puis non
timeout 3 >nul

echo Restart - taxi:
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=taxi&Latitude=&Longitude=&MediaUrl0=" > temp4a.xml 2>nul
timeout 2 >nul

echo Choisir moto:
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=moto&Latitude=&Longitude=&MediaUrl0=" > temp4b.xml 2>nul
timeout 2 >nul

echo Repondre "non":
curl -s -X POST "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot" -H "Content-Type: application/x-www-form-urlencoded" -d "From=whatsapp:+33620951645&Body=non&Latitude=&Longitude=&MediaUrl0=" > temp4c.xml 2>nul

if exist temp4c.xml (
    echo Bot (reponse "non"):
    for /f "delims=" %%i in ('findstr /i "<Message>" temp4c.xml 2^>nul') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        set "line=!line:*<Message>=!"
        set "line=!line:</Message>*=!"
        echo !line!
        endlocal
    )
    del temp4c.xml >nul 2>&1
)

echo.
echo ========================================
echo Tests termines!
pause