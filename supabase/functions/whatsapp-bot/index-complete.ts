import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'

// Sessions en mémoire
const sessions = new Map<string, { 
  vehicle_type?: string 
  timestamp: number
  step: 'init' | 'waiting_vehicle' | 'waiting_location' | 'processing'
}>()

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Nettoyage des sessions expirées
const cleanupSessions = () => {
  const now = Date.now()
  let cleaned = 0
  for (const [phone, session] of sessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessions.delete(phone)
      cleaned++
    }
  }
  if (cleaned > 0) console.log(`🧹 ${cleaned} sessions expirées supprimées`)
}

// Normalisation numéro de téléphone
const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

// Simulation de recherche de conducteur le plus proche
const findNearestDriver = (vehicleType: string, latitude: string, longitude: string) => {
  // Simulation - en réalité, ici vous feriez une vraie recherche en base
  const mockDrivers = {
    'moto': {
      name: 'Mamadou Diallo',
      phone: '+224621234567',
      vehicle: 'Moto Yamaha rouge',
      distance: '2.3 km',
      eta: '8 minutes',
      location: { lat: parseFloat(latitude) + 0.01, lng: parseFloat(longitude) + 0.01 }
    },
    'voiture': {
      name: 'Amadou Bah',
      phone: '+224622345678',
      vehicle: 'Toyota Corolla blanche',
      distance: '1.8 km',
      eta: '6 minutes',
      location: { lat: parseFloat(latitude) + 0.008, lng: parseFloat(longitude) + 0.008 }
    }
  }
  
  return mockDrivers[vehicleType as keyof typeof mockDrivers] || mockDrivers['moto']
}

// Insertion réservation en base
async function createReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
  const point = `POINT(${longitude} ${latitude})`
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        client_phone: clientPhone,
        vehicle_type: vehicleType,
        pickup_location: point,
        status: 'accepted' // Simulation d'acceptation automatique
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Erreur Supabase: ${JSON.stringify(error)}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('❌ Erreur insertion réservation:', error)
    throw error
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log('\n🔔 ===== NOUVEAU WEBHOOK TWILIO =====')
  
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    
    // Extraction données Twilio
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = normalizePhone(from)
    const messageText = body.toLowerCase()
    
    console.log(`📱 Client: ${clientPhone}`)
    console.log(`💬 Message: "${body}" (normalisé: "${messageText}")`)
    console.log(`📍 GPS: ${latitude ? `${latitude}, ${longitude}` : 'non fourni'}`)
    console.log(`📝 FormData complète:`, Object.fromEntries(formData.entries()))
    
    cleanupSessions()
    
    let session = sessions.get(clientPhone)
    console.log(`🗂️ Session actuelle:`, session)
    
    let responseMessage = ''
    
    // ===== LOGIQUE PRINCIPALE DU CHATBOT =====
    
    if (messageText.includes('taxi') || messageText.includes('je veux un taxi')) {
      // 🔄 ÉTAPE 1: Demande de taxi (reset la session)
      session = {
        timestamp: Date.now(),
        step: 'waiting_vehicle'
      }
      sessions.set(clientPhone, session)
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('✅ ÉTAPE 1: Session initialisée, attente type de véhicule')
      
    } else if ((messageText === 'moto' || messageText === 'voiture') && session?.step === 'waiting_vehicle') {
      // 🔄 ÉTAPE 2: Choix du véhicule
      session.vehicle_type = messageText
      session.step = 'waiting_location'
      session.timestamp = Date.now()
      sessions.set(clientPhone, session)
      responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
      console.log(`✅ ÉTAPE 2: Véhicule "${messageText}" sélectionné, attente localisation`)
      
    } else if (latitude && longitude && session?.step === 'waiting_location' && session.vehicle_type) {
      // 🔄 ÉTAPE 3: Réception localisation + Traitement complet
      console.log(`✅ ÉTAPE 3: Localisation reçue, traitement en cours...`)
      
      session.step = 'processing'
      sessions.set(clientPhone, session)
      
      try {
        // 1. Insérer la réservation
        console.log('💾 Insertion réservation en base...')
        const reservation = await createReservation(clientPhone, session.vehicle_type, latitude, longitude)
        console.log('✅ Réservation créée:', reservation[0])
        
        // 2. Recherche conducteur le plus proche (simulation)
        console.log('🔍 Recherche du conducteur le plus proche...')
        const driver = findNearestDriver(session.vehicle_type, latitude, longitude)
        console.log('✅ Conducteur trouvé:', driver)
        
        // 3. Message de confirmation avec infos conducteur
        responseMessage = `🎉 Votre réservation de taxi ${session.vehicle_type} est confirmée !

🚗 Conducteur assigné:
👤 ${driver.name}
📞 ${driver.phone}
🚙 ${driver.vehicle}
📍 Distance: ${driver.distance}
⏱️ Arrivée estimée: ${driver.eta}

Le conducteur va vous contacter. Bon voyage ! 🛣️`
        
        // 4. Suppression de la session (réservation terminée)
        sessions.delete(clientPhone)
        console.log('✅ Réservation complète, session supprimée')
        
      } catch (error) {
        console.error('❌ Erreur lors du traitement:', error)
        responseMessage = "Désolé, une erreur est survenue. Veuillez réécrire 'taxi' pour recommencer."
        sessions.delete(clientPhone) // Nettoyer session corrompue
      }
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      // Cas où on reçoit moto/voiture mais pas dans le bon état
      if (!session) {
        responseMessage = "Pour réserver un taxi, veuillez d'abord écrire 'taxi'."
        console.log('⚠️ Type de véhicule reçu sans session active')
      } else if (session.step !== 'waiting_vehicle') {
        responseMessage = "Veuillez suivre les étapes dans l'ordre. Écrivez 'taxi' pour recommencer."
        console.log(`⚠️ Type de véhicule reçu à l'étape ${session.step}`)
      }
      
    } else {
      // Message par défaut + aide selon le contexte
      if (session?.step === 'waiting_vehicle') {
        responseMessage = "Veuillez choisir 'moto' ou 'voiture' uniquement."
      } else if (session?.step === 'waiting_location') {
        responseMessage = "Veuillez partager votre position GPS en utilisant l'icône 📎 → Localisation."
      } else {
        responseMessage = "Bienvenue chez LokoTaxi ! 🚕\nPour réserver un taxi, écrivez 'taxi'."
      }
      console.log(`ℹ️ Message par défaut ou aide contextuelle`)
    }
    
    // Affichage état des sessions actives
    console.log(`📊 Sessions actives: ${sessions.size}`)
    for (const [phone, sess] of sessions.entries()) {
      console.log(`  📱 ${phone}: ${sess.step} | ${sess.vehicle_type || 'pas de véhicule'}`)
    }
    
    // Génération réponse TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 RÉPONSE: ${responseMessage}`)
    console.log('🏁 ===== FIN WEBHOOK =====\n')
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service temporairement indisponible. Écrivez 'taxi' pour réessayer.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})