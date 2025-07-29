import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M'

const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

// Version simplifiée avec log complet
async function testDatabaseConnection() {
  try {
    console.log('🔄 Test connexion base...')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    console.log('📡 Statut réponse DB:', response.status)
    if (response.ok) {
      console.log('✅ Connexion DB OK')
      return true
    } else {
      const error = await response.text()
      console.log('❌ Erreur DB:', error)
      return false
    }
  } catch (error) {
    console.log('❌ Exception DB:', error)
    return false
  }
}

async function getSession(clientPhone: string) {
  try {
    console.log(`🔍 Recherche session pour: ${clientPhone}`)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?client_phone=eq.${encodeURIComponent(clientPhone)}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    console.log(`📡 Status getSession: ${response.status}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ Erreur getSession:', error)
      return null
    }
    
    const sessions = await response.json()
    console.log(`📋 Sessions trouvées:`, sessions)
    return sessions.length > 0 ? sessions[0] : null
  } catch (error) {
    console.log('❌ Exception getSession:', error)
    return null
  }
}

async function upsertSession(clientPhone: string, data: { vehicle_type?: string; step: string }) {
  try {
    console.log(`💾 Upsert session pour ${clientPhone}:`, data)
    
    // D'abord, essayons de supprimer l'ancienne session
    await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?client_phone=eq.${encodeURIComponent(clientPhone)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    // Puis insérer la nouvelle
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_phone: clientPhone,
        vehicle_type: data.vehicle_type,
        step: data.step,
        updated_at: new Date().toISOString()
      })
    })
    
    console.log(`📡 Status upsert: ${response.status}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ Erreur upsert:', error)
      return false
    }
    
    console.log('✅ Session mise à jour avec succès')
    return true
  } catch (error) {
    console.log('❌ Exception upsert:', error)
    return false
  }
}

serve(async (req: Request): Promise<Response> => {
  console.log('\n🚨 === WEBHOOK DEBUG VERSION ===')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Test connexion DB
    const dbOk = await testDatabaseConnection()
    console.log(`🗄️ Base de données: ${dbOk ? 'OK' : 'KO'}`)
    
    const formData = await req.formData()
    
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = normalizePhone(from)
    const messageText = body.toLowerCase()
    
    console.log(`📱 Client: "${clientPhone}"`)
    console.log(`💬 Message: "${body}" → normalisé: "${messageText}"`)
    console.log(`📍 GPS: ${latitude ? `${latitude}, ${longitude}` : 'non fourni'}`)
    console.log(`🗂️ FormData complète:`, Object.fromEntries(formData.entries()))
    
    let responseMessage = ''
    
    // Test simple sans base de données d'abord
    if (messageText.includes('taxi')) {
      console.log('🎯 Message "taxi" détecté')
      
      if (dbOk) {
        const success = await upsertSession(clientPhone, { step: 'waiting_vehicle' })
        console.log(`💾 Création session: ${success ? 'OK' : 'KO'}`)
      }
      
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      console.log(`🚗 Type véhicule détecté: "${messageText}"`)
      
      let canProceed = true
      
      if (dbOk) {
        const session = await getSession(clientPhone)
        console.log(`📋 Session actuelle:`, session)
        
        if (session?.step === 'waiting_vehicle') {
          const success = await upsertSession(clientPhone, { 
            vehicle_type: messageText, 
            step: 'waiting_location' 
          })
          console.log(`💾 Mise à jour session: ${success ? 'OK' : 'KO'}`)
        } else {
          console.log('❌ Session invalide pour cette étape')
          canProceed = false
        }
      }
      
      if (canProceed) {
        responseMessage = "Merci. Veuillez partager votre position en cliquant sur l'icône (📎) puis 'Localisation'."
      } else {
        responseMessage = "Pour réserver, écrivez d'abord 'taxi'."
      }
      
    } else if (latitude && longitude) {
      console.log(`📍 Localisation reçue: ${latitude}, ${longitude}`)
      responseMessage = "Position reçue ! (Fonction de réservation en test)"
      
    } else {
      console.log(`❓ Message non reconnu: "${messageText}"`)
      responseMessage = "Bienvenue chez LokoTaxi ! 🚕\nÉcrivez 'taxi' pour commencer."
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 RÉPONSE FINALE: "${responseMessage}"`)
    console.log('=== FIN DEBUG WEBHOOK ===\n')
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.log('💥 ERREUR CRITIQUE:', error)
    console.log('Stack:', error.stack)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Erreur technique. Réessayez avec 'taxi'.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})