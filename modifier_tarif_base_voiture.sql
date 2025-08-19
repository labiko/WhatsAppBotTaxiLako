-- 🔧 Modifier le tarif de base des voitures
-- Actuel: 2000 GNF → Nouveau: 0 GNF (ou autre valeur)

-- Option 1: Supprimer complètement le tarif de base des voitures
UPDATE tarifs 
SET prix_base = 0 
WHERE vehicle_type = 'voiture';

-- Option 2: Modifier à une valeur spécifique (ex: 1000 GNF)
-- UPDATE tarifs 
-- SET prix_base = 1000 
-- WHERE vehicle_type = 'voiture';

-- Option 3: Voir les tarifs actuels avant modification
-- SELECT vehicle_type, prix_base, prix_par_km, nom 
-- FROM tarifs 
-- WHERE actif = true;

-- Vérifier le changement
SELECT vehicle_type, prix_base, prix_par_km, nom 
FROM tarifs 
WHERE vehicle_type = 'voiture';