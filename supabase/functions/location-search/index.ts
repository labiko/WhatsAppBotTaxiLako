import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

/**
 * Edge Function - Recherche Intelligente de Lieux Guinée
 * 2,809+ lieux depuis OpenStreetMap avec recherche fuzzy
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req: Request): Promise<Response> => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request
    const { query, targetCity, maxResults = 8 } = await req.json();
    
    console.log(`🔍 Recherche: "${query}" dans ${targetCity || 'auto'}`);
    
    // Validation
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query too short (minimum 2 characters)',
        suggestion: 'Tapez au moins 2 caractères pour rechercher'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Détection ville cible
    const detectedCity = detectTargetCity(query, targetCity);
    console.log(`🎯 Ville cible: ${detectedCity}`);

    // Initialisation Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Recherche intelligente
    const results = await performSearch(supabase, query.trim(), detectedCity, maxResults);
    
    console.log(`✅ ${results.length} résultats trouvés`);

    // Réponse finale
    return new Response(JSON.stringify({
      success: true,
      query: query.trim(),
      targetCity: detectedCity,
      results,
      metadata: {
        searchTime: Date.now(),
        resultCount: results.length,
        version: '1.0'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (error) {
    console.error('❌ Location search error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message,
      fallback: getFallbackSuggestions()
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function detectTargetCity(query: string, targetCity?: string): string {
  // 1. Ville explicite fournie
  if (targetCity && ['conakry', 'kindia', 'labe', 'nzerekore', 'all'].includes(targetCity.toLowerCase())) {
    return targetCity.toLowerCase();
  }

  // 2. Détection par mot-clé dans la requête
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('conakry') || queryLower.includes('cnk')) return 'conakry';
  if (queryLower.includes('kindia')) return 'kindia';
  if (queryLower.includes('labé') || queryLower.includes('labe')) return 'labe';
  if (queryLower.includes('nzérékoré') || queryLower.includes('nzerekore')) return 'nzerekore';

  // 3. Ville par défaut (Conakry)
  return 'conakry';
}

async function performSearch(supabase: any, query: string, targetCity: string, maxResults: number) {
  try {
    // Tentative fonction PostgreSQL intelligente
    const { data, error } = await supabase.rpc('search_adresses_intelligent', {
      search_query: query,
      target_city: targetCity,
      limit_results: maxResults
    });

    if (!error && data && data.length > 0) {
      return formatResults(data);
    }

    console.log('🔄 Fallback vers recherche simple...');
    return await performFallbackSearch(supabase, query, targetCity, maxResults);

  } catch (err) {
    console.error('❌ Exception recherche:', err);
    return await performFallbackSearch(supabase, query, targetCity, maxResults);
  }
}

async function performFallbackSearch(supabase: any, query: string, targetCity: string, maxResults: number) {
  try {
    let queryBuilder = supabase
      .from('adresses')
      .select('id, nom, adresse_complete, ville, type_lieu')
      .eq('pays', 'Guinée')
      .eq('actif', true);

    // Filtre par ville si spécifié
    if (targetCity && targetCity !== 'all') {
      queryBuilder = queryBuilder.eq('ville', targetCity);
    }

    // Recherche par nom
    queryBuilder = queryBuilder.ilike('nom', `%${query}%`);
    
    const { data, error } = await queryBuilder.limit(maxResults);

    if (error) {
      console.error('❌ Erreur fallback:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      nom: item.nom,
      adresse_complete: item.adresse_complete,
      ville: item.ville,
      type_lieu: item.type_lieu,
      similarity_score: 0.5,
      match_type: 'fallback'
    }));

  } catch (err) {
    console.error('❌ Exception fallback:', err);
    return [];
  }
}

function formatResults(data: any[]) {
  return data.map((item: any) => ({
    id: item.id,
    nom: item.nom,
    adresse_complete: item.adresse_complete,
    ville: item.ville,
    type_lieu: item.type_lieu,
    latitude: parseFloat(item.latitude || '0'),
    longitude: parseFloat(item.longitude || '0'),
    similarity_score: parseFloat(item.similarity_score || '0'),
    distance_km: parseFloat(item.distance_km || '0'),
    match_type: item.match_type || 'exact'
  }));
}

function getFallbackSuggestions(): string[] {
  return [
    'Conakry Centre', 'Hôpital National', 'Université Gamal', 
    'Marché Madina', 'Kindia Centre', 'Aéroport Conakry'
  ];
}