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

// Sessions avec stockage persistant dans une Map globale
const sessions = new Map<string, { vehicle_type?: string; timestamp: number; step: string }>()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

const cleanupSessions = () => {
  const now = Date.now()
  for (const [phone, session] of sessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessions.delete(phone)
      console.log(`🗑️ Session expirée supprimée: ${phone}`)
    }
  }
}

// Normaliser le numéro de téléphone
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

// Insertion réservation
async function insertReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string) {
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
        status: 'pending'
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Erreur Supabase:', response.status, result)
      return { success: false, error: result }
    }
    
    return { success: true, data: result }
  } catch (error) {
    console.error('❌ Erreur réseau:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log(`\n=== 🔔 NOUVEAU WEBHOOK ===`)
  console.log(`Méthode: ${req.method}`)
  console.log(`URL: ${req.url}`)
  
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    console.log('✅ Requête OPTIONS - retour CORS')
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    console.log(`❌ Méthode ${req.method} non supportée`)
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    
    // Extraction et normalisation des données
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.toLowerCase().trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = normalizePhoneNumber(from)
    
    if (!clientPhone) {
      console.log('❌ Numéro de téléphone manquant')
      return new Response('Missing phone number', { status: 400, headers: corsHeaders })
    }
    
    console.log(`📱 Client: ${clientPhone}`)
    console.log(`💬 Message: "${body}"`)
    console.log(`📍 Coordonnées: ${latitude ? `${latitude}, ${longitude}` : 'aucune'}`)
    
    cleanupSessions()
    
    // Récupérer ou créer la session
    let session = sessions.get(clientPhone)
    console.log(`🔍 Session actuelle:`, session)
    
    let responseMessage = ''
    
    // === LOGIQUE CHATBOT AVEC ÉTAPES ===
    if (body.includes('taxi') || body.includes('je veux un taxi')) {
      // ÉTAPE 1: Nouvelle demande de taxi (peut réinitialiser)
      session = { timestamp: Date.now(), step: 'waiting_vehicle_type' }
      sessions.set(clientPhone, session)
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log(`✅ ÉTAPE 1: Nouvelle session créée, attente du type de véhicule`)
      
    } else if ((body === 'moto' || body === 'voiture') && session?.step === 'waiting_vehicle_type') {
      // ÉTAPE 2: Choix du véhicule (seulement si on attend le type)
      session.vehicle_type = body
      session.step = 'waiting_location'
      session.timestamp = Date.now()
      sessions.set(clientPhone, session)
      responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
      console.log(`✅ ÉTAPE 2: Véhicule sélectionné (${body}), attente de la localisation`)
      
    } else if (latitude && longitude && session?.step === 'waiting_location' && session.vehicle_type) {
      // ÉTAPE 3: Réception de la localisation
      console.log(`✅ ÉTAPE 3: Localisation reçue, insertion en cours...`)
      
      const result = await insertReservation(clientPhone, session.vehicle_type, latitude, longitude)
      
      if (result.success) {
        responseMessage = `Votre demande de taxi ${session.vehicle_type} a été enregistrée. Un chauffeur vous contactera bientôt. 🚗`
        sessions.delete(clientPhone) // Supprimer la session complétée
        console.log(`✅ Réservation créée avec succès et session supprimée`)
      } else {
        responseMessage = "Erreur lors de l'enregistrement. Veuillez réécrire 'taxi' pour recommencer."
        sessions.delete(clientPhone) // Supprimer session corrompue
        console.error(`❌ Erreur insertion, session supprimée:`, result.error)
      }
      
    } else {
      // Message par défaut ou état incohérent
      if (session) {
        console.log(`⚠️ État incohérent - Session: ${JSON.stringify(session)}, Message: "${body}"`)
        if (session.step === 'waiting_vehicle_type') {
          responseMessage = "Veuillez répondre par 'moto' ou 'voiture' uniquement."
        } else if (session.step === 'waiting_location') {
          responseMessage = "Veuillez partager votre localisation en cliquant sur l'icône (📎) puis 'Localisation'."
        } else {
          responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
        }
      } else {
        responseMessage = "Bienvenue chez LokoTaxi ! Pour réserver un taxi, écrivez 'taxi'."
        console.log(`ℹ️ Pas de session, message de bienvenue`)
      }
    }
    
    // Afficher l'état des sessions actives
    console.log(`📊 Sessions actives: ${sessions.size}`)
    for (const [phone, sess] of sessions.entries()) {
      console.log(`  ${phone}: ${sess.step} (${sess.vehicle_type || 'pas de véhicule'})`)
    }
    
    // Réponse TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 Réponse: ${responseMessage}`)
    console.log(`=== ✅ FIN WEBHOOK ===\n`)
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 ERREUR GLOBALE:', error)
    
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