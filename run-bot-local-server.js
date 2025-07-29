/**
 * Serveur local pour simuler l'Edge Function Supabase
 * Alternative complète sans Docker/Supabase local
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Configuration
const PORT = 3456;
const SUPABASE_URL = 'https://hmbsmupwvyccrkhdjplo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

// Sessions en mémoire
const sessions = new Map();

// Fonction pour normaliser le téléphone
function normalizePhone(phone) {
  return phone.replace('whatsapp:', '').trim();
}

// Logique du bot (simplifiée)
async function handleBotLogic(params) {
  const from = params.From || '';
  const body = (params.Body || '').toLowerCase().trim();
  const latitude = params.Latitude;
  const longitude = params.Longitude;
  
  const phone = normalizePhone(from);
  let session = sessions.get(phone) || {};
  
  let responseMessage = '';
  
  // Logique principale
  if (body.includes('taxi')) {
    session.vehicleType = null;
    session.state = 'waiting_vehicle';
    responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')";
  }
  else if ((body === 'moto' || body === 'voiture') && session.state === 'waiting_vehicle') {
    session.vehicleType = body;
    session.state = 'waiting_location';
    responseMessage = `Parfait ! Vous avez choisi : ${body}\\n\\nMaintenant, veuillez partager votre position en cliquant sur l'icône 📎 puis 'Localisation'.`;
  }
  else if (latitude && longitude && session.state === 'waiting_location') {
    session.position = { lat: latitude, lon: longitude };
    session.state = 'waiting_destination';
    responseMessage = "📍 Position reçue !\\n\\nOù souhaitez-vous aller ? (Tapez votre destination)";
  }
  else if (body && session.state === 'waiting_destination') {
    session.destination = body;
    session.state = 'waiting_confirmation';
    const prix = Math.floor(Math.random() * 50000) + 30000;
    session.prix = prix;
    responseMessage = `📍 Destination: ${body}\\n💰 Prix estimé: ${prix.toLocaleString('fr-FR')} GNF\\n\\nConfirmez-vous cette réservation ? (Répondez 'oui' ou 'non')`;
  }
  else if (body === 'oui' && session.state === 'waiting_confirmation') {
    session.state = 'completed';
    responseMessage = `🎉 Réservation confirmée !\\n\\n🚗 Conducteur: Mamadou Diallo\\n📞 Téléphone: +224621234567\\n🚙 Véhicule: ${session.vehicleType === 'moto' ? 'Moto' : 'Toyota Corolla'}\\n⏱️ Arrivée: 5-10 minutes\\n\\nLe conducteur va vous appeler. Bon voyage ! 🛣️`;
    sessions.delete(phone); // Reset session
  }
  else if (body === 'annuler') {
    sessions.delete(phone);
    responseMessage = "❌ Réservation annulée.\\n\\nPour une nouvelle réservation, écrivez 'taxi'.";
  }
  else {
    responseMessage = "👋 Bienvenue chez LokoTaxi !\\n\\nPour réserver un taxi, écrivez simplement 'taxi'.";
  }
  
  // Sauvegarder la session
  sessions.set(phone, session);
  
  return responseMessage;
}

// Créer le serveur
const server = http.createServer(async (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/functions/v1/whatsapp-bot') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // Parser les paramètres
        const params = querystring.parse(body);
        console.log('📥 Requête reçue:', params);
        
        // Traiter la logique du bot
        const responseMessage = await handleBotLogic(params);
        
        // Formater la réponse XML Twilio
        const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`;
        
        console.log('📤 Réponse:', responseMessage);
        
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(xmlResponse);
      } catch (error) {
        console.error('❌ Erreur:', error);
        res.writeHead(500);
        res.end('Erreur serveur');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`
🚀 Serveur LokoTaxi Bot Local démarré !
=====================================

URL: http://localhost:${PORT}/functions/v1/whatsapp-bot

Pour tester, modifiez test-bot-local.js :
  const EDGE_FUNCTION_URL = 'http://localhost:${PORT}/functions/v1/whatsapp-bot';

Puis lancez : node test-bot-local.js --complete

Ctrl+C pour arrêter le serveur.
`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});