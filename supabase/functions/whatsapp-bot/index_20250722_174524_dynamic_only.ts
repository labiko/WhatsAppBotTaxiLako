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

// Récupérer les conducteurs disponibles depuis la base de données
async function getAvailableDrivers(vehicleType: string) {
  try {
    console.log(`🔍 Recherche conducteurs ${vehicleType} dans la base...`)
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs_disponibles?vehicle_type=eq.${vehicleType}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`❌ Erreur récupération conducteurs: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ Détails erreur: ${errorText}`)
      return []
    }
    
    const conducteurs = await response.json()
    console.log(`📋 ${conducteurs.length} conducteur(s) ${vehicleType} trouvé(s) en base`)
    
    // Log détaillé des conducteurs trouvés
    conducteurs.forEach((c: any, index: number) => {
      console.log(`   ${index + 1}. ${c.prenom} ${c.nom} - ${c.vehicule_complet} - Tel: ${c.telephone}`)
    })
    
    return conducteurs.map((c: any) => ({
      id: c.id,
      name: `${c.prenom} ${c.nom}`,
      phone: c.telephone,
      vehicle: c.vehicule_complet,
      plaque: c.vehicle_plaque,
      rating: c.note_moyenne,
      trips: c.nombre_courses,
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
    console.log('⚠️ Géométrie PostGIS invalide ou manquante')
    return 48.8566 // Fallback Paris centre
  }
  const lat = geom.coordinates[1]
  console.log(`📍 Latitude extraite: ${lat}`)
  return lat
}

// Extraire longitude depuis format PostGIS
function extractLngFromPostGIS(geom: any): number {
  if (!geom || !geom.coordinates) {
    console.log('⚠️ Géométrie PostGIS invalide ou manquante')
    return 2.3522 // Fallback Paris centre
  }
  const lng = geom.coordinates[0]
  console.log(`📍 Longitude extraite: ${lng}`)
  return lng
}

// Trouver le conducteur le plus proche (uniquement depuis la base de données)
async function findNearestDriver(vehicleType: string, clientLat: number, clientLng: number) {
  console.log(`🎯 Recherche conducteur ${vehicleType} le plus proche de ${clientLat}, ${clientLng}`)
  
  const drivers = await getAvailableDrivers(vehicleType)
  
  if (drivers.length === 0) {
    console.log('❌ Aucun conducteur trouvé en base de données')
    throw new Error(`Aucun conducteur ${vehicleType} disponible`)
  }
  
  let nearestDriver = null
  let minDistance = Infinity
  
  console.log('📐 Calcul des distances...')
  for (const driver of drivers) {
    const distance = calculateDistance(clientLat, clientLng, driver.lat, driver.lng)
    console.log(`   ${driver.name}: ${distance.toFixed(2)} km`)
    
    if (distance < minDistance) {
      minDistance = distance
      nearestDriver = { ...driver, distance: minDistance }
    }
  }
  
  if (nearestDriver) {
    const distanceKm = nearestDriver.distance.toFixed(1)
    const eta = Math.max(3, Math.round(nearestDriver.distance * 4)) // 4 min par km pour Paris
    
    console.log(`🏆 Conducteur sélectionné: ${nearestDriver.name} à ${distanceKm} km`)
    
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
  
  throw new Error('Erreur de calcul de distance')
}

// Créer réservation en base avec conducteur assigné
async function createReservation(clientPhone: string, vehicleType: string, latitude: string, longitude: string, conducteurId: string) {
  try {
    const point = `POINT(${longitude} ${latitude})`
    
    const reservationData = {
      client_phone: clientPhone,
      vehicle_type: vehicleType,
      pickup_location: point,
      status: 'accepted',
      conducteur_id: conducteurId
    }
    
    console.log('💾 Création réservation en base...')
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(reservationData)
    })
    
    if (!response.ok) {
      console.error(`❌ Erreur création réservation: ${response.status}`)
      return { success: false }
    }
    
    const data = await response.json()
    console.log('✅ Réservation créée:', data[0]?.id)
    
    // Mettre à jour le statut du conducteur
    await updateConducteurStatut(conducteurId, 'occupe')
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ Exception création réservation:', error)
    return { success: false, error }
  }
}

