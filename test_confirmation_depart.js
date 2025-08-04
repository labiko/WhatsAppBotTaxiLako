// Test des modifications - Confirmation départ
const fetch = require('node-fetch');

const testUrl = 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot';
const testPhone = 'whatsapp:+33620951645';

async function testBot(body, latitude = '', longitude = '', mediaUrl = '') {
  try {
    const params = new URLSearchParams({
      From: testPhone,
      Body: body,
      Latitude: latitude,
      Longitude: longitude,
      MediaUrl0: mediaUrl
    });

    console.log(`\n🔄 TEST: "${body}"`);
    console.log('⏳ Envoi...');

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    const text = await response.text();
    
    console.log('✅ Réponse bot:');
    console.log('----------------------------------------');
    
    // Extraire le message de la réponse XML
    const messageMatch = text.match(/<Message>(.*?)<\/Message>/s);
    if (messageMatch) {
      console.log(messageMatch[1]);
    } else {
      console.log(text);
    }
    
    console.log('----------------------------------------');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

async function runTest() {
  console.log('========================================');
  console.log('   TEST CONFIRMATION DÉPART - MODE TEXTE');
  console.log('========================================');
  console.log('Numéro test:', testPhone);
  console.log('');

  // Test du nouveau workflow
  console.log('🧪 TEST DU NOUVEAU WORKFLOW:');
  
  // 1. Demande taxi
  await testBot('taxi');
  
  // Attendre 2 secondes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Choisir moto (devrait maintenant demander confirmation)
  await testBot('moto');
  
  // Attendre 2 secondes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Tester réponse "oui" (devrait demander GPS)
  await testBot('oui');
  
  // Attendre 2 secondes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 4. Tester réponse "non" 
  console.log('\n🔄 TEST BRANCHE "NON":');
  await testBot('taxi'); // Redémarrer
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testBot('moto');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testBot('non');
  
  console.log('\n✅ Tests terminés!');
}

runTest().catch(console.error);