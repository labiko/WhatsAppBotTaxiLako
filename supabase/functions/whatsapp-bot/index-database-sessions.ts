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

// Normalisation numéro
const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

// Récupérer session depuis la base
async function getSession(clientPhone: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?client_phone=eq.${clientPhone}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    const sessions = await response.json()
    return sessions.length > 0 ? sessions[0] : null
  } catch (error) {
    console.error('❌ Erreur récupération session:', error)
    return null
  }
}

// Créer ou mettre à jour session
async function updateSession(clientPhone: string, data: { vehicle_type?: string; step: string }) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        client_phone: clientPhone,
        vehicle_type: data.vehicle_type,
        step: data.step,
        updated_at: new Date().toISOString()
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('❌ Erreur mise à jour session:', error)
    return false
  }
}

// Supprimer session
async function deleteSession(clientPhone: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?client_phone=eq.${clientPhone}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
  } catch (error) {
    console.error('❌ Erreur suppression session:', error)
  }
}

// Simulation conducteur
const findNearestDriver = (vehicleType: string) => {
  const mockDrivers = {
    'moto': {
      name: 'Mamadou Diallo',
      phone: '+224621234567',
      vehicle: 'Moto Yamaha rouge',
      distance: '2.3 km',
      eta: '8 minutes'
    },
    'voiture': {
      name: 'Amadou Bah',
      phone: '+224622345678',
      vehicle: 'Toyota Corolla blanche',
      distance: '1.8 km',
      eta: '6 minutes'
    }
  }
  
  return mockDrivers[vehicleType as keyof typeof mockDrivers] || mockDrivers['moto']
}

// Créer réservation
async function createReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
  const point = `POINT(${longitude} ${latitude})`
  
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
      status: 'accepted'
    })
  })
  
  if (!response.ok) {
    throw new Error('Erreur création réservation')
  }
  
  return await response.json()
}

serve(async (req: Request): Promise<Response> => {
  console.log('\n🚀 === WEBHOOK TWILIO REÇU ===')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = normalizePhone(from)
    const messageText = body.toLowerCase()
    
    console.log(`📱 Client: ${clientPhone}`)
    console.log(`💬 Message: "${body}"`)
    console.log(`📍 GPS: ${latitude ? `${latitude}, ${longitude}` : 'non fourni'}`)
    
    // Récupération session depuis la base
    let session = await getSession(clientPhone)
    console.log(`🔍 Session DB:`, session)
    
    let responseMessage = ''
    
    // === LOGIQUE PRINCIPALE ===
    
    if (messageText.includes('taxi')) {
      // ÉTAPE 1: Nouvelle demande
      await updateSession(clientPhone, { step: 'waiting_vehicle' })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('✅ ÉTAPE 1: Session créée - attente véhicule')
      
    } else if ((messageText === 'moto' || messageText === 'voiture')) {
      if (session?.step === 'waiting_vehicle') {
        // ÉTAPE 2: Type de véhicule reçu
        await updateSession(clientPhone, { 
          vehicle_type: messageText, 
          step: 'waiting_location' 
        })
        responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
        console.log(`✅ ÉTAPE 2: Véhicule "${messageText}" - attente localisation`)
      } else {
        responseMessage = "Pour réserver, écrivez d'abord 'taxi'."
        console.log('❌ Type véhicule reçu sans session valide')
      }
      
    } else if (latitude && longitude) {
      if (session?.step === 'waiting_location' && session.vehicle_type) {
        // ÉTAPE 3: Localisation + finalisation
        console.log('✅ ÉTAPE 3: Localisation reçue - traitement...')
        
        try {
          // Création réservation
          const reservation = await createReservation(clientPhone, session.vehicle_type, latitude, longitude)
          console.log('📝 Réservation créée:', reservation[0]?.id)
          
          // Recherche conducteur
          const driver = findNearestDriver(session.vehicle_type)
          console.log('🔍 Conducteur assigné:', driver.name)
          
          responseMessage = `🎉 Réservation confirmée !

🚗 Conducteur: ${driver.name}
📞 Téléphone: ${driver.phone}
🚙 Véhicule: ${driver.vehicle}
📍 Distance: ${driver.distance}
⏱️ Arrivée: ${driver.eta}

Le conducteur va vous appeler. Bon voyage ! 🛣️`
          
          // Suppression session
          await deleteSession(clientPhone)
          console.log('✅ Réservation terminée - session supprimée')
          
        } catch (error) {
          console.error('❌ Erreur traitement:', error)
          responseMessage = "Erreur technique. Écrivez 'taxi' pour recommencer."
          await deleteSession(clientPhone)
        }
      } else {
        responseMessage = "Veuillez d'abord écrire 'taxi' puis choisir un type de véhicule."
        console.log('❌ Localisation reçue sans session valide')
      }
      
    } else {
      // Messages d'aide selon le contexte
      if (session?.step === 'waiting_vehicle') {
        responseMessage = "Veuillez répondre 'moto' ou 'voiture' uniquement."
      } else if (session?.step === 'waiting_location') {
        responseMessage = "Veuillez partager votre position GPS (📎 → Localisation)."
      } else {
        responseMessage = "Bienvenue chez LokoTaxi ! 🚕\nÉcrivez 'taxi' pour réserver."
      }
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 RÉPONSE: ${responseMessage}`)
    console.log('=== FIN WEBHOOK ===\n')
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 ERREUR CRITIQUE:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service indisponible. Écrivez 'taxi' pour réessayer.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})