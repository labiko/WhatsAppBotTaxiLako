-- ========================================
-- REQUÊTE 1: EXTRACTION DDL DES FONCTIONS
-- ========================================
-- Copier et exécuter cette requête pour obtenir toutes les fonctions

SELECT pg_get_functiondef(p.oid) 
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'pgis_%'
ORDER BY p.proname;

-- ========================================
-- REQUÊTE 2: EXTRACTION DDL DES TRIGGERS
-- ========================================
-- Copier et exécuter cette requête pour obtenir tous les triggers

SELECT pg_get_triggerdef(t.oid, true) || ';'
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;