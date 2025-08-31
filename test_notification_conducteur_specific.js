/**
 * 🎯 TEST NOTIFICATION DIRECTE - CONDUCTEUR SPÉCIFIQUE
 * 
 * Envoi notification au conducteur: 52083d64-e3d5-4549-88e0-402d27510961
 */

const envoyerNotificationConducteur = async () => {
  const conducteurId = "52083d64-e3d5-4549-88e0-402d27510961";
  const externalUserId = `conducteur_${conducteurId}`;
  
  const notificationData = {
    app_id: "867e880f-d486-482e-b7d8-d174db39f322",
    include_external_user_ids: [externalUserId],
    headings: {
      en: "🧪 TEST NOTIFICATION DIRECTE",
      fr: "🧪 TEST NOTIFICATION DIRECTE"
    },
    contents: {
      en: "🎯 Message test envoyé directement via API OneSignal",
      fr: "🎯 Message test envoyé directement via API OneSignal"
    },
    android_channel_id: "1c80350f-1600-4b1d-837b-537b1659704e",
    priority: 10,
    data: {
      type: "test_direct",
      conducteur_id: conducteurId,
      timestamp: new Date().toISOString()
    }
  };

  try {
    console.log('🚀 Envoi notification test au conducteur...');
    console.log('👤 Conducteur ID:', conducteurId);
    console.log('📱 External User ID:', externalUserId);
    
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa'
      },
      body: JSON.stringify(notificationData)
    });

    const result = await response.json();
    console.log('✅ Réponse OneSignal:', result);
    
    if (result.id) {
      console.log('🎯 Notification envoyée avec succès!');
      console.log('📱 ID Notification:', result.id);
      console.log('👥 Recipients:', result.recipients);
      console.log('⏰ Heure envoi:', new Date().toLocaleString('fr-FR'));
    } else if (result.errors) {
      console.log('❌ Erreurs:', result.errors);
      if (result.warnings) {
        console.log('⚠️ Warnings:', result.warnings);
      }
    }
    
    return result;
  } catch (error) {
    console.error('💥 Erreur lors de l\'envoi:', error);
    return { error: error.message };
  }
};

// Exécuter le test
envoyerNotificationConducteur();