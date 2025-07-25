-- Table de configuration des tarifs par type de véhicule
-- Permet de modifier les prix sans redéployer le code

CREATE TABLE IF NOT EXISTS tarifs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_vehicule VARCHAR(20) CHECK (type_vehicule IN ('moto', 'voiture')) NOT NULL UNIQUE,
  prix_par_km INTEGER NOT NULL, -- Prix en GNF (Francs guinéens) par kilomètre
  prix_minimum INTEGER DEFAULT 0, -- Prix minimum de course
  prix_maximum INTEGER DEFAULT NULL, -- Prix maximum (optionnel)
  actif BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_tarifs_type_vehicule ON tarifs(type_vehicule);
CREATE INDEX IF NOT EXISTS idx_tarifs_actif ON tarifs(actif);

-- Insérer les tarifs par défaut
INSERT INTO tarifs (type_vehicule, prix_par_km, prix_minimum, description) VALUES
('moto', 3000, 2000, 'Tarif standard moto - 3000 GNF par kilomètre'),
('voiture', 4000, 3000, 'Tarif standard voiture - 4000 GNF par kilomètre')
ON CONFLICT (type_vehicule) DO NOTHING;

-- Fonction pour calculer le prix d'une course
CREATE OR REPLACE FUNCTION calculer_prix_course(
  type_vehicule_param TEXT,
  distance_km_param DECIMAL
)
RETURNS TABLE (
  prix_total INTEGER,
  prix_par_km INTEGER,
  prix_minimum INTEGER,
  distance_facturee DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    GREATEST(
      (t.prix_par_km * distance_km_param)::INTEGER,
      t.prix_minimum
    ) as prix_total,
    t.prix_par_km,
    t.prix_minimum,
    distance_km_param as distance_facturee
  FROM tarifs t
  WHERE t.type_vehicule = type_vehicule_param
    AND t.actif = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tarifs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tarifs_updated_at
    BEFORE UPDATE ON tarifs
    FOR EACH ROW
    EXECUTE FUNCTION update_tarifs_updated_at();

-- Vue pour afficher les tarifs actifs
CREATE OR REPLACE VIEW tarifs_actifs AS
SELECT 
  type_vehicule,
  prix_par_km,
  prix_minimum,
  prix_maximum,
  description,
  -- Exemples de prix pour différentes distances
  prix_par_km * 5 as prix_5km,
  prix_par_km * 10 as prix_10km,
  prix_par_km * 20 as prix_20km,
  updated_at
FROM tarifs 
WHERE actif = TRUE
ORDER BY type_vehicule;

-- Commentaires
COMMENT ON TABLE tarifs IS 'Configuration des tarifs par type de véhicule';
COMMENT ON COLUMN tarifs.prix_par_km IS 'Prix en francs guinéens (GNF) par kilomètre';
COMMENT ON COLUMN tarifs.prix_minimum IS 'Prix minimum de course même pour courtes distances';
COMMENT ON FUNCTION calculer_prix_course(TEXT, DECIMAL) IS 'Calcule le prix total d une course selon le type et la distance';

-- Test de la fonction de calcul
-- SELECT * FROM calculer_prix_course('moto', 12.5);
-- SELECT * FROM calculer_prix_course('voiture', 8.3);

SELECT 'Table tarifs créée avec succès' AS status,
       COUNT(*) as nb_tarifs_configures
FROM tarifs WHERE actif = TRUE;