import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'

// Sessions en mémoire (simple et efficace)
const sessions = new Map<string, { vehicle_type?: string; timestamp: number }>()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

const cleanupSessions = () => {
  const now = Date.now()
  for (const [phone, session] of sessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessions.delete(phone)
    }
  }
}

// Simulation conducteur le plus proche
const findNearestDriver = (vehicleType: string) => {
  const drivers = {
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
  return drivers[vehicleType] || drivers['moto']
}

// Création réservation en base
async function createReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
  try {
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
      throw new Error(`Erreur ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Réservation créée:', data[0]?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Erreur réservation:', error)
    return { success: false, error }
  }
}

serve(async (req: Request): Promise<Response> => {
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
    
    console.log(`📱 ${clientPhone} | 💬 "${body}" | 📍 ${latitude ? `${latitude},${longitude}` : 'non'}`)
    
    cleanupSessions()
    
    let session = sessions.get(clientPhone)
    let responseMessage = ''
    
    // === LOGIQUE CHATBOT ===
    if (messageText.includes('taxi')) {
      // ÉTAPE 1: Demande taxi
      sessions.set(clientPhone, { timestamp: Date.now() })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('🆕 Nouvelle session taxi')
      
    } else if ((messageText === 'moto' || messageText === 'voiture') && session) {
      // ÉTAPE 2: Type de véhicule
      session.vehicle_type = messageText
      session.timestamp = Date.now()
      sessions.set(clientPhone, session)
      responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
      console.log(`🚗 Véhicule: ${messageText}`)
      
    } else if (latitude && longitude && session?.vehicle_type) {
      // ÉTAPE 3: Localisation + Finalisation
      console.log('📍 Traitement localisation...')
      
      try {
        // 1. Créer réservation
        const reservation = await createReservation(clientPhone, session.vehicle_type, latitude, longitude)
        
        if (reservation.success) {
          // 2. Trouver conducteur
          const driver = findNearestDriver(session.vehicle_type)
          
          // 3. Message complet de confirmation
          responseMessage = `🎉 Réservation confirmée !

🚗 Conducteur: ${driver.name}
📞 Téléphone: ${driver.phone}  
🚙 Véhicule: ${driver.vehicle}
📍 Distance: ${driver.distance}
⏱️ Arrivée: ${driver.eta}

Le conducteur va vous appeler. Bon voyage ! 🛣️`

          console.log(`✅ Réservation complète - Conducteur: ${driver.name}`)
        } else {
          responseMessage = "Erreur technique. Écrivez 'taxi' pour recommencer."
          console.log('❌ Échec création réservation')
        }
        
        sessions.delete(clientPhone) // Session terminée
        
      } catch (error) {
        console.error('💥 Erreur traitement:', error)
        responseMessage = "Service temporairement indisponible. Réessayez plus tard."
        sessions.delete(clientPhone)
      }
      
    } else {
      // Messages d'aide
      if (session?.vehicle_type && !latitude) {
        responseMessage = "Veuillez partager votre position GPS (📎 → Localisation)."
      } else if (session && !session.vehicle_type) {
        responseMessage = "Veuillez choisir 'moto' ou 'voiture' uniquement."
      } else {
        responseMessage = "Bienvenue chez LokoTaxi ! 🚕\nÉcrivez 'taxi' pour réserver."
      }
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 ${responseMessage.substring(0, 50)}...`)
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 Erreur globale:', error)
    
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