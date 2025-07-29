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

// Test simple de connexion à la base
async function testDatabaseConnection() {
  try {
    console.log('🔄 Test connexion base de données...')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    console.log(`📡 Statut connexion: ${response.status}`)
    if (response.ok) {
      console.log('✅ Connexion base OK')
      return true
    } else {
      const error = await response.text()
      console.log('❌ Erreur connexion:', error)
      return false
    }
  } catch (error) {
    console.log('❌ Exception connexion:', error)
    return false
  }
}

// Récupérer les conducteurs disponibles (requête simple)
async function getAvailableDrivers(vehicleType: string) {
  try {
    console.log(`🔍 Recherche conducteurs ${vehicleType}...`)
    
    // Requête directe sur la table conducteurs (pas de vue)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/conducteurs?vehicle_type=eq.${vehicleType}&statut=eq.disponible&actif=eq.true&select=*`, 
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log(`📡 Statut requête conducteurs: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erreur: ${response.status} - ${errorText}`)
      return []
    }
    
    const conducteurs = await response.json()
    console.log(`📋 ${conducteurs.length} conducteur(s) ${vehicleType} trouvé(s)`)
    
    // Log de chaque conducteur trouvé
    conducteurs.forEach((c: any, index: number) => {
      console.log(`   ${index + 1}. ${c.prenom} ${c.nom} - ${c.vehicle_marque} ${c.vehicle_modele}`)
    })
    
    return conducteurs.map((c: any) => ({
      id: c.id,
      name: `${c.prenom} ${c.nom}`,
      phone: c.telephone,
      vehicle: `${c.vehicle_marque} ${c.vehicle_modele} ${c.vehicle_couleur}`,
      plaque: c.vehicle_plaque,
      rating: c.note_moyenne || 5.0,
      trips: c.nombre_courses || 0,
      // Extraction des coordonnées depuis la géométrie PostGIS
      lat: extractLatFromPostGIS(c.position_actuelle),
      lng: extractLngFromPostGIS(c.position_actuelle)
    }))
  } catch (error) {
    console.error('❌ Exception récupération conducteurs:', error)
    return []
  }
}

// Extraire latitude depuis format PostGIS
function extractLatFromPostGIS(geom: any): number {
  if (!geom || !geom.coordinates) {
    console.log('⚠️ Pas de coordonnées PostGIS')
    return 48.7261 // Fallback Moissy-Cramayel
  }
  return geom.coordinates[1] // latitude = coordonnée Y
}

// Extraire longitude depuis format PostGIS
function extractLngFromPostGIS(geom: any): number {
  if (!geom || !geom.coordinates) {
    console.log('⚠️ Pas de coordonnées PostGIS')
    return 2.6062 // Fallback Moissy-Cramayel
  }
  return geom.coordinates[0] // longitude = coordonnée X
}

// Trouver le conducteur le plus proche
async function findNearestDriver(vehicleType: string, clientLat: number, clientLng: number) {
  console.log(`🎯 Recherche conducteur ${vehicleType} près de ${clientLat}, ${clientLng}`)
  
  const drivers = await getAvailableDrivers(vehicleType)
  
  if (drivers.length === 0) {
    console.log('❌ Aucun conducteur disponible')
    throw new Error(`Aucun conducteur ${vehicleType} disponible`)
  }
  
  let nearestDriver = null
  let minDistance = Infinity
  
  console.log('📐 Calcul distances...')
  for (const driver of drivers) {
    const distance = calculateDistance(clientLat, clientLng, driver.lat, driver.lng)
    console.log(`   ${driver.name}: ${distance.toFixed(1)} km`)
    
    if (distance < minDistance) {
      minDistance = distance
      nearestDriver = { ...driver, distance: minDistance }
    }
  }
  
  if (nearestDriver) {
    const distanceKm = nearestDriver.distance.toFixed(1)
    const eta = Math.max(5, Math.round(nearestDriver.distance * 3)) // 3 min/km
    
    console.log(`🏆 Sélectionné: ${nearestDriver.name} à ${distanceKm} km`)
    
    return {
      id: nearestDriver.id,
      name: nearestDriver.name,
      phone: nearestDriver.phone,
      vehicle: nearestDriver.vehicle,
      plaque: nearestDriver.plaque,
      distance: `${distanceKm} km`,
      eta: `${eta} minutes`,
      rating: nearestDriver.rating
    }
  }
  
  throw new Error('Erreur calcul distance')
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Test connexion au début
    const dbConnected = await testDatabaseConnection()
    console.log(`🗄️ Base connectée: ${dbConnected ? 'OUI' : 'NON'}`)
    
    const formData = await req.formData()
    
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.trim() || ''
    const latitude = formData.get('Latitude')?.toString() || ''
    const longitude = formData.get('Longitude')?.toString() || ''
    
    const clientPhone = normalizePhone(from)
    const messageText = body.toLowerCase()
    
    console.log(`📱 ${clientPhone} | 💬 "${body}" | 📍 ${latitude ? `${latitude},${longitude}` : 'non'}`)
    
    let responseMessage = ''
    
    // === LOGIQUE SIMPLE ===
    if (messageText.includes('taxi')) {
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('🆕 Demande taxi')
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      if (!dbConnected) {
        responseMessage = `Erreur de connexion à la base de données.
        
Vérifiez que la table 'conducteurs' existe dans Supabase.
Pour recommencer: écrivez 'taxi'`
      } else {
        try {
          const driversCount = (await getAvailableDrivers(messageText)).length
          
          if (driversCount > 0) {
            responseMessage = `Parfait ! ${messageText} sélectionné.
            
${driversCount} conducteur(s) disponible(s).

Partagez votre position (📎 → Localisation).`
          } else {
            responseMessage = `Aucun ${messageText} disponible.

Possible causes:
- Table 'conducteurs' vide  
- Aucun conducteur en statut 'disponible'
- Aucun conducteur de type '${messageText}'

Pour recommencer: écrivez 'taxi'`
          }
          
          console.log(`🚗 ${messageText}: ${driversCount} disponible(s)`)
        } catch (error) {
          console.error('❌ Erreur:', error)
          responseMessage = `Erreur: ${error.message}

Pour recommencer: écrivez 'taxi'`
        }
      }
      
    } else if (latitude && longitude) {
      console.log('📍 Localisation reçue')
      
      const clientLat = parseFloat(latitude)
      const clientLng = parseFloat(longitude)
      
      try {
        // Tester avec 'moto' par défaut
        const driver = await findNearestDriver('moto', clientLat, clientLng)
        
        responseMessage = `🎉 Conducteur trouvé !

🚗 ${driver.name}
📞 ${driver.phone}
🚙 ${driver.vehicle}
🔢 ${driver.plaque}
⭐ ${driver.rating}/5
📍 ${driver.distance}
⏱️ ${driver.eta}

Le conducteur va vous appeler !

🚕 Nouveau taxi: écrivez 'taxi'`

        console.log(`✅ Attribution: ${driver.name} à ${driver.distance}`)
      } catch (error) {
        console.error('💥 Erreur attribution:', error)
        responseMessage = `Aucun conducteur disponible.

${error.message}

Pour recommencer: écrivez 'taxi'`
      }
      
    } else {
      responseMessage = `Bienvenue chez LokoTaxi ! 🚕

1️⃣ Écrivez 'taxi'
2️⃣ Choisissez 'moto' ou 'voiture'
3️⃣ Partagez votre position

Commencez par 'taxi' !`
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 Réponse: ${responseMessage.substring(0, 80)}...`)
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 Erreur globale:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service temporairement indisponible. Réessayez avec 'taxi'.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})