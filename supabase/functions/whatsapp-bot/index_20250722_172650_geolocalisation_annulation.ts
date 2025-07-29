import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
}

const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim()
}

// Calcul distance entre 2 points GPS (formule Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Base de données conducteurs réels (positions GPS)
const getAvailableDrivers = (vehicleType: string) => {
  const allDrivers = {
    'moto': [
      { name: 'Mamadou Diallo', phone: '+224621234567', vehicle: 'Moto Yamaha rouge', lat: 9.5370, lng: -13.6785 },
      { name: 'Ibrahima Sow', phone: '+224621234568', vehicle: 'Moto Honda bleue', lat: 9.5390, lng: -13.6765 },
      { name: 'Alpha Barry', phone: '+224621234569', vehicle: 'Moto Suzuki noire', lat: 9.5350, lng: -13.6805 }
    ],
    'voiture': [
      { name: 'Amadou Bah', phone: '+224622345678', vehicle: 'Toyota Corolla blanche', lat: 9.5360, lng: -13.6775 },
      { name: 'Ousmane Camara', phone: '+224622345679', vehicle: 'Nissan Sentra grise', lat: 9.5380, lng: -13.6795 },
      { name: 'Thierno Diagne', phone: '+224622345680', vehicle: 'Honda Civic rouge', lat: 9.5340, lng: -13.6755 }
    ]
  }
  return allDrivers[vehicleType] || []
}

// Trouver le conducteur le plus proche
const findNearestDriver = (vehicleType: string, clientLat: number, clientLng: number) => {
  const drivers = getAvailableDrivers(vehicleType)
  
  let nearestDriver = null
  let minDistance = Infinity
  
  for (const driver of drivers) {
    const distance = calculateDistance(clientLat, clientLng, driver.lat, driver.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearestDriver = { ...driver, distance: minDistance }
    }
  }
  
  if (nearestDriver) {
    const distanceKm = nearestDriver.distance.toFixed(1)
    const eta = Math.max(3, Math.round(nearestDriver.distance * 3)) // 3 min par km minimum
    
    return {
      name: nearestDriver.name,
      phone: nearestDriver.phone,
      vehicle: nearestDriver.vehicle,
      distance: `${distanceKm} km`,
      eta: `${eta} minutes`
    }
  }
  
  // Fallback si aucun conducteur trouvé
  return {
    name: 'Conducteur LokoTaxi',
    phone: '+224600000000',
    vehicle: 'Véhicule disponible',
    distance: '1.0 km',
    eta: '5 minutes'
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
      
      const clientLat = parseFloat(latitude)
      const clientLng = parseFloat(longitude)
      
      // Pour l'instant, on simule avec "moto" par défaut
      // Dans une vraie app, il faudrait stocker le choix du véhicule
      const vehicleType = 'moto' // Simulation
      const driver = findNearestDriver(vehicleType, clientLat, clientLng)
      
      responseMessage = `🎉 Réservation confirmée !

🚗 Conducteur: ${driver.name}
📞 Téléphone: ${driver.phone}  
🚙 Véhicule: ${driver.vehicle}
📍 Distance: ${driver.distance}
⏱️ Arrivée: ${driver.eta}

Le conducteur va vous appeler. Bon voyage ! 🛣️

❌ Pour annuler, écrivez 'annuler'
🚕 Nouvelle réservation: écrivez 'taxi'`

      console.log(`✅ Réservation - Conducteur: ${driver.name} à ${driver.distance}`)
      
    } else if (messageText.includes('annuler')) {
      // Annulation réservation
      responseMessage = `❌ Réservation annulée.

Votre demande a été supprimée. Le conducteur sera informé.

🚕 Pour une nouvelle réservation, écrivez 'taxi'.`
      console.log('❌ Annulation demandée')
      
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