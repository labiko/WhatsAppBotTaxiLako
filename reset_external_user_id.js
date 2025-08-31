/**
 * 🔄 RÉINITIALISATION EXTERNAL USER ID ONESIGNAL
 * 
 * Supprime et recrée l'External User ID pour forcer une nouvelle souscription
 */

const resetExternalUserId = async () => {
  const appId = "867e880f-d486-482e-b7d8-d174db39f322";
  const apiKey = "os_v2_app_qz7iqd6uqzec5n6y2f2nwoptelbcfyz3rome4aue3heo7mz6mpdebjbpum3qzzdl6crzi5o6z3u5zizdckxjkalkylohy5p3i4a5jsa";
  const playerId = "4351f95d-409c-4db7-90b6-4e2cb949e321";
  const externalUserId = "conducteur_69e0cde9-14a0-4dde-86c1-1fe9a306f2fa";

  console.log('🔄 ÉTAPE 1: Suppression de l\'External User ID...');
  
  // Étape 1: Supprimer l'External User ID
  try {
    const deleteResponse = await fetch(`https://onesignal.com/api/v1/apps/${appId}/users/by/external_id/${externalUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${apiKey}`
      }
    });
    
    const deleteResult = await deleteResponse.json();
    console.log('🗑️ Suppression:', deleteResult);
  } catch (error) {
    console.log('⚠️ Erreur suppression (normal si n\'existe pas):', error.message);
  }

  console.log('🔄 ÉTAPE 2: Récupération info Player ID...');
  
  // Étape 2: Vérifier le Player ID
  try {
    const playerResponse = await fetch(`https://onesignal.com/api/v1/apps/${appId}/users/${playerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${apiKey}`
      }
    });
    
    const playerResult = await playerResponse.json();
    console.log('📱 Info Player ID:', {
      id: playerResult.id,
      external_user_id: playerResult.external_user_id,
      invalid_identifier: playerResult.invalid_identifier,
      session_count: playerResult.session_count,
      country: playerResult.country,
      timezone: playerResult.timezone
    });
  } catch (error) {
    console.log('❌ Erreur récupération Player:', error.message);
  }

  console.log('🔄 ÉTAPE 3: Attribution nouveau External User ID...');
  
  // Étape 3: Attribuer le nouvel External User ID
  try {
    const updateResponse = await fetch(`https://onesignal.com/api/v1/apps/${appId}/users/${playerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify({
        external_user_id: externalUserId
      })
    });
    
    const updateResult = await updateResponse.json();
    console.log('✅ Attribution External User ID:', updateResult);
    
    if (updateResult.success === true) {
      console.log('🎯 SUCCÈS: External User ID réinitialisé!');
      
      // Test notification immédiat
      console.log('🧪 Test notification immédiat...');
      
      const testNotif = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: appId,
          include_external_user_ids: [externalUserId],
          headings: { en: "✅ RESET RÉUSSI", fr: "✅ RESET RÉUSSI" },
          contents: { en: "External User ID réinitialisé avec succès!", fr: "External User ID réinitialisé avec succès!" },
          android_channel_id: "1c80350f-1600-4b1d-837b-537b1659704e"
        })
      });
      
      const testResult = await testNotif.json();
      console.log('🎯 Test notification:', testResult);
      
    } else {
      console.log('❌ Échec attribution:', updateResult);
    }
    
  } catch (error) {
    console.log('💥 Erreur attribution:', error.message);
  }
};

// Exécuter la réinitialisation
resetExternalUserId();