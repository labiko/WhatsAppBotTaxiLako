// 🚀 INJECTION GOOGLE PLACES VIA API SUPABASE
// Solution alternative pour éviter les problèmes psql

const fs = require('fs');

console.log('🚀 Injection Google Places via API Supabase...');

// Configuration Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';

// Lire et parser le fichier JSON original
const jsonFile = 'conakry_google_grid_2025-07-30T15-23-17-434Z.json';

try {
    console.log(`📄 Lecture du fichier JSON: ${jsonFile}`);
    const placesArray = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    console.log(`📊 Lieux à injecter: ${placesArray.length}`);
    
    // Nettoyer d'abord les anciennes données
    console.log('🗑️ Nettoyage des anciennes données Google Places...');
    
    const deleteRequest = {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    };
    
    fetch(`${SUPABASE_URL}/rest/v1/adresses?source_donnees=eq.google_places_grid_search`, deleteRequest)
        .then(response => {
            if (response.ok) {
                console.log('✅ Nettoyage terminé');
                return injectPlaces();
            } else {
                throw new Error(`Erreur nettoyage: ${response.status}`);
            }
        })
        .catch(error => {
            console.error('❌ Erreur:', error.message);
            console.log('🔄 Tentative d\'injection sans nettoyage...');
            injectPlaces();
        });
    
    async function injectPlaces() {
        console.log('💾 Début de l\'injection par batch...');
        
        const batchSize = 100; // Plus petit pour éviter les timeouts
        const totalBatches = Math.ceil(placesArray.length / batchSize);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, placesArray.length);
            const batchData = placesArray.slice(startIdx, endIdx);
            
            console.log(`📦 Batch ${batch + 1}/${totalBatches} (${batchData.length} lieux)...`);
            
            // Formater les données pour Supabase (avec toutes les colonnes)
            const supabaseData = batchData.map(place => ({
                nom: place.name?.substring(0, 200) || 'Sans nom',
                nom_normalise: place.name?.toLowerCase().substring(0, 200) || 'sans nom',
                adresse_complete: place.vicinity || place.formatted_address || '',
                ville: 'conakry',
                position: `POINT(${place.geometry.location.lng} ${place.geometry.location.lat})`,
                type_lieu: place.types?.[0] || 'lieu',
                actif: true,
                source_donnees: 'google_places_grid_search',
                telephone: place.formatted_phone_number || null,
                note_moyenne: place.rating || null,
                metadata: {
                    google_place_id: place.place_id,
                    ratings: place.user_ratings_total,
                    price_level: place.price_level,
                    opening_hours: place.opening_hours,
                    website: place.website,
                    business_status: place.business_status,
                    types: place.types
                }
            }));
            
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(supabaseData)
                });
                
                if (response.ok) {
                    console.log(`✅ Batch ${batch + 1} injecté avec succès`);
                } else {
                    const errorText = await response.text();
                    console.error(`❌ Erreur batch ${batch + 1}: ${response.status} - ${errorText}`);
                    
                    // Essayer un par un si le batch échoue
                    console.log('🔄 Injection individuelle...');
                    for (const item of supabaseData) {
                        try {
                            const singleResponse = await fetch(`${SUPABASE_URL}/rest/v1/adresses`, {
                                method: 'POST',
                                headers: {
                                    'apikey': SUPABASE_SERVICE_KEY,
                                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal'
                                },
                                body: JSON.stringify([item])
                            });
                            
                            if (!singleResponse.ok) {
                                console.log(`⚠️ Échec: ${item.nom}`);
                            }
                        } catch (singleError) {
                            console.log(`⚠️ Erreur: ${item.nom} - ${singleError.message}`);
                        }
                    }
                }
                
                // Pause entre les batch pour éviter les rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Erreur réseau batch ${batch + 1}:`, error.message);
            }
        }
        
        console.log('\n🎉 INJECTION TERMINÉE !');
        console.log('\n🔍 Vérification...');
        
        // Vérification finale
        try {
            const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/adresses?source_donnees=eq.google_places_grid_search&select=count`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (countResponse.ok) {
                const countData = await countResponse.json();
                console.log(`📊 Total injecté: ${countData.length || 'inconnu'} lieux Google Places`);
            }
            
            // Recherche 2LK
            const searchResponse = await fetch(`${SUPABASE_URL}/rest/v1/adresses?nom=ilike.*2LK*&select=nom,telephone,note_moyenne`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.length > 0) {
                    console.log('🎯 2LK RESTAURANT trouvé !');
                    console.log(searchData);
                } else {
                    console.log('⚠️ 2LK RESTAURANT non trouvé');
                }
            }
            
        } catch (verifyError) {
            console.error('❌ Erreur vérification:', verifyError.message);
        }
    }
    
} catch (error) {
    console.error('❌ Erreur lecture fichier:', error.message);
    process.exit(1);
}