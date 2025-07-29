// =======================================================
// OPTION 2 : POLLING AUTOMATIQUE
// =======================================================
// Système qui vérifie automatiquement les notifications
// en attente et les traite sans intervention manuelle
// =======================================================

// Configuration du polling
const POLLING_INTERVAL = 30000; // 30 secondes
const MAX_NOTIFICATIONS_PER_CYCLE = 10; // Limite par cycle
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

// Variable globale pour contrôler le polling
let pollingActive = false;
let pollingIntervalId = null;

/**
 * Fonction principale de polling
 */
async function checkAndProcessNotifications() {
  try {
    console.log('🔍 Vérification des notifications en attente...');
    
    // 1. Récupérer les notifications non traitées
    const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications_pending?processed_at=is.null&select=*&limit=${MAX_NOTIFICATIONS_PER_CYCLE}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur récupération notifications: ${response.status}`);
    }
    
    const notifications = await response.json();
    
    if (notifications.length === 0) {
      console.log('✅ Aucune notification en attente');
      return { processed: 0, message: 'Aucune notification en attente' };
    }
    
    console.log(`📋 ${notifications.length} notification(s) à traiter`);
    
    // 2. Traiter chaque notification
    let processedCount = 0;
    let errorCount = 0;
    
    for (const notification of notifications) {
      try {
        console.log(`📤 Traitement notification: ${notification.id} (réservation: ${notification.reservation_id})`);
        
        // Envoyer le WhatsApp
        const success = await sendWhatsAppForReservation(notification.reservation_id);
        
        if (success) {
          // Marquer comme traitée
          await markNotificationAsProcessed(notification.id);
          processedCount++;
          console.log(`✅ Notification ${notification.id} traitée avec succès`);
        } else {
          errorCount++;
          console.log(`❌ Échec traitement notification ${notification.id}`);
        }
        
        // Délai entre les notifications pour éviter le spam
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes
        
      } catch (error) {
        console.error(`❌ Erreur traitement notification ${notification.id}:`, error);
        errorCount++;
      }
    }
    
    const result = {
      processed: processedCount,
      errors: errorCount,
      total: notifications.length,
      message: `✅ ${processedCount} WhatsApp envoyé(s), ${errorCount} erreur(s)`
    };
    
    console.log(`📊 Résultat cycle polling:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ Erreur cycle polling:', error);
    return { processed: 0, errors: 1, message: `Erreur: ${error.message}` };
  }
}

/**
 * Envoyer WhatsApp pour une réservation
 */
async function sendWhatsAppForReservation(reservationId) {
  try {
    // Récupérer les données de la réservation avec le conducteur
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${reservationId}&statut=eq.accepted&select=*,conducteurs(*)`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur récupération réservation: ${response.status}`);
    }
    
    const reservations = await response.json();
    
    if (reservations.length === 0) {
      console.log(`⚠️ Réservation ${reservationId} non trouvée ou pas acceptée`);
      return false;
    }
    
    const reservation = reservations[0];
    const conducteur = reservation.conducteurs;
    
    if (!conducteur) {
      console.log(`⚠️ Conducteur non trouvé pour réservation ${reservationId}`);
      return false;
    }
    
    // Construire le message WhatsApp
    const etaMinutes = Math.max(5, Math.round((reservation.distance_km || 5) * 3));
    const message = `✅ CONDUCTEUR TROUVÉ!

🚖 Votre conducteur:
👤 ${conducteur.prenom} ${conducteur.nom}
📱 ${conducteur.telephone}
🚗 ${conducteur.vehicle_couleur} ${conducteur.vehicle_marque} ${conducteur.vehicle_modele}
🔢 Plaque: ${conducteur.vehicle_plaque}
⏱️ Arrivée dans: ${etaMinutes} minutes
⭐ Note: ${conducteur.note_moyenne}/5

💰 Prix confirmé: ${reservation.prix_total?.toLocaleString('fr-FR') || '0'} GNF
📍 Destination: ${reservation.destination_nom}

Le conducteur vous contactera dans quelques instants.

Bon voyage! 🚗`;
    
    // Envoyer via Twilio
    const twilioResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts/AC18f32de0b3353a2e66ca647797e0993d/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa('AC18f32de0b3353a2e66ca647797e0993d:a85040196f279e0acd690566fe2ae788'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: 'whatsapp:+14155238886',
        To: `whatsapp:${reservation.client_phone}`,
        Body: message
      })
    });
    
    if (twilioResponse.ok) {
      console.log(`✅ WhatsApp envoyé à ${reservation.client_phone}`);
      return true;
    } else {
      const errorText = await twilioResponse.text();
      console.error(`❌ Erreur Twilio: ${twilioResponse.status} - ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Erreur envoi WhatsApp pour ${reservationId}:`, error);
    return false;
  }
}

/**
 * Marquer une notification comme traitée
 */
async function markNotificationAsProcessed(notificationId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications_pending?id=eq.${notificationId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        processed_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur mise à jour notification: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur marquage notification ${notificationId}:`, error);
    return false;
  }
}

/**
 * Démarrer le polling automatique
 */
function startPolling() {
  if (pollingActive) {
    console.log('⚠️ Polling déjà actif');
    return;
  }
  
  console.log(`🚀 Démarrage du polling automatique (intervalle: ${POLLING_INTERVAL}ms)`);
  pollingActive = true;
  
  // Premier check immédiat
  checkAndProcessNotifications();
  
  // Puis checks réguliers
  pollingIntervalId = setInterval(() => {
    if (pollingActive) {
      checkAndProcessNotifications();
    }
  }, POLLING_INTERVAL);
}

/**
 * Arrêter le polling automatique
 */
function stopPolling() {
  if (!pollingActive) {
    console.log('⚠️ Polling déjà inactif');
    return;
  }
  
  console.log('🛑 Arrêt du polling automatique');
  pollingActive = false;
  
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

/**
 * Obtenir le statut du polling
 */
function getPollingStatus() {
  return {
    active: pollingActive,
    interval: POLLING_INTERVAL,
    maxPerCycle: MAX_NOTIFICATIONS_PER_CYCLE,
    nextCheck: pollingActive ? 'Dans ' + Math.round(POLLING_INTERVAL / 1000) + 's' : 'Inactif'
  };
}

// =======================================================
// INTÉGRATION DANS L'EDGE FUNCTION PRINCIPALE
// =======================================================

// À ajouter dans votre Edge Function serve() :
/*
serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  
  // Contrôles de polling
  if (action === 'start-polling') {
    startPolling();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Polling automatique démarré',
      status: getPollingStatus()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (action === 'stop-polling') {
    stopPolling();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Polling automatique arrêté' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (action === 'polling-status') {
    return new Response(JSON.stringify(getPollingStatus()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (action === 'check-now') {
    const result = await checkAndProcessNotifications();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Démarrer automatiquement le polling au premier appel
  if (!pollingActive) {
    startPolling();
  }
  
  // ... reste de votre code Edge Function
});
*/

// =======================================================
// EXEMPLES D'UTILISATION
// =======================================================

// 1. Démarrer le polling automatique
// GET https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=start-polling

// 2. Vérifier le statut
// GET https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=polling-status

// 3. Check manuel immédiat
// GET https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=check-now

// 4. Arrêter le polling
// GET https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot?action=stop-polling

module.exports = {
  checkAndProcessNotifications,
  startPolling,
  stopPolling,
  getPollingStatus
};