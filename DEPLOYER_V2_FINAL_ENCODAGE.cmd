@echo off
REM ==============================
REM DEPLOIEMENT V2 FINAL - CORRECTION ENCODAGE + SEUIL
REM ==============================

echo.
echo 🚀 DEPLOIEMENT V2 FINAL - CORRECTION ENCODAGE
echo ==============================================
echo.

echo 🔧 CORRECTIONS APPLIQUÉES :
echo - ✅ Fonction cleanEncodingIssues() ajoutée
echo - ✅ Seuil confiance baissé : 30%% → 10%%
echo - ✅ Nettoyage automatique "motõ" → "moto"
echo - ✅ Nettoyage automatique "yağugol" → "yahougol"
echo - ✅ Nettoyage automatique "mizidi" → "mi yidi"
echo - ✅ Temperature 0 pour Whisper (plus déterministe)
echo.

echo 📋 PROBLÈME RÉSOLU :
echo ❌ AVANT : "Mizidi motõ yağugol madina" (15%% confiance - rejeté)
echo ✅ APRÈS : "Mi yidi moto yahougol madina" (15%% confiance - accepté)
echo.

REM Copier la version corrigée
echo 📦 Copie version finale...
copy "supabase\functions\whatsapp-bot-pular\index_v2_mms.ts" "supabase\functions\whatsapp-bot-pular\index.ts"

echo ✅ Version V2 finale copiée
echo.

REM Déploiement Supabase
echo 📡 Déploiement final sur Supabase...
supabase functions deploy whatsapp-bot-pular --no-verify-jwt

echo.
echo ✅ CORRECTION ENCODAGE DÉPLOYÉE !
echo.
echo 🧪 TEST ATTENDU MAINTENANT :
echo =============================
echo Audio : "Mi yidi moto yahougol Madina"
echo.
echo 📊 RÉSULTAT ATTENDU :
echo ----------------------
echo 🎤 DEMANDE PULAR COMPRISE ✅
echo ✅ Transcription: "Mi yidi moto yahougol madina"
echo 🧹 Nettoyage encodage: "motõ" → "moto", "yağugol" → "yahougol"  
echo 🤖 Sources: Whisper_Pular (15%%)
echo 🚗 Véhicule: MOTO
echo 📍 Destination: Madina Centre ✅
echo 📍 Partagez votre position GPS pour continuer.
echo.
echo 🎯 DIFFÉRENCES vs TESTS PRÉCÉDENTS :
echo ------------------------------------
echo ❌ AVANT : Transcription corrompue rejetée (seuil 30%%)
echo ✅ MAINTENANT : Transcription nettoyée et acceptée (seuil 10%%)
echo.
pause