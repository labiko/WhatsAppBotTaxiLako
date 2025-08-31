-- ═════════════════════════════════════════════════════════════════
-- 🔍 VÉRIFICATION TABLE SESSIONS APRÈS TEST ANNULATION
-- ═════════════════════════════════════════════════════════════════

-- Voir toutes les sessions récentes (dernière heure)
SELECT 
    client_phone,
    etat,
    vehicle_type,
    reservation_to_cancel,
    conducteur_to_notify,
    destination_nom,
    updated_at,
    expires_at
FROM sessions 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Voir spécifiquement les sessions avec annulation en cours
SELECT 
    client_phone,
    etat,
    reservation_to_cancel,
    conducteur_to_notify,
    destination_nom,
    updated_at
FROM sessions 
WHERE reservation_to_cancel IS NOT NULL 
   OR etat = 'confirmation_annulation'
ORDER BY updated_at DESC;

-- Compter les sessions par état
SELECT 
    etat,
    COUNT(*) as nombre_sessions
FROM sessions 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
GROUP BY etat
ORDER BY nombre_sessions DESC;