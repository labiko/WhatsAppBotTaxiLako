@echo off
REM ==============================
REM DEPLOIEMENT BOT PULAR V2 - HUGGINGFACE MMS
REM ==============================

echo.
echo 🚀 DEPLOIEMENT BOT PULAR V2 - ARCHITECTURE HUGGINGFACE MMS
echo ============================================================
echo.

REM Configuration HuggingFace avec token existant
echo 🔧 Configuration variables d'environnement...
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
supabase secrets set HUGGINGFACE_API_KEY=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
supabase secrets set USE_HUGGINGFACE_MMS=true
supabase secrets set PULAR_TRANSCRIPTION_ENABLED=true
supabase secrets set MULTI_TRANSCRIPTION_FUSION=true

echo.
echo ✅ Variables configurées avec succès
echo.

REM Sauvegarde de l'ancienne version
echo 💾 Sauvegarde ancienne version...
copy "supabase\functions\whatsapp-bot-pular\index.ts" "supabase\functions\whatsapp-bot-pular\index_v1_backup.ts"

echo ✅ Sauvegarde créée : index_v1_backup.ts
echo.

REM Déploiement nouvelle version
echo 🚀 Déploiement nouvelle architecture V2...
copy "supabase\functions\whatsapp-bot-pular\index_v2_mms.ts" "supabase\functions\whatsapp-bot-pular\index.ts"

echo ✅ Fichier V2 copié vers index.ts
echo.

REM Déploiement Supabase
cd  C:\Users\diall\Documents\LokoTaxi\supabase\functions> supabase functions deploy whatsapp-bot-pular --no-verify-jwt
echo 📡 Déploiement sur Supabase...
supabase functions deploy whatsapp-bot-pular --no-verify-jwt

echo.
echo ✅ DEPLOIEMENT V2 TERMINÉ !
echo.
echo 🧪 TESTS À EFFECTUER :
echo ----------------------
echo 1. Enregistrez audio : "Mi yidi moto yahougol Madina"
echo 2. Vérifiez logs : supabase functions logs whatsapp-bot-pular --tail
echo 3. Cherchez : "HuggingFace_MMS" dans les logs
echo.
echo 📊 RÉSULTAT ATTENDU :
echo ----------------------
echo ✅ Transcription: "Mi yidi moto yahougol Madina"
echo 🤖 Sources: HuggingFace_MMS (75%+)
echo 🚗 Véhicule: MOTO
echo 📍 Destination: Madina ✅
echo.
echo 🎯 URL Fonction : https://nmwnibzgvwltipmtwhzo.functions.supabase.co/whatsapp-bot-pular
echo.
pause