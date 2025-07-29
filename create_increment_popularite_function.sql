-- Fonction SQL pour incrémenter la popularité d'une destination
-- Utilisée par le bot WhatsApp pour tracker les destinations populaires

CREATE OR REPLACE FUNCTION increment_popularite(destination_nom TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE adresses 
  SET 
    popularite = popularite + 1,
    derniere_maj = NOW()
  WHERE nom = destination_nom 
  AND actif = true;
  
  -- Log pour debug (optionnel)
  RAISE NOTICE 'Popularité incrémentée pour: %', destination_nom;
END;
$$;

-- Test de la fonction
SELECT increment_popularite('Hôpital Ignace Deen');

-- Vérification
SELECT nom, popularite, derniere_maj 
FROM adresses 
WHERE nom = 'Hôpital Ignace Deen';

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION increment_popularite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_popularite(TEXT) TO authenticated;