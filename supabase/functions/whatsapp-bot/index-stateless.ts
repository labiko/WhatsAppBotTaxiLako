import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
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
    
    let responseMessage = ''
    
    // === LOGIQUE CHATBOT STATELESS ===
    if (messageText.includes('taxi')) {
      // ÉTAPE 1: Demande taxi
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('🆕 Demande taxi')
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      // ÉTAPE 2: Type de véhicule
      responseMessage = `Parfait ! Vous avez choisi: ${messageText}
      
Maintenant, veuillez partager votre position en cliquant sur l'icône 📎 puis 'Localisation'.`
      console.log(`🚗 Véhicule: ${messageText}`)
      
    } else if (latitude && longitude) {
      // ÉTAPE 3: Localisation reçue
      console.log('📍 Traitement localisation...')
      
      // Pour l'instant, on simule avec "moto" par défaut
      // Dans une vraie app, il faudrait stocker le choix du véhicule
      const vehicleType = 'moto' // Simulation
      const driver = findNearestDriver(vehicleType)
      
      responseMessage = `🎉 Réservation confirmée !

🚗 Conducteur: ${driver.name}
📞 Téléphone: ${driver.phone}  
🚙 Véhicule: ${driver.vehicle}
📍 Distance: ${driver.distance}
⏱️ Arrivée: ${driver.eta}

Le conducteur va vous appeler. Bon voyage ! 🛣️

Pour une nouvelle réservation, écrivez 'taxi'.`

      console.log(`✅ Réservation - Conducteur: ${driver.name}`)
      
    } else {
      // Messages d'aide
      responseMessage = `Bienvenue chez LokoTaxi ! 🚕

Pour réserver:
1️⃣ Écrivez 'taxi'
2️⃣ Choisissez 'moto' ou 'voiture'  
3️⃣ Partagez votre position

Commencez maintenant en écrivant 'taxi' !`
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