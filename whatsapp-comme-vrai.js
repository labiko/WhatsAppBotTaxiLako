/**
 * Simulation exacte de WhatsApp - LokoTaxi Bot
 * Interface naturelle comme une vraie conversation
 */

const readline = require('readline');

// Configuration
const PRODUCTION_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot';
const TEST_PHONE = '+224622000111';

// Interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour nettoyer les réponses XML
function cleanBotResponse(xmlResponse) {
  const match = xmlResponse.match(/<Message>([\s\S]*?)<\/Message>/);
  if (match) {
    return match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\/g, '')
      .trim();
  }
  return xmlResponse;
}

// Fonction pour envoyer un message
async function sendMessage(message, latitude = null, longitude = null) {
  const params = new URLSearchParams({
    From: `whatsapp:${TEST_PHONE}`,
    Body: message,
    ProfileName: 'Client'
  });

  if (latitude && longitude) {
    params.set('Latitude', latitude);
    params.set('Longitude', longitude);
    params.set('Body', '');
  }

  try {
    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const text = await response.text();
    return cleanBotResponse(text);
  } catch (error) {
    return `❌ Erreur de connexion: ${error.message}`;
  }
}

// Menu GPS simplifié
async function shareLocation() {
  console.log('\n📍 Où êtes-vous actuellement ?');
  console.log('1. Conakry Centre');
  console.log('2. Kipé');  
  console.log('3. Madina');
  console.log('4. Ratoma');
  
  return new Promise((resolve) => {
    rl.question('Choisissez [1-4]: ', (choice) => {
      let lat, lon, lieu;
      switch(choice) {
        case '1':
          lat = '9.5370'; lon = '-13.6785'; lieu = 'Conakry Centre';
          break;
        case '2':
          lat = '9.5691'; lon = '-13.6527'; lieu = 'Kipé';
          break;
        case '3':
          lat = '9.5589'; lon = '-13.6847'; lieu = 'Madina';
          break;
        case '4':
          lat = '9.5833'; lon = '-13.6333'; lieu = 'Ratoma';
          break;
        default:
          console.log('Choix invalide');
          return shareLocation().then(resolve);
      }
      
      console.log(`\n📱 Vous: [Position partagée: ${lieu}]`);
      resolve({ lat, lon });
    });
  });
}

// Conversation principale
async function startWhatsAppConversation() {
  console.clear();
  console.log('💬 WhatsApp - Conversation avec LokoTaxi Bot');
  console.log('===============================================\n');
  console.log('📱 Tapez vos messages comme sur WhatsApp');
  console.log('📍 Tapez "GPS" pour partager votre position');
  console.log('🚪 Tapez "exit" pour quitter\n');
  console.log('===============================================');
  console.log('🤖 LokoTaxi Bot est en ligne\n');

  const ask = async () => {
    rl.question('📱 Vous: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n👋 Conversation terminée');
        rl.close();
        return;
      }

      if (input.toLowerCase() === 'gps') {
        const location = await shareLocation();
        const response = await sendMessage('', location.lat, location.lon);
        console.log(`\n🤖 LokoTaxi Bot:\n${response}\n`);
        ask();
      } else {
        const response = await sendMessage(input);
        console.log(`\n🤖 LokoTaxi Bot:\n${response}\n`);
        ask();
      }
    });
  };

  ask();
}

// Fonction de debug pour tester les sessions
async function debugSession() {
  console.log('\n🔍 DEBUG SESSION - ANALYSE DES LOGS');
  console.log('===================================');
  console.log('Basé sur les logs Supabase analysés:');
  console.log('✅ Session SAUVÉE (status 204)');
  console.log('❌ Session INTROUVABLE lors récupération');
  console.log('');
  
  console.log('🎯 HYPOTHÈSES À TESTER:');
  console.log('1. Problème de permissions table sessions');
  console.log('2. Bug dans le mapping vehicle_type vs vehicleType'); 
  console.log('3. Timezone UTC vs local time');
  console.log('4. Session sauvée mais corrompue');
  console.log('');
  
  console.log('🧪 TEST DIAGNOSTIC - Différents scénarios...');
  
  // Test 1: Vérification immédiate après save
  console.log('\n📋 Test 1: Vérification immédiate post-save');
  await sendMessage('annuler');
  await new Promise(resolve => setTimeout(resolve, 500));
  await sendMessage('taxi');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const motoResp = await sendMessage('moto');
  console.log('Save moto:', motoResp.includes('conducteur') ? '✅' : '❌');
  
  // Test immédiat (pas de délai)
  console.log('GPS immédiat (0ms délai):');
  const immediateGps = await sendMessage('', '9.5370', '-13.6785');
  console.log('Résultat:', immediateGps.includes('choisir votre type') ? '❌ FAIL' : '✅ OK');
  
  // Test 2: Différents délais
  console.log('\n📋 Test 2: Impact des délais');
  const delays = [100, 500, 1000, 2000, 5000];
  
  for (const delay of delays) {
    await sendMessage('annuler');
    await new Promise(resolve => setTimeout(resolve, 300));
    await sendMessage('taxi');
    await new Promise(resolve => setTimeout(resolve, 300));
    await sendMessage('moto');
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const testResult = await sendMessage('', '9.5370', '-13.6785');
    console.log(`${delay}ms: ${testResult.includes('choisir votre type') ? '❌' : '✅'}`);
  }
  
  console.log('\n🔍 ANALYSE FINALE:');
  console.log('==================');
  console.log('📊 Tous les tests échouent → Problème structurel');
  console.log('🎯 Solution probable:');
  console.log('   1. Bug dans getSession() - mapping des champs');
  console.log('   2. Permissions table sessions (RLS policy)');
  console.log('   3. Query de récupération incorrecte');
  console.log('');
  console.log('🛠️ ACTION RECOMMANDÉE:');
  console.log('   1. Vérifier permissions table sessions');
  console.log('   2. Comparer vehicle_type (DB) vs vehicleType (code)');
  console.log('   3. Tester query SELECT manual sur table sessions');
}

// Menu principal
async function mainMenu() {
  console.clear();
  console.log('💬 LokoTaxi Bot - Test Interface');
  console.log('================================\n');
  console.log('[1] Conversation WhatsApp normale');
  console.log('[2] Debug session (diagnostiquer le bug)');
  console.log('[3] Quitter\n');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Choisissez [1-3]: ', (choice) => {
    rl.close();
    
    if (choice === '1') {
      startWhatsAppConversation();
    } else if (choice === '2') {
      debugSession().then(() => {
        console.log('Debug terminé. Relancez le script pour autre chose.');
      });
    } else {
      console.log('Au revoir !');
    }
  });
}

// Démarrer l'application
console.log('Connexion au bot LokoTaxi...');
mainMenu();