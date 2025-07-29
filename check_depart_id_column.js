// Vérifier si la colonne depart_id existe dans la table sessions
const SUPABASE_URL = 'https://vqozufmjnkkrfgdpvpkm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3p1Zm1qbmtrcmZnZHB2cGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTkxNzQ3OCwiZXhwIjoyMDM3NDkzNDc4fQ.DhWFJYCY4hUfOLmPHgCh5j0NJfK4sEm0eFUObhCcYJs';

async function checkDepartIdColumn() {
  try {
    console.log('🔍 Vérification de la structure de la table sessions...');
    
    // Test 1: Essayer de sélectionner depart_id
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=depart_id&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ La colonne depart_id existe !');
      console.log(`📋 Échantillon de données:`, data);
    } else {
      const error = await response.text();
      console.log('❌ La colonne depart_id n\'existe pas encore');
      console.log('📋 Erreur:', error);
    }
    
  } catch (error) {
    console.error('💥 Erreur lors de la vérification:', error.message);
  }
}

checkDepartIdColumn();