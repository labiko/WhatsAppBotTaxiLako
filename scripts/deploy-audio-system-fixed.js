// Script de Déploiement Système Audio Complet LokoTaxi
// Usage: node scripts/deploy-audio-system-fixed.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Charger le fichier .env automatiquement
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('📄 Chargement du fichier .env...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
    
    console.log('✅ Fichier .env chargé avec succès');
  } else {
    console.log('⚠️ Fichier .env non trouvé');
  }
}

// Charger .env au démarrage
loadEnvFile();

// Configuration
const PROJECT_DIR = process.cwd();
const SUPABASE_PROJECT_URL = process.env.SUPABASE_URL || '';
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY', 
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN'
];

console.log('🚀 DÉPLOIEMENT SYSTÈME AUDIO LOKOTAXI\n');
console.log('=' .repeat(50));

// Étape 1: Vérification prérequis
function checkPrerequisites() {
  console.log('\n📋 ÉTAPE 1: Vérification prérequis');
  
  // Vérifier Supabase CLI
  try {
    const supabaseVersion = execSync('supabase --version', { encoding: 'utf8' });
    console.log(`✅ Supabase CLI: ${supabaseVersion.trim()}`);
  } catch (error) {
    console.error('❌ Supabase CLI non installé');
    console.log('💡 Installation: npm install -g supabase');
    process.exit(1);
  }
  
  // Vérifier variables d'environnement
  console.log('\n🔑 Variables d\'environnement:');
  let missingVars = [];
  
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const maskedValue = varName.includes('KEY') || varName.includes('TOKEN') || varName.includes('SID')
        ? `${value.substring(0, 8)}...`
        : value;
      console.log(`✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`❌ ${varName}: MANQUANTE`);
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.error(`\n❌ Variables manquantes: ${missingVars.join(', ')}`);
    console.log('💡 Configurez dans .env ou variables système');
    process.exit(1);
  }
  
  console.log('✅ Tous les prérequis sont satisfaits');
}

// Étape 2: Déploiement des Edge Functions
function deployFunctions() {
  console.log('\n🚀 ÉTAPE 2: Déploiement Edge Functions');
  
  const functions = [
    { name: 'webhook-router', description: 'Routage automatique audio/texte' },
    { name: 'audio-to-text', description: 'Pipeline transcription + analyse IA' },
    { name: 'whatsapp-bot', description: 'Bot principal (existant)' }
  ];
  
  functions.forEach(func => {
    console.log(`\n📦 Déploiement ${func.name}...`);
    
    const functionPath = path.join(PROJECT_DIR, 'supabase', 'functions', func.name);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`⚠️ ${func.name} non trouvée, ignorée`);
      return;
    }
    
    try {
      execSync(`supabase functions deploy ${func.name}`, { 
        cwd: PROJECT_DIR,
        stdio: 'inherit'  
      });
      console.log(`✅ ${func.name} déployée`);
    } catch (error) {
      console.error(`❌ Erreur déploiement ${func.name}:`, error.message);
      process.exit(1);
    }
  });
  
  console.log('\n✅ Toutes les Edge Functions sont déployées');
}

// Étape 3: Tests de connectivité
async function testConnectivity() {
  console.log('\n🧪 ÉTAPE 3: Tests de connectivité');
  
  const baseUrl = SUPABASE_PROJECT_URL.replace(/\/$/, '');
  const endpoints = [
    { name: 'webhook-router', url: `${baseUrl}/functions/v1/webhook-router/health` },
    { name: 'whatsapp-bot', url: `${baseUrl}/functions/v1/whatsapp-bot` },
    { name: 'audio-to-text', url: `${baseUrl}/functions/v1/audio-to-text` }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Test ${endpoint.name}...`);
    
    try {
      const response = await fetch(endpoint.url, { 
        method: 'GET',
        headers: { 'User-Agent': 'LokoTaxi-Deploy-Test/1.0' }
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name}: ACCESSIBLE (${response.status})`);
      } else {
        console.log(`⚠️ ${endpoint.name}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERREUR - ${error.message}`);
    }
  }
}

// Étape 4: Tests fonctionnels
async function testFunctionality() {
  console.log('\n🎯 ÉTAPE 4: Tests fonctionnels');
  
  const routerUrl = `${SUPABASE_PROJECT_URL}/functions/v1/webhook-router`;
  
  // Test 1: Message texte
  console.log('\n📝 Test message texte...');
  try {
    const formData = new FormData();
    formData.append('From', 'whatsapp:+224622000111');
    formData.append('Body', 'taxi');
    
    const response = await fetch(routerUrl, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const responseText = await response.text();
      if (responseText.includes('<Message>') && responseText.includes('véhicule')) {
        console.log('✅ Test texte: RÉUSSI - Workflow bot détecté');
      } else {
        console.log('⚠️ Test texte: Réponse inattendue');
        console.log('📄 Réponse:', responseText.substring(0, 200) + '...');
      }
    } else {
      console.log(`❌ Test texte: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Test texte: ERREUR - ${error.message}`);
  }
  
  // Test 2: Health check router
  console.log('\n🏥 Test health check...');
  try {
    const response = await fetch(`${routerUrl}/health`);
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Health check: RÉUSSI');
      console.log(`📊 Status:`, {
        audio_configured: health.environment?.audio_configured,
        twilio_configured: health.environment?.twilio_configured
      });
    } else {
      console.log(`❌ Health check: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Health check: ERREUR - ${error.message}`);
  }
}

// Étape 5: Configuration finale
function showFinalConfiguration() {
  console.log('\n⚙️ ÉTAPE 5: Configuration finale');
  
  const projectUrl = SUPABASE_PROJECT_URL.replace(/\/$/, '');
  const webhookUrl = `${projectUrl}/functions/v1/webhook-router`;
  
  console.log('\n📋 CONFIGURATION TWILIO WEBHOOK:');
  console.log('=' .repeat(50));
  console.log(`🔗 URL: ${webhookUrl}`);
  console.log('📝 Method: POST');
  console.log('📄 Content-Type: application/x-www-form-urlencoded');
  
  console.log('\n🎯 URLs DES FUNCTIONS:');
  console.log(`• Router:      ${webhookUrl}`);
  console.log(`• Bot Texte:   ${projectUrl}/functions/v1/whatsapp-bot`);
  console.log(`• Audio→Texte: ${projectUrl}/functions/v1/audio-to-text`);
  
  console.log('\n✅ DÉPLOIEMENT TERMINÉ !');
  console.log('\n🎤 WORKFLOW AUDIO OPÉRATIONNEL:');
  console.log('1. Audio WhatsApp → Transcription Whisper');
  console.log('2. Analyse temporelle GPT-4 → Extraction destination + heure');  
  console.log('3. Appel bot texte existant → Workflow unifié');
  console.log('4. Réponse utilisateur avec suggestions intelligentes');
  
  console.log('\n📱 TESTS UTILISATEUR:');
  console.log('• Envoyez audio: "Je veux aller à Madina à 14 heures"');
  console.log('• Envoyez texte: "taxi" pour workflow classique');
  console.log('• Les deux utilisent la même logique finale !');
}

// Fonction principale
async function main() {
  try {
    checkPrerequisites();
    deployFunctions();
    await testConnectivity();
    await testFunctionality();
    showFinalConfiguration();
    
    console.log('\n🎉 SYSTÈME AUDIO LOKOTAXI PRÊT !');
    
  } catch (error) {
    console.error('\n💥 ERREUR FATALE:', error.message);
    process.exit(1);
  }
}

// Point d'entrée
if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  deployFunctions,
  testConnectivity,
  testFunctionality
};