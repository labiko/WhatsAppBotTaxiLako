const fs = require('fs');

console.log('🔧 Préparation fichier SQL final...');

const baseSQL = fs.readFileSync('guinea_filtered_for_supabase.sql', 'utf8');

const finalSQL = `-- ========================================
-- INJECTION MASSIVE ADRESSES GUINÉE OSM
-- 15,000 lieux depuis OpenStreetMap
-- ========================================

-- Étape 1: Ajout colonne osm_id
ALTER TABLE adresses ADD COLUMN IF NOT EXISTS osm_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_adresses_osm_id ON adresses (osm_id) WHERE osm_id IS NOT NULL;

-- Étape 2: Injection données
${baseSQL}

-- Étape 3: Vérification post-injection
SELECT 
  'Injection terminée' as status,
  COUNT(*) as total_adresses_guinee,
  COUNT(DISTINCT ville) as villes_couvertes,
  COUNT(DISTINCT type_lieu) as types_lieux
FROM adresses 
WHERE pays = 'Guinée';

-- Détail par ville (Top 10)
SELECT 
  ville,
  COUNT(*) as nb_lieux,
  COUNT(DISTINCT type_lieu) as types_differents
FROM adresses 
WHERE pays = 'Guinée'
GROUP BY ville
ORDER BY nb_lieux DESC
LIMIT 10;`;

fs.writeFileSync('guinea_complete_injection.sql', finalSQL);

console.log('✅ Fichier SQL final créé : guinea_complete_injection.sql');
console.log('📁 Prêt pour injection dans Supabase !');