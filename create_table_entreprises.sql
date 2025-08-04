-- ========================================
-- CRÉATION TABLE ENTREPRISES + RELATION CONDUCTEURS
-- ========================================

-- 1️⃣ CRÉATION DE LA TABLE ENTREPRISES
CREATE TABLE IF NOT EXISTS entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    siret VARCHAR(20) UNIQUE,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(100),
    responsable VARCHAR(100),
    actif BOOLEAN DEFAULT true,
    commission_pourcentage DECIMAL(5,2) DEFAULT 15.00, -- Commission sur les courses (ex: 15%)
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2️⃣ AJOUT DE LA CLÉ ÉTRANGÈRE DANS LA TABLE CONDUCTEURS
ALTER TABLE conducteurs 
ADD COLUMN IF NOT EXISTS entreprise_id UUID,
ADD CONSTRAINT fk_conducteurs_entreprise 
    FOREIGN KEY (entreprise_id) 
    REFERENCES entreprises(id) 
    ON DELETE SET NULL;

-- 3️⃣ INDEX POUR OPTIMISER LES REQUÊTES
CREATE INDEX IF NOT EXISTS idx_conducteurs_entreprise_id ON conducteurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_entreprises_nom ON entreprises(nom);
CREATE INDEX IF NOT EXISTS idx_entreprises_actif ON entreprises(actif);

-- 4️⃣ COMMENTAIRES SUR LES COLONNES
COMMENT ON TABLE entreprises IS 'Table des entreprises de taxi/moto-taxi';
COMMENT ON COLUMN entreprises.nom IS 'Nom de l''entreprise (ex: Taxi Express Conakry)';
COMMENT ON COLUMN entreprises.siret IS 'Numéro SIRET ou équivalent guinéen (optionnel)';
COMMENT ON COLUMN entreprises.commission_pourcentage IS 'Commission prélevée par l''entreprise sur chaque course';
COMMENT ON COLUMN conducteurs.entreprise_id IS 'ID de l''entreprise (NULL = conducteur freelance)';

-- 5️⃣ DONNÉES D'EXEMPLE - ENTREPRISES DE TAXI GUINÉENNES
INSERT INTO entreprises (nom, adresse, telephone, responsable, commission_pourcentage) VALUES 
('Taxi Express Conakry', 'Quartier Kaloum, Conakry', '+224 622 00 11 11', 'Mamadou Diallo', 20.00),
('Moto Rapide Guinée', 'Quartier Madina, Conakry', '+224 655 22 33 44', 'Ibrahima Sow', 15.00),
('Transport Alpha', 'Quartier Ratoma, Conakry', '+224 666 55 77 88', 'Alpha Barry', 18.00);

-- 6️⃣ MISE À JOUR DE QUELQUES CONDUCTEURS EXISTANTS (EXEMPLE)
-- Attribution aléatoire de quelques conducteurs à des entreprises
UPDATE conducteurs 
SET entreprise_id = (SELECT id FROM entreprises WHERE nom = 'Taxi Express Conakry' LIMIT 1)
WHERE nom ILIKE '%mamadou%' AND entreprise_id IS NULL
LIMIT 2;

UPDATE conducteurs 
SET entreprise_id = (SELECT id FROM entreprises WHERE nom = 'Moto Rapide Guinée' LIMIT 1)
WHERE vehicle_type = 'moto' AND entreprise_id IS NULL
LIMIT 3;

-- 7️⃣ CRÉATION D'UNE VUE POUR FACILITER LES REQUÊTES
CREATE OR REPLACE VIEW conducteurs_avec_entreprises AS
SELECT 
    c.id,
    c.nom,
    c.telephone,
    c.vehicle_type,
    c.plaque_immatriculation,
    c.statut,
    c.note_moyenne,
    c.nombre_courses,
    c.position,
    c.latitude,
    c.longitude,
    c.created_at,
    c.updated_at,
    -- Informations entreprise
    e.id as entreprise_id,
    e.nom as entreprise_nom,
    e.commission_pourcentage,
    CASE 
        WHEN e.id IS NULL THEN 'Freelance'
        ELSE 'Entreprise'
    END as type_conducteur
FROM conducteurs c
LEFT JOIN entreprises e ON c.entreprise_id = e.id
WHERE c.actif = true;

-- 8️⃣ TRIGGER POUR METTRE À JOUR updated_at AUTOMATIQUEMENT
CREATE OR REPLACE FUNCTION update_entreprises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entreprises_updated_at
    BEFORE UPDATE ON entreprises
    FOR EACH ROW
    EXECUTE FUNCTION update_entreprises_updated_at();

-- 9️⃣ REQUÊTES DE VALIDATION
-- Vérifier la création de la table
SELECT 'Table entreprises créée avec succès' as status,
       COUNT(*) as nombre_entreprises
FROM entreprises;

-- Vérifier la relation
SELECT 'Relation conducteurs-entreprises créée' as status,
       COUNT(CASE WHEN entreprise_id IS NOT NULL THEN 1 END) as conducteurs_avec_entreprise,
       COUNT(CASE WHEN entreprise_id IS NULL THEN 1 END) as conducteurs_freelance
FROM conducteurs;

-- Tester la vue
SELECT 'Vue conducteurs_avec_entreprises créée' as status,
       COUNT(*) as total_conducteurs,
       COUNT(CASE WHEN type_conducteur = 'Entreprise' THEN 1 END) as avec_entreprise,
       COUNT(CASE WHEN type_conducteur = 'Freelance' THEN 1 END) as freelance
FROM conducteurs_avec_entreprises;