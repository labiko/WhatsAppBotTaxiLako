-- Table des tarifs pour rendre le prix paramétrable
-- Permet de définir différents tarifs selon le type de véhicule et l'heure

CREATE TABLE IF NOT EXISTS tarifs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('moto', 'voiture')) NOT NULL,
  prix_par_km DECIMAL(10,2) NOT NULL DEFAULT 3000, -- Prix par kilomètre
  prix_minimum DECIMAL(10,2) DEFAULT 5000, -- Prix minimum de la course
  prix_base DECIMAL(10,2) DEFAULT 0, -- Prix de base (prise en charge)
  heure_debut TIME, -- Début de la plage horaire (NULL = toute la journée)
  heure_fin TIME, -- Fin de la plage horaire
  jours_semaine VARCHAR(20)[], -- ['lundi', 'mardi', ...] ou NULL pour tous les jours
  supplement_nuit DECIMAL(5,2) DEFAULT 0, -- Pourcentage de supplément (ex: 20 pour 20%)
  actif BOOLEAN DEFAULT TRUE,
  priorite INTEGER DEFAULT 0, -- Pour gérer l'ordre d'application des tarifs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_tarifs_vehicle_type ON tarifs(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_tarifs_actif ON tarifs(actif);
CREATE INDEX IF NOT EXISTS idx_tarifs_priorite ON tarifs(priorite DESC);

-- Insertion des tarifs par défaut
INSERT INTO tarifs (nom, vehicle_type, prix_par_km, prix_minimum, prix_base) VALUES
-- Tarifs de base
('Tarif standard moto', 'moto', 3000, 5000, 0),
('Tarif standard voiture', 'voiture', 4000, 7000, 2000),

-- Tarifs de nuit (22h-6h) avec supplément de 20%
('Tarif nuit moto', 'moto', 3600, 6000, 0),
('Tarif nuit voiture', 'voiture', 4800, 8400, 2400);

-- Vue pour obtenir le tarif actuel selon l'heure et le type de véhicule
CREATE OR REPLACE VIEW tarif_actuel AS
SELECT DISTINCT ON (vehicle_type)
  vehicle_type,
  prix_par_km,
  prix_minimum,
  prix_base,
  nom as tarif_nom
FROM tarifs
WHERE actif = TRUE
  AND (heure_debut IS NULL OR CURRENT_TIME >= heure_debut)
  AND (heure_fin IS NULL OR CURRENT_TIME <= heure_fin)
  AND (jours_semaine IS NULL OR to_char(CURRENT_DATE, 'day') = ANY(jours_semaine))
ORDER BY vehicle_type, priorite DESC;

-- Fonction pour calculer le prix d'une course
CREATE OR REPLACE FUNCTION calculer_prix_course(
  p_vehicle_type VARCHAR,
  p_distance_km DECIMAL,
  p_heure TIMESTAMP DEFAULT NOW()
) RETURNS TABLE (
  prix_total DECIMAL,
  prix_par_km DECIMAL,
  prix_base DECIMAL,
  prix_distance DECIMAL,
  tarif_applique VARCHAR
) AS $$
DECLARE
  v_tarif RECORD;
  v_prix_distance DECIMAL;
  v_prix_total DECIMAL;
BEGIN
  -- Récupérer le tarif applicable
  SELECT 
    t.prix_par_km,
    t.prix_minimum,
    t.prix_base,
    t.nom
  INTO v_tarif
  FROM tarifs t
  WHERE t.vehicle_type = p_vehicle_type
    AND t.actif = TRUE
    AND (t.heure_debut IS NULL OR p_heure::time >= t.heure_debut)
    AND (t.heure_fin IS NULL OR p_heure::time <= t.heure_fin)
    AND (t.jours_semaine IS NULL OR to_char(p_heure, 'day') = ANY(t.jours_semaine))
  ORDER BY t.priorite DESC
  LIMIT 1;
  
  -- Si aucun tarif trouvé, utiliser le tarif par défaut
  IF v_tarif IS NULL THEN
    SELECT 
      CASE 
        WHEN p_vehicle_type = 'moto' THEN 3000
        ELSE 4000
      END,
      CASE 
        WHEN p_vehicle_type = 'moto' THEN 5000
        ELSE 7000
      END,
      CASE 
        WHEN p_vehicle_type = 'moto' THEN 0
        ELSE 2000
      END,
      'Tarif par défaut'
    INTO v_tarif;
  END IF;
  
  -- Calculer le prix
  v_prix_distance := p_distance_km * v_tarif.prix_par_km;
  v_prix_total := GREATEST(
    v_tarif.prix_base + v_prix_distance,
    v_tarif.prix_minimum
  );
  
  -- Arrondir au millier supérieur
  v_prix_total := CEIL(v_prix_total / 1000) * 1000;
  
  RETURN QUERY SELECT 
    v_prix_total,
    v_tarif.prix_par_km,
    v_tarif.prix_base,
    v_prix_distance,
    v_tarif.nom;
END;
$$ LANGUAGE plpgsql;

-- Table pour stocker les paramètres globaux
CREATE TABLE IF NOT EXISTS parametres (
  cle VARCHAR(100) PRIMARY KEY,
  valeur TEXT NOT NULL,
  description TEXT,
  type VARCHAR(20) CHECK (type IN ('nombre', 'texte', 'boolean')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Paramètres par défaut
INSERT INTO parametres (cle, valeur, description, type) VALUES
('devise', 'GNF', 'Devise utilisée pour les prix', 'texte'),
('arrondi_prix', '1000', 'Arrondir les prix au multiple de cette valeur', 'nombre'),
('distance_max_recherche_km', '50', 'Distance maximale pour chercher un conducteur (km)', 'nombre'),
('temps_attente_confirmation_min', '5', 'Temps d''attente pour confirmation du client (minutes)', 'nombre')
ON CONFLICT (cle) DO NOTHING;

-- Fonction helper pour obtenir un paramètre
CREATE OR REPLACE FUNCTION get_parametre(p_cle VARCHAR, p_defaut TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT valeur FROM parametres WHERE cle = p_cle),
    p_defaut
  );
END;
$$ LANGUAGE plpgsql;