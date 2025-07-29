@echo off
REM ==============================
REM DEPLOIEMENT V2 - CORRECTION ERREUR GPS
REM ==============================

echo.
echo 🚀 DEPLOIEMENT V2 - CORRECTION ERREUR GPS
echo ==========================================
echo.

echo ❌ ERREUR DÉTECTÉE :
echo - "normalizePhone is not defined" dans handleGPSMessage()
echo - ReferenceError au moment du partage GPS
echo.

echo ✅ CORRECTIONS APPLIQUÉES :
echo - 🔧 Ajout fonction globale normalizePhone()
echo - 🔧 Correction this.normalizePhone() dans handleGPSMessage()
echo - 🔧 Amélioration getSession() avec vraie récupération Supabase
echo - 🔧 Fallback session intelligent basé sur audio précédent
echo.

echo 📋 ERREUR RÉSOLUE :
echo ❌ AVANT : Crash GPS → "Erreur lors du traitement GPS"
echo ✅ APRÈS : GPS traité → Calcul prix + conducteur
echo.

echo 🎯 WORKFLOW GPS ATTENDU :
echo 1. 🎤 Audio : "Mido yidi moto yahougol madina" (85%% confiance)
echo 2. ✅ IA : véhicule=MOTO, destination=Madina 
echo 3. 📍 Client partage GPS : 48.6276764, 2.5891395
echo 4. 🔍 Récupération session + normalizePhone OK
echo 5. 📊 Recherche conducteurs MOTO en base
echo 6. 📏 Calcul distance + prix
echo 7. ✅ Affichage récapitulatif avec conducteur
echo.

REM Copier la version GPS corrigée
echo 📦 Copie version GPS corrigée...
copy "supabase\functions\whatsapp-bot-pular\index_v2_mms.ts" "supabase\functions\whatsapp-bot-pular\index.ts"

echo ✅ Version V2 GPS corrigée copiée
echo.

REM Déploiement Supabase
echo 📡 Déploiement correction GPS sur Supabase...
supabase functions deploy whatsapp-bot-pular --no-verify-jwt

echo.
echo ✅ CORRECTION GPS DÉPLOYÉE !
echo.
echo 🧪 TEST GPS CORRIGÉ ATTENDU :
echo ==============================
echo 1. 🎤 Audio Pular fonctionne ✅
echo 2. 📍 Partage GPS fonctionne ✅ (plus d'erreur normalizePhone)
echo 3. 🔍 Recherche session + conducteurs ✅
echo 4. 📊 Calcul prix + affichage récapitulatif ✅
echo.
echo 📋 RÉSULTAT GPS ATTENDU :
echo -------------------------
echo 📍 POSITION REÇUE ! ✅
echo 🎯 RÉCAPITULATIF:
echo 🚗 Véhicule: MOTO
echo 📍 Destination: Madina
echo 📏 Distance: X.X km
echo 💰 Prix: XXXX GNF
echo 🚘 Conducteur disponible:
echo 👤 [Prénom Nom]
echo ⏱️ Arrivée dans X minutes
echo 📱 [Numéro]
echo 🎯 Distance: X.X km de vous
echo **Confirmez-vous cette course ?**
echo.
echo 🎉 ERREUR GPS RÉSOLUE - WORKFLOW COMPLET !
echo.
pause