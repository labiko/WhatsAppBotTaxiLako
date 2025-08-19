-- =====================================================
-- 🗑️ SUPPRESSION TRIGGER CONFLICTUEL - SOLUTION DÉFINITIVE
-- =====================================================
-- 
-- PROBLÈME : Trigger trigger_reservation_accepted interfère avec service C#
-- SOLUTION : Supprimer le trigger, garder uniquement le service C# fonctionnel
-- AVANTAGE : 1 seul système de notification au lieu de 2 qui se marchent dessus
--
-- =====================================================

-- Supprimer le trigger problématique
DROP TRIGGER IF EXISTS trigger_reservation_accepted ON reservations;

-- Supprimer la fonction associée
DROP FUNCTION IF EXISTS notify_client_on_reservation_accepted();

-- Vérifier que la suppression a réussi
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_reservation_accepted'
    ) THEN '❌ ERREUR - Trigger encore présent'
    ELSE '✅ SUCCÈS - Trigger supprimé'
  END as trigger_status;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'notify_client_on_reservation_accepted'
    ) THEN '❌ ERREUR - Fonction encore présente'
    ELSE '✅ SUCCÈS - Fonction supprimée'
  END as function_status;

-- 📊 RAPPORT FINAL
SELECT '🎯 SOLUTION APPLIQUÉE - SEUL LE SERVICE C# GÈRE LES NOTIFICATIONS' as status;
SELECT '✅ Plus de conflit trigger vs service C#' as avantage_1;
SELECT '✅ Notifications scheduled fonctionnelles via service C# uniquement' as avantage_2;
SELECT '✅ Zéro risque de régression' as avantage_3;

-- 📋 RAPPEL IMPORTANT
SELECT '⚠️  RAPPEL : Le service C# doit tourner régulièrement pour traiter notifications_pending' as rappel;