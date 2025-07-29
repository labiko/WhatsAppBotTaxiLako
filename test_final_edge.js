// Test final Edge Function location-search
const https = require('https');

async function testEdgeFunction() {
  console.log('🔍 Test Edge Function location-search...');
  
  const tests = [
    { query: 'hopital', targetCity: 'conakry' },
    { query: 'marche', targetCity: 'conakry' },
    { query: 'ecole' }, // Auto-détection ville
    { query: 'kindia centre' } // Ville dans query
  ];

  for (const test of tests) {
    console.log(`\n📍 Test: "${test.query}"${test.targetCity ? ` (${test.targetCity})` : ''}`);
    
    try {
      const result = await callAPI(test);
      
      if (result.success) {
        console.log(`✅ ${result.results.length} résultats`);
        console.log(`🎯 Ville détectée: ${result.targetCity}`);
        
        if (result.results.length > 0) {
          const first = result.results[0];
          console.log(`📍 Premier: ${first.nom} (${first.ville}) - ${first.type_lieu}`);
        }
      } else {
        console.log(`❌ Erreur: ${result.error}`);
      }
      
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }
  
  console.log('\n🎉 Tests terminés!');
}

function callAPI(testData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: testData.query,
      targetCity: testData.targetCity,
      maxResults: 5
    });

    const options = {
      hostname: 'nmwnibzgvwltipmtwhzo.supabase.co',
      path: '/functions/v1/location-search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.VRD1ipOvBfEQyckN-3wlDkJbdSfANmjU5bnKf66OdZk'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}, Data: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

if (require.main === module) {
  testEdgeFunction();
}