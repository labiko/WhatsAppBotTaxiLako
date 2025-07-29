import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Supabase via variables d'environnement
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'

// Stockage temporaire des sessions en mémoire
const sessions = new Map<string, { vehicle_type?: string; timestamp: number }>()

// Nettoyage des sessions expirées (après 30 minutes)
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
  if (!response.ok) {
    throw new Error(`Erreur Supabase: ${JSON.stringify(result)}`)
  }
  return result
}

serve(async (req) => {
  // Headers CORS pour les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Nouvelle requête reçue:', req.method, req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Parse le body de la requête
    const formData = await req.formData()
    console.log('FormData reçue:', Object.fromEntries(formData.entries()))
    
    // Extraction des données Twilio
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString().toLowerCase().trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    const mediaUrl = formData.get('MediaUrl0')?.toString() || ''
    
    // Extraction du numéro de téléphone (enlever "whatsapp:")
    const clientPhone = from.replace('whatsapp:', '')
    
    // Nettoyage périodique des sessions
    cleanupSessions()
    
    let responseMessage = ''
    
    console.log(`Message reçu de ${clientPhone}: "${body}"`)
    
    // Logique principale du chatbot
    if (body.includes('taxi') || body.includes('je veux un taxi')) {
      // Étape 1: Le client demande un taxi
      sessions.set(clientPhone, { timestamp: Date.now() })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log(`Session créée pour ${clientPhone}`)
    }
    else if (body === 'moto' || body === 'voiture') {
      // Étape 2: Le client choisit le type de véhicule
      const session = sessions.get(clientPhone)
      if (session) {
        sessions.set(clientPhone, { 
          vehicle_type: body, 
          timestamp: Date.now() 
        })
        responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
        console.log(`Véhicule sélectionné pour ${clientPhone}: ${body}`)
      } else {
        responseMessage = "Pour réserver un taxi, veuillez écrire 'taxi' d'abord."
      }
    }
    else if (latitude && longitude) {
      // Étape 3: Le client partage sa localisation
      const session = sessions.get(clientPhone)
      if (session && session.vehicle_type) {
        console.log(`Tentative d'insertion pour ${clientPhone}: ${session.vehicle_type} à ${latitude}, ${longitude}`)
        
        try {
          // Insertion de la réservation via API REST
          const result = await insertReservation(clientPhone, session.vehicle_type, latitude, longitude)
          
          console.log('Réservation créée avec succès:', result)
          responseMessage = `Votre demande de taxi ${session.vehicle_type} a été enregistrée. Un chauffeur vous contactera bientôt.`
          sessions.delete(clientPhone) // Suppression de la session après réservation
        } catch (error) {
          console.error('Erreur lors de l\'insertion:', error)
          responseMessage = "Désolé, une erreur s'est produite lors de l'enregistrement. Veuillez réessayer."
        }
      } else {
        responseMessage = "Pour réserver un taxi, veuillez d'abord écrire 'taxi' et suivre les instructions."
      }
    }
    else if (mediaUrl) {
      // Gestion future des messages vocaux
      responseMessage = "Les messages vocaux seront bientôt disponibles. Pour le moment, veuillez écrire 'taxi' pour réserver."
      console.log(`Message vocal reçu: ${mediaUrl}`)
    }
    else if (body.trim() === '') {
      responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
    }
    else {
      // Message par défaut pour commandes non reconnues
      responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
      console.log(`Commande non reconnue: "${body}"`)
    }
    
    // Formatage de la réponse TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`Réponse TwiML envoyée: ${responseMessage}`)
    
    return new Response(twiml, {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      },
    })
    
  } catch (error) {
    console.error('Erreur globale dans la fonction:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service temporairement indisponible. Veuillez réessayer dans quelques minutes.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200, // Toujours 200 pour éviter les retry de Twilio
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      },
    })
  }
})