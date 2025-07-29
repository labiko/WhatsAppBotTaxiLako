// Test de la fonction searchAdressePartial pour "Madina"
const SUPABASE_URL = 'https://vqozufmjnkkrfgdpvpkm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3p1Zm1qbmtrcmZnZHB2cGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTkxNzQ3OCwiZXhwIjoyMDM3NDkzNDc4fQ.DhWFJYCY4hUfOLmPHgCh5j0NJfK4sEm0eFUObhCcYJs';

async function testSearchAdressePartial(keyword) {
  try {
    console.log(`🔍 Test searchAdressePartial pour: "${keyword}"`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses_with_coords?select=id,nom,ville,type_lieu,latitude,longitude,position&or=(nom.ilike.*${encodeURIComponent(keyword)}*,nom_normalise.ilike.*${encodeURIComponent(keyword)}*)&order=nom`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ ${data.length} résultat(s) trouvé(s):`);
    
    if (data.length > 0) {
      data.slice(0, 5).forEach((item, i) => {
        console.log(`${i+1}. ${item.nom} (${item.ville}) - lat: ${item.latitude}, lon: ${item.longitude}`);
      });
    } else {
      console.log('❌ Aucun résultat trouvé');
    }
    
  } catch (error) {
    console.error(`💥 Exception: ${error.message}`);
  }
}

// Tester avec "Madina"
testSearchAdressePartial('madina');