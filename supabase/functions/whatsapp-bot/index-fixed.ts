import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialisation du client Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

serve(async (req) => {
  // Headers CORS pour les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse le body de la requête
    const formData = await req.formData()
    
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
    
    // Logique principale du chatbot
    if (body.includes('taxi') || body.includes('je veux un taxi')) {
      // Étape 1: Le client demande un taxi
      sessions.set(clientPhone, { timestamp: Date.now() })
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
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
      } else {
        responseMessage = "Pour réserver un taxi, veuillez écrire 'taxi' d'abord."
      }
    }
    else if (latitude && longitude) {
      // Étape 3: Le client partage sa localisation
      const session = sessions.get(clientPhone)
      if (session && session.vehicle_type) {
        // Création du point géographique PostGIS
        const point = `POINT(${longitude} ${latitude})`
        
        // Insertion de la réservation dans Supabase
        const { data, error } = await supabase
          .from('reservations')
          .insert([
            {
              client_phone: clientPhone,
              vehicle_type: session.vehicle_type,
              pickup_location: point,
              status: 'pending'
            }
          ])
          .select()
        
        if (error) {
          console.error('Erreur lors de l\'insertion:', error)
          responseMessage = "Désolé, une erreur s'est produite. Veuillez réessayer."
        } else {
          responseMessage = `Votre demande de taxi ${session.vehicle_type} a été enregistrée. Un chauffeur vous contactera bientôt.`
          sessions.delete(clientPhone) // Suppression de la session après réservation
        }
      } else {
        responseMessage = "Pour réserver un taxi, veuillez d'abord écrire 'taxi' et suivre les instructions."
      }
    }
    else if (mediaUrl) {
      // Gestion future des messages vocaux
      responseMessage = "Les messages vocaux seront bientôt disponibles. Pour le moment, veuillez écrire 'taxi' pour réserver."
    }
    else {
      // Message par défaut
      responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
    }
    
    // Formatage de la réponse TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    return new Response(twiml, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      },
    })
    
  } catch (error) {
    console.error('Erreur:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Désolé, une erreur s'est produite. Veuillez réessayer.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/xml'
      },
    })
  }
})