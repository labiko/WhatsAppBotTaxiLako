import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Headers CORS complets pour webhooks
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'false'
}

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'

// Sessions en mémoire
const sessions = new Map<string, { vehicle_type?: string; timestamp: number }>()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

const cleanupSessions = () => {
  const now = Date.now()
  for (const [phone, session] of sessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessions.delete(phone)
    }
  }
}

// Insertion réservation avec bypass RLS
async function insertReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
  const point = `POINT(${longitude} ${latitude})`
  
  try {
    // Utilisation de la clé service_role qui bypass RLS automatiquement
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
        status: 'pending'
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('Erreur Supabase:', response.status, result)
      return { success: false, error: result }
    }
    
    return { success: true, data: result }
  } catch (error) {
    console.error('Erreur réseau:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log(`=== WEBHOOK RECU ===`)
  console.log(`Méthode: ${req.method}`)
  console.log(`URL: ${req.url}`)
  console.log(`Headers:`, Object.fromEntries(req.headers.entries()))
  
  // Gestion CORS - toujours en premier
  if (req.method === 'OPTIONS') {
    console.log('Requête OPTIONS - retour CORS')
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }
  
  // Vérification méthode
  if (req.method !== 'POST') {
    console.log(`Méthode ${req.method} non supportée`)
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Parse le body
    let formData: FormData
    try {
      const contentType = req.headers.get('content-type') || ''
      console.log(`Content-Type: ${contentType}`)
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        formData = await req.formData()
        console.log('FormData parsée avec succès')
      } else {
        console.log('Content-Type non supporté, tentative de parsing FormData...')
        formData = await req.formData()
      }
    } catch (e) {
      console.error('Erreur parsing body:', e)
      return new Response('Invalid request format', { 
        status: 400, 
        headers: corsHeaders 
      })
    }
    
    // Log des données reçues
    console.log('Données FormData:')
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`)
    }
    
    // Extraction des données Twilio
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.toLowerCase().trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    const mediaUrl = formData.get('MediaUrl0')?.toString() || ''
    
    const clientPhone = from.replace('whatsapp:', '').trim()
    
    if (!clientPhone) {
      console.log('Numéro de téléphone manquant')
      return new Response('Missing phone number', { 
        status: 400, 
        headers: corsHeaders 
      })
    }
    
    console.log(`📱 Client: ${clientPhone}`)
    console.log(`💬 Message: "${body}"`)
    console.log(`📍 Coords: ${latitude ? `${latitude}, ${longitude}` : 'aucune'}`)
    
    cleanupSessions()
    
    let responseMessage = ''
    
    // === LOGIQUE CHATBOT ===
    if (body.includes('taxi') || body.includes('je veux un taxi')) {
      // Étape 1: Demande de taxi
      sessions.set(clientPhone, { timestamp: Date.now() })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log(`✅ Session créée pour ${clientPhone}`)
      
    } else if (body === 'moto' || body === 'voiture') {
      // Étape 2: Choix du véhicule
      const session = sessions.get(clientPhone)
      if (session) {
        sessions.set(clientPhone, { 
          vehicle_type: body, 
          timestamp: Date.now() 
        })
        responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
        console.log(`🚗 Véhicule choisi: ${body}`)
      } else {
        responseMessage = "Pour réserver un taxi, veuillez écrire 'taxi' d'abord."
        console.log('⚠️ Aucune session trouvée')
      }
      
    } else if (latitude && longitude) {
      // Étape 3: Réception localisation
      const session = sessions.get(clientPhone)
      if (session && session.vehicle_type) {
        console.log(`🎯 Insertion réservation: ${session.vehicle_type} à [${latitude}, ${longitude}]`)
        
        const result = await insertReservation(clientPhone, session.vehicle_type, latitude, longitude)
        
        if (result.success) {
          responseMessage = `Votre demande de taxi ${session.vehicle_type} a été enregistrée. Un chauffeur vous contactera bientôt.`
          sessions.delete(clientPhone)
          console.log('✅ Réservation créée avec succès')
          console.log('Données insérées:', result.data)
        } else {
          responseMessage = "Erreur lors de l'enregistrement. Veuillez réessayer."
          console.error('❌ Erreur insertion:', result.error)
        }
      } else {
        responseMessage = "Pour réserver, écrivez d'abord 'taxi' et suivez les instructions."
        console.log('⚠️ Session invalide pour localisation')
      }
      
    } else if (mediaUrl) {
      responseMessage = "Les messages vocaux seront bientôt disponibles. Pour réserver, écrivez 'taxi'."
      console.log(`🎤 Message vocal reçu: ${mediaUrl}`)
      
    } else {
      responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
      console.log(`❓ Message non reconnu: "${body}"`)
    }
    
    // === RÉPONSE TWIML ===
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 Réponse TwiML: ${responseMessage}`)
    console.log(`=== FIN WEBHOOK ===\n`)
    
    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    })
    
  } catch (error) {
    console.error('💥 ERREUR GLOBALE:', error)
    console.error('Stack:', error.stack)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service indisponible. Réessayez dans quelques minutes.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200, // 200 pour éviter les retry Twilio
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml; charset=utf-8'
      }
    })
  }
})