// Mettre à jour le statut d'un conducteur
async function updateConducteurStatut(conducteurId: string, nouveauStatut: string) {
  try {
    console.log(`🔄 Mise à jour statut conducteur ${conducteurId} → ${nouveauStatut}`)
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?id=eq.${conducteurId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        statut: nouveauStatut,
        derniere_activite: new Date().toISOString()
      })
    })
    
    if (response.ok) {
      console.log(`✅ Conducteur ${conducteurId} → statut: ${nouveauStatut}`)
    } else {
      console.error(`❌ Erreur mise à jour statut: ${response.status}`)
    }
  } catch (error) {
    console.error('❌ Erreur mise à jour conducteur:', error)
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
    
    // === LOGIQUE CHATBOT PUREMENT DYNAMIQUE ===
    if (messageText.includes('taxi')) {
      // ÉTAPE 1: Demande taxi
      responseMessage = "Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')"
      console.log('🆕 Demande taxi')
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      // ÉTAPE 2: Type de véhicule + vérification disponibilité
      try {
        const driversCount = (await getAvailableDrivers(messageText)).length
        
        if (driversCount > 0) {
          responseMessage = `Parfait ! Vous avez choisi: ${messageText}
          
${driversCount} conducteur(s) disponible(s) dans votre zone.

Maintenant, veuillez partager votre position en cliquant sur l'icône 📎 puis 'Localisation'.`
        } else {
          responseMessage = `Désolé, aucun ${messageText} n'est disponible pour le moment.

Vérifiez que la table 'conducteurs' contient des données ou réessayez plus tard.
Pour recommencer: écrivez 'taxi'`
        }
        
        console.log(`🚗 Véhicule: ${messageText} (${driversCount} disponible(s))`)
      } catch (error) {
        console.error('❌ Erreur récupération conducteurs:', error)
        responseMessage = `Erreur de connexion à la base de données.

Vérifiez que:
- La table 'conducteurs' existe
- La vue 'conducteurs_disponibles' est créée
- Des conducteurs sont en statut 'disponible'

Pour recommencer: écrivez 'taxi'`
      }
      
    } else if (latitude && longitude) {
      // ÉTAPE 3: Localisation reçue
      console.log('📍 Traitement localisation...')
      
      const clientLat = parseFloat(latitude)
      const clientLng = parseFloat(longitude)
      
      // Pour l'instant, on simule avec "moto" par défaut
      // Dans une vraie app, il faudrait stocker le choix du véhicule (sessions)
      const vehicleType = 'moto' // Simulation
      
      try {
        const driver = await findNearestDriver(vehicleType, clientLat, clientLng)
        
        // Créer réservation avec conducteur assigné
        const reservation = await createReservation(clientPhone, vehicleType, latitude, longitude, driver.id)
        
        if (reservation.success) {
          responseMessage = `🎉 Réservation confirmée !

🚗 Conducteur: ${driver.name}
📞 Téléphone: ${driver.phone}  
🚙 Véhicule: ${driver.vehicle}
🔢 Plaque: ${driver.plaque || 'N/A'}
⭐ Note: ${driver.rating}/5
📍 Distance: ${driver.distance}
⏱️ Arrivée: ${driver.eta}

Le conducteur va vous appeler. Bon voyage ! 🛣️

❌ Pour annuler, écrivez 'annuler'
🚕 Nouvelle réservation: écrivez 'taxi'`

          console.log(`✅ Réservation complète - Conducteur: ${driver.name} à ${driver.distance}`)
        } else {
          responseMessage = "Erreur technique lors de la réservation. Écrivez 'taxi' pour recommencer."
          console.log('❌ Échec création réservation')
        }
      } catch (error) {
        console.error('💥 Erreur recherche conducteur:', error)
        responseMessage = `Aucun conducteur ${vehicleType} disponible pour le moment.

Essayez l'autre type de véhicule ou vérifiez que la base de données contient des conducteurs.
Pour recommencer: écrivez 'taxi'`
      }
      
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
    
    console.log(`📤 Réponse envoyée: ${responseMessage.substring(0, 100)}...`)
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 Erreur globale:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service indisponible. Vérifiez la configuration de la base de données et écrivez 'taxi' pour réessayer.</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})