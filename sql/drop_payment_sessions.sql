-- ═══════════════════════════════════════════════════════════════
-- 🗑️ SUPPRESSION TABLE PAYMENT_SESSIONS - UTILISER LENGOPAY_PAYMENTS
-- ═══════════════════════════════════════════════════════════════

-- 🔍 Vérifier si la table existe
SELECT tablename FROM pg_tables WHERE tablename = 'payment_sessions';

-- 🗑️ Supprimer la table et ses dépendances
DROP TABLE IF EXISTS payment_sessions CASCADE;

-- ✅ Vérifier suppression
SELECT tablename FROM pg_tables WHERE tablename = 'payment_sessions';