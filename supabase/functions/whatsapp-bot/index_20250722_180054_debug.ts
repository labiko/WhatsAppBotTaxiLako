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

// Test détaillé de la base de données
async function diagnosticComplet() {
  const results = []
  
  try {
    // Test 1: Connexion de base
    console.log('🔍 Test 1: Connexion basique...')
    const testBasic = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    results.push(`Test basique: ${testBasic.status}`)
    console.log(`   Résultat: ${testBasic.status}`)
    
    // Test 2: Liste des tables
    console.log('🔍 Test 2: Liste des tables...')
    const testTables = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Accept': 'application/vnd.pgrst.object+json'
      }
    })
    results.push(`Liste tables: ${testTables.status}`)
    console.log(`   Résultat: ${testTables.status}`)
    
    // Test 3: Table conducteurs existe ?
    console.log('🔍 Test 3: Table conducteurs...')
    const testConducteurs = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    results.push(`Table conducteurs: ${testConducteurs.status}`)
    console.log(`   Résultat: ${testConducteurs.status}`)
    
    if (!testConducteurs.ok) {
      const errorText = await testConducteurs.text()
      console.log(`   Erreur détaillée: ${errorText}`)
      results.push(`Erreur: ${errorText.substring(0, 100)}`)
    }
    
    // Test 4: Contenu de la table
    if (testConducteurs.ok) {
      console.log('🔍 Test 4: Contenu table...')
      const testContent = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=*&limit=3`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      })
      
      if (testContent.ok) {
        const data = await testContent.json()
        results.push(`Conducteurs trouvés: ${data.length}`)
        console.log(`   Conducteurs: ${data.length}`)
        
        if (data.length > 0) {
          console.log(`   Premier: ${data[0].prenom} ${data[0].nom}`)
          results.push(`Premier: ${data[0].prenom} ${data[0].nom}`)
        }
      }
    }
    
    // Test 5: Table reservations
    console.log('🔍 Test 5: Table reservations...')
    const testReservations = await fetch(`${SUPABASE_URL}/rest/v1/reservations?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    results.push(`Table reservations: ${testReservations.status}`)
    console.log(`   Résultat: ${testReservations.status}`)
    
  } catch (error) {
    console.log('❌ Exception diagnostic:', error)
    results.push(`Exception: ${error.message}`)
  }
  
  return results
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    
    const from = formData.get('From')?.toString() || ''
    const body = formData.get('Body')?.toString()?.trim() || ''
    
    const clientPhone = normalizePhone(from)
    const messageText = body.toLowerCase()
    
    console.log(`📱 ${clientPhone} | 💬 "${body}"`)
    
    let responseMessage = ''
    
    // Diagnostic complet si on tape "debug"
    if (messageText.includes('debug')) {
      console.log('🔧 === DIAGNOSTIC COMPLET ===')
      const results = await diagnosticComplet()
      
      responseMessage = `🔧 DIAGNOSTIC SUPABASE:

${results.join('\n')}

Vérifiez les logs pour plus de détails.
Tapez 'taxi' pour tester normalement.`
      
    } else if (messageText.includes('taxi')) {
      // Test simple de la table conducteurs
      try {
        console.log('🔍 Test connexion conducteurs...')
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?select=count`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          }
        })
        
        console.log(`📡 Statut: ${response.status}`)
        
        if (response.ok) {
          responseMessage = `✅ Connexion DB OK!

Table 'conducteurs' trouvée.
Tapez 'moto' pour continuer le test.`
        } else {
          const errorText = await response.text()
          console.log(`❌ Erreur: ${errorText}`)
          
          responseMessage = `❌ Erreur DB:

Status: ${response.status}
Erreur: ${errorText.substring(0, 200)}

Tapez 'debug' pour diagnostic complet.`
        }
      } catch (error) {
        console.log(`❌ Exception: ${error}`)
        responseMessage = `❌ Exception:

${error.message}

Vérifiez la configuration Supabase.`
      }
      
    } else if (messageText === 'moto' || messageText === 'voiture') {
      // Test récupération conducteurs
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conducteurs?vehicle_type=eq.${messageText}&select=*`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          responseMessage = `✅ ${messageText} trouvé!

Nombre: ${data.length}
${data.map((c: any, i: number) => `${i+1}. ${c.prenom} ${c.nom}`).join('\n')}

Test OK! 🎉`
        } else {
          const errorText = await response.text()
          responseMessage = `❌ Erreur récupération:

${errorText.substring(0, 300)}`
        }
      } catch (error) {
        responseMessage = `❌ Exception: ${error.message}`
      }
      
    } else {
      responseMessage = `🔧 BOT DEBUG

Commandes:
• 'debug' = Diagnostic complet
• 'taxi' = Test connexion DB  
• 'moto' = Test récupération

Commencez par 'debug'!`
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`
    
    console.log(`📤 Réponse envoyée`)
    
    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
    
  } catch (error) {
    console.error('💥 Erreur globale:', error)
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>💥 Erreur: ${error.message}</Message>
</Response>`
    
    return new Response(errorTwiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    })
  }
})