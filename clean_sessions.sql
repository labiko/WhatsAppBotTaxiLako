-- Nettoyer toutes les sessions pour le client test
DELETE FROM sessions WHERE client_phone = '+33620951645';

-- Vérifier que tout est nettoyé
SELECT COUNT(*) as sessions_restantes FROM sessions WHERE client_phone = '+33620951645';