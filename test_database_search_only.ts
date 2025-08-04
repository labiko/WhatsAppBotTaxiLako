// ========================================
// TEST SIMPLE : searchInDatabaseSmart UNIQUEMENT
// ========================================

import { 
  initializeSearchService,
  searchInDatabaseSmart
} from './search-service.ts';

async function testMardina() {
  console.log('🧪 TEST FOCUS : searchInDatabaseSmart');
  console.log('====================================');
  
  // Configuration minimale
  const config = {
    supabaseUrl: 'https://nmwnibzgvwltipmtwhzo.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTEyOTgzMCwiZXhwIjoyMDM2NzA1ODMwfQ.4-ccQNbWTDNs9DhHBdYTw2vJlUSP3-VGEu5yzxWnAu8',
    primarySource: 'database' as const,
    fuzzyThreshold: 0.3,
    maxSuggestions: 10,
    logLevel: 'debug' as const
  };
  
  try {
    // 1. Initialiser
    console.log('⚙️ Initialisation...');
    await initializeSearchService(config);
    console.log('✅ Initialisé\n');
    
    // 2. Test du cas principal : "mardina marché"
    console.log('🔍 TEST : "mardina marché"');
    console.log('-------------------------');
    
    const results = await searchInDatabaseSmart('mardina marché', {
      maxResults: 10,
      logLevel: 'debug'
    });
    
    console.log(`\n📊 RÉSULTATS : ${results.length} trouvé(s)`);
    
    if (results.length > 0) {
      results.forEach((result, i) => {
        console.log(`\n${i+1}. 📍 ${result.name}`);
        console.log(`   🏷️  ID: ${result.id}`);
        console.log(`   📝 Adresse: ${result.address}`);
        console.log(`   🎯 Source: ${result.source}`);
        console.log(`   ⭐ Score: ${result.score}`);
        
        if (result.coords) {
          console.log(`   🌍 GPS: ${result.coords.lat}, ${result.coords.lng}`);
        }
        
        if (result.matchDetails) {
          console.log(`   🔧 Stratégie: ${result.matchDetails.strategy}`);
          if (result.matchDetails.matchedWith) {
            console.log(`   🔄 Matché avec: "${result.matchDetails.matchedWith}"`);
          }
          if (result.matchDetails.wordMatches) {
            console.log(`   🔤 Mots matchés: [${result.matchDetails.wordMatches.join(', ')}]`);
          }
        }
      });
      
      // Vérifier si on a trouvé "Marché Madina"
      const madinaFound = results.find(r => 
        r.name.toLowerCase().includes('madina') &&
        r.name.toLowerCase().includes('marché')
      );
      
      if (madinaFound) {
        console.log(`\n🎉 SUCCÈS ! Trouvé "${madinaFound.name}" malgré la faute "mardina"`);
        console.log(`   📈 Méthode: ${madinaFound.source}`);
        console.log(`   🏆 Score: ${madinaFound.score}`);
      } else {
        console.log(`\n⚠️  "Marché Madina" non trouvé dans les résultats`);
      }
      
    } else {
      console.log('\n❌ AUCUN RÉSULTAT - Vérifiez la base de données');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

// Exécuter le test
testMardina();