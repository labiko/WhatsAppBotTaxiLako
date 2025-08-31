/**
 * 🧪 TEST NOTIFICATION ONESIGNAL DIRECTE
 * 
 * Test avec le nouveau Player ID détecté dans les logs :
 * Player ID: 4351f95d-409c-4db7-90b6-4e2cb949e321
 * External User ID: conducteur_69e0cde9-14a0-4dde-86c1-1fe9a306f2fa
 */

const testNotificationDirecte = async () => {
  const notificationData = {
    app_id: "867e880f-d486-482e-b7d8-d174db39f322",
    include_external_user_ids: ["conducteur_69e0cde9-14a0-4dde-86c1-1fe9a306f2fa"],
    headings: {
      en: "🧪 TEST NOTIFICATION",
      fr: "🧪 TEST NOTIFICATION"
    },
    contents: {
      en: "🎯 Notification test avec nouveau Player ID: 4351f95d-409c-4db7-90b6-4e2cb949e321",
      fr: "🎯 Notification test avec nouveau Player ID: 4351f95d-409c-4db7-90b6-4e2cb949e321"
    },
    android_channel_id: "1c80350f-1600-4b1d-837b-537b1659704e",
    priority: 10,
    data: {
      test: "notification_directe",
      timestamp: new Date().toISOString(),
      player_id_detecte: "4351f95d-409c-4db7-90b6-4e2cb949e321"
    }
  };

  try {
    console.log('🚀 Envoi notification test...');
    console.log('📱 External User ID:', notificationData.include_external_user_ids[0]);
    
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
    } else {
      console.log('❌ Erreur:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('💥 Erreur lors de l\'envoi:', error);
    return { error: error.message };
  }
};

// Exécuter le test
testNotificationDirecte();