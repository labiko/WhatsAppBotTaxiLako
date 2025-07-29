// =======================================================
// CODE À INTÉGRER DANS L'APP CONDUCTEUR
// =======================================================
// À ajouter quand le conducteur clique sur "Accepter"
// =======================================================

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U';

/**
 * Fonction principale : Accepter une réservation
 * À appeler quand le conducteur clique sur "Accepter"
 */
async function accepterReservation(reservationId, conducteurId) {
  try {
    console.log(`🚀 Acceptation de la réservation ${reservationId} par conducteur ${conducteurId}`);
    
    // ============================================
    // ÉTAPE 1 : Mettre à jour la réservation
    // ============================================
    console.log('📝 Mise à jour du statut en base...');
    
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${reservationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        statut: 'accepted',
        conducteur_id: conducteurId
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Erreur mise à jour réservation: ${updateResponse.status}`);
    }
    
    console.log('✅ Réservation mise à jour avec succès');
    
    // ============================================
    // ÉTAPE 2 : Envoyer WhatsApp au client
    // ============================================
    console.log('📱 Envoi WhatsApp au client...');
    
    const whatsappResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-bot?action=notify-accepted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        reservationId: reservationId
      })
    });
    
    if (!whatsappResponse.ok) {
      console.warn(`⚠️ Erreur envoi WhatsApp: ${whatsappResponse.status}`);
      // On continue quand même car la réservation est acceptée
    } else {
      console.log('✅ WhatsApp envoyé au client avec succès');
    }
    
    // ============================================
    // ÉTAPE 3 : Retourner le résultat
    // ============================================
    return {
      success: true,
      message: 'Réservation acceptée et client notifié',
      reservationId: reservationId
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'acceptation:', error);
    
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      reservationId: reservationId
    };
  }
}

/**
 * Fonction alternative avec Supabase Client (si vous utilisez @supabase/supabase-js)
 */
async function accepterReservationAvecSupabaseClient(reservationId, conducteurId, supabaseClient) {
  try {
    console.log(`🚀 Acceptation de la réservation ${reservationId}`);
    
    // ÉTAPE 1 : Mise à jour avec Supabase Client
    const { error: updateError } = await supabaseClient
      .from('reservations')
      .update({ 
        statut: 'accepted',
        conducteur_id: conducteurId
      })
      .eq('id', reservationId);
    
    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }
    
    console.log('✅ Réservation mise à jour');
    
    // ÉTAPE 2 : Appel Edge Function
    const { data: notificationData, error: notificationError } = await supabaseClient.functions.invoke('whatsapp-bot', {
      body: { 
        reservationId: reservationId 
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (notificationError) {
      console.warn('⚠️ Erreur notification WhatsApp:', notificationError);
    } else {
      console.log('✅ WhatsApp envoyé au client');
    }
    
    return { success: true, message: 'Réservation acceptée avec succès' };
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Exemple d'intégration dans un bouton React/Vue/Angular
 */
function ExempleBoutonAccepter({ reservationId, conducteurId, onSuccess, onError }) {
  const [loading, setLoading] = React.useState(false);
  
  const handleAccepter = async () => {
    setLoading(true);
    
    try {
      const result = await accepterReservation(reservationId, conducteurId);
      
      if (result.success) {
        onSuccess(result);
        alert('✅ Réservation acceptée ! Le client a été notifié.');
      } else {
        onError(result);
        alert(`❌ Erreur: ${result.message}`);
      }
    } catch (error) {
      onError(error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button 
      onClick={handleAccepter}
      disabled={loading}
      className="btn-accepter"
    >
      {loading ? '⏳ Acceptation...' : '✅ Accepter la course'}
    </button>
  );
}

/**
 * Version Promise simple (pour any framework)
 */
const accepterCourse = (reservationId, conducteurId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await accepterReservation(reservationId, conducteurId);
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.message));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// =======================================================
// EXEMPLES D'UTILISATION
// =======================================================

// Exemple 1 : Usage simple
// accepterReservation('uuid-de-la-reservation', 'uuid-du-conducteur');

// Exemple 2 : Avec gestion d'erreur
/*
accepterReservation('reservation-123', 'conducteur-456')
  .then(result => {
    if (result.success) {
      console.log('🎉 Succès:', result.message);
      // Rediriger vers page de suivi, etc.
    }
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    // Afficher message d'erreur à l'utilisateur
  });
*/

// Exemple 3 : Dans une fonction async
/*
async function onClickAccepter() {
  try {
    const result = await accepterReservation(reservationId, currentConducteurId);
    showSuccessMessage('Réservation acceptée !');
    navigateToActiveRides();
  } catch (error) {
    showErrorMessage('Erreur lors de l\'acceptation');
  }
}
*/