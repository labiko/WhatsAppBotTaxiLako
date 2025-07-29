@echo off
REM ==============================
REM DEPLOIEMENT CORRECTION V2 - DESTINATION IA
REM ==============================

echo.
echo 🚀 DEPLOIEMENT CORRECTION V2 - DESTINATION IA
echo ==============================================
echo.

echo 🔧 CORRECTION APPLIQUÉE :
echo - ✅ IA analyse destination en priorité
echo - ✅ Recherche destination IA en base de données  
echo - ✅ Fallback mots-clés si IA indisponible
echo - ✅ Fusion intelligente IA + Keywords
echo.

REM Copier la version corrigée
echo 📦 Copie version corrigée...
copy "supabase\functions\whatsapp-bot-pular\index_v2_mms.ts" "supabase\functions\whatsapp-bot-pular\index.ts"

echo ✅ Version V2 corrigée copiée
echo.

REM Déploiement Supabase
echo 📡 Déploiement correction sur Supabase...
supabase functions deploy whatsapp-bot-pular --no-verify-jwt

echo.
echo ✅ CORRECTION DÉPLOYÉE !
echo.
echo 🧪 TEST ATTENDU MAINTENANT :
echo =============================
echo Audio : "Mi yidi moto yahougol Madina"
echo.
echo 📊 RÉSULTAT ATTENDU :
echo ----------------------
echo 🎤 DEMANDE PULAR COMPRISE ✅
echo ✅ Transcription: "MIIDI MOTO YAWGAL MADINA"
echo 🤖 Analyse IA: véhicule=moto, destination=Madina (85%%)
echo ✅ Destination IA confirmée: Madina Centre
echo 🚗 Véhicule: MOTO
echo 📍 Destination: Madina Centre ✅
echo 📍 Partagez votre position GPS pour continuer.
echo.
echo 🎯 DIFFÉRENCE vs AVANT :
echo ------------------------
echo ❌ AVANT : "Quelle est votre destination ?"
echo ✅ MAINTENANT : "Destination: Madina Centre ✅"
echo.
pause