const https = require('https');

const testSearch = async (query) => {
  console.log(`\n🔍 Test recherche: '${query}'`);
  
  const postData = JSON.stringify({ query, maxResults: 5 });
  
  const options = {
    hostname: 'nmwnibzgvwltipmtwhzo.supabase.co',
    path: '/functions/v1/location-search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.results) {
            console.log(`✅ ${result.results.length} résultats trouvés:`);
            result.results.forEach((r, i) => {
              console.log(`  ${i+1}. ${r.nom} (${r.ville}) - Type: ${r.type_lieu || 'N/A'}`);
            });
          } else {
            console.log('❌ Aucun résultat ou erreur:', result.error);
          }
          resolve();
        } catch (e) {
          console.log('❌ Erreur parsing:', e.message);
          console.log('Réponse brute:', data);
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Erreur requête:', e.message);
      resolve();
    });
    req.write(postData);
    req.end();
  });
};

// Test recherche 'port'
(async () => {
  await testSearch('port');
  await testSearch('Port');
  await testSearch('PORT');
  await testSearch('Port Autonome');
})();