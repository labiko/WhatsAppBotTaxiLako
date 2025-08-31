@echo off
REM ═══════════════════════════════════════════════════════════════
REM 💳 PLANIFICATION SERVICE NOTIFICATION PAIEMENT
REM Exécute le service de notification paiement toutes les minutes
REM ═══════════════════════════════════════════════════════════════

echo 🚀 Configuration planification notification paiement...
echo Timestamp: %DATE% %TIME%

REM Supprimer la tâche existante si elle existe
schtasks /delete /tn "LokoTaxi_PaymentNotifications" /f >nul 2>&1

REM Créer nouvelle tâche planifiée
schtasks /create ^
    /tn "LokoTaxi_PaymentNotifications" ^
    /tr "curl -X GET http://localhost/api/NotifyPendingPayments" ^
    /sc MINUTE ^
    /mo 1 ^
    /st 00:00 ^
    /sd %DATE% ^
    /ru SYSTEM ^
    /f

if %ERRORLEVEL% == 0 (
    echo ✅ Tâche planifiée créée avec succès !
    echo 📋 Détails:
    echo    - Nom: LokoTaxi_PaymentNotifications
    echo    - Fréquence: Toutes les minutes
    echo    - URL: http://localhost/api/NotifyPendingPayments
    echo    - Utilisateur: SYSTEM
    
    echo.
    echo 🔍 Vérification de la tâche...
    schtasks /query /tn "LokoTaxi_PaymentNotifications" /fo TABLE
    
) else (
    echo ❌ Erreur lors de la création de la tâche planifiée !
    echo Code d'erreur: %ERRORLEVEL%
)

echo.
echo 🔧 Commandes utiles:
echo    - Démarrer manuellement: schtasks /run /tn "LokoTaxi_PaymentNotifications"
echo    - Arrêter: schtasks /end /tn "LokoTaxi_PaymentNotifications"
echo    - Supprimer: schtasks /delete /tn "LokoTaxi_PaymentNotifications" /f
echo    - Voir status: schtasks /query /tn "LokoTaxi_PaymentNotifications"

pause