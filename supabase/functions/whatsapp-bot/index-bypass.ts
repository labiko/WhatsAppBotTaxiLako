import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U'

// Stockage temporaire des sessions en mémoire
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

// Fonction pour insérer une réservation via API REST
async function insertReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
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
      status: 'pending'
    })
  })
  
  const result = await response.json()
  return { success: response.ok, data: result }
}

serve(async (req) => {
  // Ajout automatique du header d'autorisation pour bypasser l'auth
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  
  if (!authHeader) {
    console.log('Ajout automatique du header d\'autorisation pour Twilio')
    const newHeaders = new Headers(req.headers)
    newHeaders.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    
    req = new Request(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.method !== 'GET' ? req.body : undefined
    })
  }
  
  // Headers CORS pour les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== DEBUT REQUETE WEBHOOK ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    // Parse le body de la requête
    let formData
    try {
      formData = await req.formData()
      console.log('FormData parsée avec succès')
    } catch (e) {
      console.log('Erreur parsing FormData:', e)
      return new Response('Invalid request format', { status: 400, headers: corsHeaders })
    }
    
    // Extraction des données Twilio
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString().toLowerCase().trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = from.replace('whatsapp:', '')
    
    console.log(`Client: ${clientPhone}, Message: "${body}"`)
    
    cleanupSessions()
    
    let responseMessage = ''
    
    // Logique du chatbot
    if (body.includes('taxi')) {
      sessions.set(clientPhone, { timestamp: Date.now() })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log(`Nouvelle session créée pour ${clientPhone}`)
    }
    else if (body === 'moto' || body === 'voiture') {
      const session = sessions.get(clientPhone)
      if (session) {
        sessions.set(clientPhone, { vehicle_type: body, timestamp: Date.now() })
        responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
        console.log(`Véhicule sélectionné: ${body}`)
      } else {
        responseMessage = "Pour réserver un taxi, veuillez écrire 'taxi' d'abord."
      }
    }
    else if (latitude && longitude) {
      const session = sessions.get(clientPhone)
      if (session && session.vehicle_type) {
        console.log(`Insertion réservation: ${session.vehicle_type} à ${latitude}, ${longitude}`)
        
        const result = await insertReservation(clientPhone, session.vehicle_type, latitude, longitude)
        
        if (result.success) {
          responseMessage = `Votre demande de taxi ${session.vehicle_type} a été enregistrée. Un chauffeur vous contactera bientôt.`
          sessions.delete(clientPhone)
          console.log('Réservation créée avec succès')
        } else {
          console.error('Erreur insertion:', result.data)
          responseMessage = "Erreur lors de l'enregistrement. Réessayez."
        }
      } else {
        responseMessage = "Pour réserver, écrivez d'abord 'taxi' et suivez les instructions."
      }
    }
    else {
      responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`Réponse: ${responseMessage}`)
    console.log('=== FIN REQUETE WEBHOOK ===')
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    })
    
  } catch (error) {
    console.error('ERREUR GLOBALE:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service indisponible. Réessayez plus tard.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    })
  }
})