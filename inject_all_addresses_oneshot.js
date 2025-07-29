const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function injectAllAddresses() {
  console.log('🚀 INJECTION COMPLÈTE DES ADRESSES GUINÉE\n');
  
  try {
    // 1. Compter les adresses actuelles
    const { count: countBefore } = await supabase
      .from('adresses')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Adresses actuelles dans la base: ${countBefore}`);
    
    // 2. NE PAS VIDER LA TABLE - Ajouter seulement les nouvelles adresses
    console.log('\n⚠️  Conservation des adresses existantes (contraintes FK)');
    console.log('📝 Stratégie: Ajout des nouvelles adresses avec gestion des doublons');
    
    // 3. Lire le fichier de données
    console.log('\n📂 Lecture du fichier guinea_complete_osm.json...');
    const osmFile = JSON.parse(fs.readFileSync('guinea_complete_osm.json', 'utf8'));
    const rawData = osmFile.elements || [];
    console.log(`📊 ${rawData.length} éléments OSM trouvés`);
    
    // Transformer les données OSM au format Supabase
    console.log('🔄 Transformation des données OSM...');
    const data = rawData
      .filter(osm => osm.tags && osm.tags.name) // Garder seulement les éléments avec nom
      .map(osm => ({
        nom: osm.tags.name || osm.tags['name:fr'],
        nom_normalise: (osm.tags.name || osm.tags['name:fr'] || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        type_lieu: osm.tags.amenity || osm.tags.shop || osm.tags.tourism || 
                   osm.tags.building || osm.tags.highway || osm.tags.natural || 
                   osm.tags.leisure || osm.tags.office || osm.tags.place || 'autre',
        ville: osm.tags['addr:city'] || osm.tags.city || 'conakry',
        position: `POINT(${osm.lon || osm.center?.lon || 0} ${osm.lat || osm.center?.lat || 0})`,
        adresse_complete: osm.tags['addr:full'] || osm.tags['addr:street'] || osm.tags['addr:housenumber'] || '',
        actif: true,
        popularite: 0,
        
        // Nouvelles colonnes utiles
        telephone: osm.tags.phone || osm.tags['contact:phone'] || null,
        site_web: osm.tags.website || osm.tags['contact:website'] || null,
        horaires: osm.tags.opening_hours || null,
        email: osm.tags.email || null,
        rue: osm.tags['addr:street'] || null,
        numero: osm.tags['addr:housenumber'] || null,
        operateur: osm.tags.operator || null,
        marque: osm.tags.brand || null,
        description_fr: osm.tags.description || null,
        accessibilite: osm.tags.wheelchair || null,
        cuisine: osm.tags.cuisine || null,
        verifie: false
      }))
      .filter(item => item.position !== 'POINT(0 0)'); // Filtrer les éléments sans coordonnées
    console.log(`📊 ${data.length} adresses à injecter`);
    
    // 4. Préparer les données (sans IDs - laisser Supabase les générer)
    console.log('\n🔧 Préparation des données...');
    const preparedData = data.map((item, index) => {
      const { id, ...itemWithoutId } = item; // Retirer l'ID pour laisser Supabase le générer
      return itemWithoutId;
    });
    
    // 5. Injection par batch de 500
    console.log('\n💉 Injection par batches...');
    const batchSize = 500;
    let totalInserted = 0;
    
    for (let i = 0; i < preparedData.length; i += batchSize) {
      const batch = preparedData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(preparedData.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} adresses)`);
      
      const { data: insertedData, error } = await supabase
        .from('adresses')
        .upsert(batch, { 
          onConflict: 'nom',
          ignoreDuplicates: true 
        })
        .select();
      
      if (error) {
        console.error(`❌ Erreur batch ${batchNumber}:`, error.message);
        // Continuer avec le batch suivant même en cas d'erreur
      } else {
        totalInserted += insertedData.length;
        console.log(`✅ ${insertedData.length} adresses insérées (Total: ${totalInserted})`);
      }
      
      // Pause entre les batches pour éviter la surcharge
      if (i + batchSize < preparedData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 6. Vérification finale
    console.log('\n🔍 Vérification finale...');
    const { count: countAfter } = await supabase
      .from('adresses')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`✅ Adresses avant: ${countBefore}`);
    console.log(`✅ Nouvelles adresses tentées: ${data.length}`);
    console.log(`✅ Adresses injectées avec succès: ${totalInserted}`);
    console.log(`✅ Adresses totales maintenant: ${countAfter}`);
    console.log(`✅ Taux de réussite: ${((totalInserted / data.length) * 100).toFixed(1)}%`);
    console.log(`✅ Nouvelles adresses ajoutées: ${countAfter - countBefore}`);
    
    // 7. Test de recherche
    console.log('\n🧪 Test de recherche...');
    const testQueries = ['hopital', 'marche', 'port', 'ecole', 'banque'];
    
    for (const query of testQueries) {
      const { data: results, error } = await supabase
        .from('adresses')
        .select('nom, ville, type_lieu')
        .ilike('nom', `%${query}%`)
        .limit(3);
      
      if (!error && results) {
        console.log(`\n🔍 "${query}": ${results.length} résultats`);
        results.forEach(r => console.log(`   - ${r.nom} (${r.ville}) - ${r.type_lieu || 'N/A'}`));
      }
    }
    
    console.log('\n✅ INJECTION TERMINÉE AVEC SUCCÈS !');
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message);
    process.exit(1);
  }
}

// Exécution
console.log('🌍 PROJET: Injection complète adresses Guinée OSM');
console.log('📅 Date:', new Date().toISOString());
console.log('=====================================\n');

injectAllAddresses();