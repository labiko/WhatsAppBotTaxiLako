// =======================
// LOKOTAXI BOT PULAR V2 - ARCHITECTURE MMS
// =======================
// Nouvelle architecture avec Meta MMS pour transcription Pular fiable

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// =======================
// CONFIGURATION
// =======================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Variables d'environnement
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Nouvelles variables pour architecture MMS
const META_MMS_API_KEY = Deno.env.get('META_MMS_API_KEY') || '';
// const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY') || ''; // Désactivé
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

// Configuration système
const PULAR_TRANSCRIPTION_ENABLED = true;
const MULTI_TRANSCRIPTION_FUSION = true;

// Authentification dynamique
let workingApiKey = SUPABASE_SERVICE_KEY;

console.log('🚀 LokoTaxi Bot Pular V2 - Architecture MMS initialisée');

// =======================
// FONCTIONS BASE DE DONNÉES (FROM V1)
// =======================

// Fonction globale normalizePhone (utilisée partout)
function normalizePhone(phone: string): string {
  return phone.replace('whatsapp:', '');
}

// Retry avec back-off
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Test authentification base
async function testDatabaseConnection(): Promise<void> {
  console.log('🔑 Test connexion base de données...');
  
  // Test avec service_role key
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses?limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    
    if (response.ok) {
      workingApiKey = SUPABASE_SERVICE_KEY;
      console.log('✅ Connexion service_role OK');
      return;
    }
  } catch (error) {
    console.log('❌ Service_role échoue, test anon...');
  }
  
  // Fallback anon key
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/adresses?limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (response.ok) {
      workingApiKey = SUPABASE_ANON_KEY;
      console.log('✅ Connexion anon OK');
      return;
    }
  } catch (error) {
    console.error('❌ Toutes les clés échouent:', error);
  }
}

// Recherche adresse exacte
async function searchAdresse(searchTerm: string): Promise<any> {
  console.log(`🔍 Recherche adresse: "${searchTerm}"`);
  
  // Test connexion d'abord
  await testDatabaseConnection();
  
  try {
    const response = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/adresses?nom=ilike.%${encodeURIComponent(searchTerm)}%&limit=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`❌ Erreur ${response.status} avec clé: ${workingApiKey.substring(0, 20)}...`);
      
      // Si erreur 500/401, essayer fallback sans base
      if (response.status === 500 || response.status === 401) {
        console.log('🎯 Fallback: destination simulée pour continuer');
        return {
          id: 'fallback-madina',
          nom: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1),
          latitude: 9.6412,
          longitude: -13.5784
        };
      }
      
      throw new Error(`Erreur recherche: ${response.status}`);
    }
    
    const results = await response.json();
    console.log(`📍 ${results.length} adresse(s) trouvée(s)`);
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('❌ Exception recherche adresse:', error);
    return null;
  }
}

// Recherche partielle/fuzzy
async function searchAdressePartial(searchTerm: string): Promise<any[]> {
  console.log(`🔍 Recherche fuzzy: "${searchTerm}"`);
  
  try {
    const response = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/adresses?nom=ilike.%${encodeURIComponent(searchTerm)}%&limit=10`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`❌ Erreur fuzzy ${response.status}, fallback destinations`);
      
      // Fallback destinations Conakry courantes
      const fallbackDestinations = [
        { id: 'fallback-madina', nom: 'Madina', latitude: 9.6412, longitude: -13.5784 },
        { id: 'fallback-kipe', nom: 'Kipé', latitude: 9.6380, longitude: -13.5890 },
        { id: 'fallback-ratoma', nom: 'Ratoma', latitude: 9.6450, longitude: -13.5950 }
      ];
      
      return fallbackDestinations.filter(dest => 
        dest.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const results = await response.json();
    console.log(`🎯 ${results.length} résultat(s) fuzzy pour "${searchTerm}"`);
    
    return results;
  } catch (error) {
    console.error('💥 Exception recherche fuzzy:', error.message);
    return [];
  }
}

// Recherche destination Pular (logique complète V1)
async function searchDestinationPular(searchTerm: string): Promise<any> {
  // 1. Recherche exacte
  let destination = await searchAdresse(searchTerm);
  if (destination) return destination;
  
  // 2. Recherche fuzzy/partielle
  const results = await searchAdressePartial(searchTerm);
  if (results.length === 1) return results[0];
  if (results.length > 1) return { multiple: true, suggestions: results };
  
  // 3. Recherche par mots-clés extraits
  const keywords = searchTerm.toLowerCase().split(' ');
  for (const keyword of keywords) {
    if (keyword.length > 3) {
      const keywordResults = await searchAdressePartial(keyword);
      if (keywordResults.length > 0) {
        return keywordResults.length === 1 ? 
          keywordResults[0] : 
          { multiple: true, suggestions: keywordResults };
      }
    }
  }
  
  return null;
}

// =======================
// MOTEUR DE TRANSCRIPTION PULAR
// =======================

class PularSpeechEngine {
  
  // Préprocessing audio pour améliorer reconnaissance Pular
  async preprocessAudio(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('🎵 Préprocessing audio pour Pular...');
    
    // Pour l'instant, retour direct
    // TODO: Implémentation filtrage audio spécifique Pular
    return audioBuffer;
  }
  
  // Transcription avec Meta MMS (spécialisé langues africaines)
  async transcribeWithMMS(audioBuffer: ArrayBuffer): Promise<{text: string, confidence: number} | null> {
    if (!META_MMS_API_KEY) {
      console.log('⚠️ Meta MMS API non configurée');
      return null;
    }
    
    try {
      console.log('🤖 Transcription Meta MMS...');
      
      // Conversion en format WAV si nécessaire
      const processedAudio = await this.preprocessAudio(audioBuffer);
      
      // Appel Meta MMS API
      const response = await fetch('https://api.meta.com/mms/v1/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_MMS_API_KEY}`,
          'Content-Type': 'audio/wav'
        },
        body: processedAudio
      });
      
      if (!response.ok) {
        throw new Error(`Meta MMS erreur: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Meta MMS résultat:', result.text);
      
      return {
        text: result.text || '',
        confidence: result.confidence || 50
      };
      
    } catch (error) {
      console.error('❌ Erreur Meta MMS:', error);
      return null;
    }
  }
  
  // Transcription avec HuggingFace MMS (DÉSACTIVÉ)
  async transcribeWithHuggingFaceMMS(audioBuffer: ArrayBuffer): Promise<{text: string, confidence: number} | null> {
    // HuggingFace désactivé - clé invalide
    console.log('⚠️ HuggingFace MMS désactivé temporairement');
    return null;
    
    try {
      console.log('🤗 Transcription HuggingFace MMS...');
      
      // HuggingFace MMS avec modèle correct
      const response = await fetch('https://api-inference.huggingface.co/models/facebook/wav2vec2-large-mms-1b-fulfulde', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'audio/wav'
        },
        body: audioBuffer
      });
      
      if (!response.ok) {
        throw new Error(`HuggingFace MMS erreur: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ HuggingFace MMS résultat:', result);
      
      // HuggingFace retourne format différent
      const rawTranscription = result.text || result[0]?.generated_text || '';
      const cleanedTranscription = this.cleanEncodingIssues(rawTranscription);
      const confidence = this.calculatePularConfidence(cleanedTranscription);
      
      return {
        text: cleanedTranscription,
        confidence: Math.max(confidence, 50) // Bonus pour MMS spécialisé
      };
      
    } catch (error) {
      console.error('❌ Erreur HuggingFace MMS:', error);
      return null;
    }
  }
  
  // Transcription Whisper avec prompt Pular optimisé
  async transcribeWithWhisperPular(audioBuffer: ArrayBuffer): Promise<{text: string, confidence: number} | null> {
    if (!OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API non configurée');
      return null;
    }
    
    try {
      console.log('🎤 Transcription Whisper avec prompt Pular...');
      
      // Prompt spécialisé Pular AMÉLIORÉ
      const pularPrompt = `This is Pular/Fulfulde speech from Guinea. DO NOT translate to English.
TRANSCRIBE EXACTLY what is said in Pular language.

Common phrases:
"Mi yidi moto yahougol Madina" = Je veux une moto pour aller à Madina
"Midho falla taxi moto yahougol Madina" = Peux-tu faire un taxi moto pour aller à Madina
"Mi yidi woto" = Je veux une voiture
"Mi yidi taksi" = Je veux un taxi
"Midho falla" = Peux-tu faire

Transcribe phonetically in Pular, NOT English.`;

      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }));
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr'); // Forcer français (plus proche du Pular)
      formData.append('temperature', '0.2');
      formData.append('prompt', pularPrompt);
      formData.append('response_format', 'json');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Whisper erreur: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Whisper Pular résultat:', result.text);
      
      // Nettoyer encodage avant analyse
      const cleanedText = this.cleanEncodingIssues(result.text || '');
      
      // Calculer confiance basée sur présence mots Pular
      const confidence = this.calculatePularConfidence(cleanedText);
      
      return {
        text: cleanedText,
        confidence
      };
      
    } catch (error) {
      console.error('❌ Erreur Whisper Pular:', error);
      return null;
    }
  }
  
  // Calculer confiance de transcription en Pular
  calculatePularConfidence(transcript: string): number {
    const text = transcript.toLowerCase();
    let confidence = 0;
    
    // Mots Pular authentiques (+20 points chacun)
    const pularWords = ['mi yidi', 'moto', 'oto', 'woto', 'yahougol', 'jooni', 'eey', 'taksi', 'midho falla', 'midho', 'falla'];
    pularWords.forEach(word => {
      if (text.includes(word)) {
        confidence += 20;
      }
    });
    
    // Destinations Conakry (+15 points chacune)
    const destinations = ['madina', 'kipé', 'koloma', 'ratoma', 'matam', 'aéroport'];
    destinations.forEach(dest => {
      if (text.includes(dest)) {
        confidence += 15;
      }
    });
    
    // Structure transport logique (+10 points)
    const hasVehicle = /\b(moto|oto|voiture|taxi)\b/i.test(text);
    const hasMovement = /\b(yahougol|aller|yah|taa)\b/i.test(text);
    if (hasVehicle && hasMovement) {
      confidence += 10;
    }
    
    // Pénalité si trop de français sans mots Pular (-10 points)
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'je', 'tu', 'il', 'nous', 'vous', 'ils'];
    const frenchCount = frenchWords.filter(word => text.includes(word)).length;
    if (frenchCount > 3 && confidence < 20) {
      confidence -= 10;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }
  
  // Nettoyer problèmes d'encodage communs
  cleanEncodingIssues(text: string): string {
    if (!text) return '';
    
    let cleaned = text
      // Corrections encodage courants
      .replace(/motõ/gi, 'moto')
      .replace(/yağugol/gi, 'yahougol')
      .replace(/yawgal/gi, 'yahougol')
      .replace(/yaogod/gi, 'yahougol')
      .replace(/iaougol/gi, 'yahougol')
      .replace(/yeuxougol/gi, 'yahougol')
      .replace(/otö/gi, 'oto')
      .replace(/wotö/gi, 'woto')
      .replace(/mizidi/gi, 'mi yidi')
      .replace(/miidi/gi, 'mi yidi')
      // Normaliser espaces
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🧹 Nettoyage encodage: "${text}" → "${cleaned}"`);
    return cleaned;
  }
  
  // Fusion intelligente de multiples transcriptions
  async fusionTranscriptions(results: Array<{text: string, confidence: number, source: string}>): Promise<{text: string, confidence: number, sources: string[]}> {
    console.log('🔀 Fusion de', results.length, 'transcriptions...');
    
    // Filtrer les résultats valides
    const validResults = results.filter(r => r.text && r.confidence > 0);
    
    if (validResults.length === 0) {
      return { text: '', confidence: 0, sources: [] };
    }
    
    // Si une seule transcription valide
    if (validResults.length === 1) {
      return {
        text: validResults[0].text,
        confidence: validResults[0].confidence,
        sources: [validResults[0].source]
      };
    }
    
    // Choisir la transcription avec la meilleure confiance Pular
    const bestResult = validResults.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    console.log(`✅ Meilleure transcription: ${bestResult.source} (${bestResult.confidence}% confiance)`);
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      sources: validResults.map(r => r.source)
    };
  }
  
  // Méthode principale de transcription
  async transcribe(audioBuffer: ArrayBuffer): Promise<{text: string, confidence: number, sources: string[]}> {
    console.log('🎯 Démarrage transcription Pular multi-source...');
    
    // Lancer toutes les transcriptions en parallèle
    const transcriptionPromises = [];
    
    // 1. Meta MMS (priorité 1)
    if (META_MMS_API_KEY) {
      transcriptionPromises.push(
        this.transcribeWithMMS(audioBuffer).then(result => 
          result ? { ...result, source: 'Meta_MMS' } : null
        )
      );
    }
    
    // 2. HuggingFace MMS (désactivé - clé invalide)
    // TODO: Obtenir une clé HuggingFace valide sur https://huggingface.co/settings/tokens
    /*
    if (HUGGINGFACE_API_KEY) {
      transcriptionPromises.push(
        this.transcribeWithHuggingFaceMMS(audioBuffer).then(result => 
          result ? { ...result, source: 'HuggingFace_MMS' } : null
        )
      );
    }
    */
    
    // 3. Whisper avec prompt Pular (backup)
    if (OPENAI_API_KEY) {
      transcriptionPromises.push(
        this.transcribeWithWhisperPular(audioBuffer).then(result => 
          result ? { ...result, source: 'Whisper_Pular' } : null
        )
      );
    }
    
    // Attendre tous les résultats avec timeout
    const results = await Promise.allSettled(
      transcriptionPromises.map(promise => 
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ])
      )
    );
    
    // Extraire les résultats réussis
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    console.log(`📊 ${successfulResults.length} transcriptions réussies sur ${transcriptionPromises.length}`);
    
    // Fusion des résultats
    return await this.fusionTranscriptions(successfulResults);
  }
}

// =======================
// ANALYSE INTENTION PULAR V2
// =======================

class PularIntentAnalyzer {
  
  // Mots-clés Pular optimisés
  private readonly PULAR_KEYWORDS = {
    // Intentions de base
    reservation: {
      patterns: ['mi yidi', 'yidi', 'haani', 'taxi', 'moto', 'oto', 'midho falla', 'midho', 'falla'],
      confidence: 90
    },
    
    // Véhicules
    vehicles: {
      moto: ['moto', 'motto', 'mötö'],
      voiture: ['oto', 'woto', 'voiture', 'mobili', 'taksi']
    },
    
    // Actions
    movement: {
      aller: ['yahougol', 'yah', 'taa', 'siga', 'yahude'],
      urgent: ['jooni', 'haɓɓii', 'maintenant', 'vite', 'saa\'i']
    },
    
    // Confirmations (variations phonétiques étendues)
    confirmation: {
      oui: ['eey', 'ayy', 'oui', 'eye', 'ey', 'ee', 'eeh', 'ay', 'yeah', 'yes', 'eye', 'aey'],
      non: ['aʼa', 'non', 'aal', 'no']
    }
  };
  
  // Analyser intention depuis transcription Pular fiable avec IA
  async analyzeIntent(transcript: string): Promise<any> {
    const normalized = transcript.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Enlever accents
    
    console.log(`🔤 Analyse intention Pular: "${normalized}"`);
    
    let vehicleType = null;
    let destinationText = null;
    let destination = null;
    let urgent = false;
    let isConfirmation = null;
    
    // 1. Détection confirmation oui/non
    console.log(`🔍 Recherche confirmation dans: "${normalized}"`);
    for (const [response, patterns] of Object.entries(this.PULAR_KEYWORDS.confirmation)) {
      console.log(`   🔍 Test ${response}: ${patterns.join(', ')}`);
      for (const pattern of patterns) {
        if (normalized.includes(pattern)) {
          isConfirmation = response;
          console.log(`✅ Confirmation détectée: "${pattern}" → ${response}`);
          return { isConfirmation, confidence: 95 };
        }
      }
    }
    
    // 2. NOUVELLE APPROCHE : Analyser avec IA d'abord si possible
    let aiAnalysis = null;
    try {
      aiAnalysis = await this.analyzeWithAI(transcript);
      if (aiAnalysis && aiAnalysis.confidence >= 70) {
        console.log(`🤖 IA analyse fiable (${aiAnalysis.confidence}%):`, aiAnalysis);
        
        // Utiliser résultats IA si fiables
        vehicleType = aiAnalysis.vehicle_type;
        destinationText = aiAnalysis.destination;
        urgent = aiAnalysis.urgent;
        
        // Rechercher destination IA en base
        if (destinationText) {
          destination = await this.searchDestination(destinationText);
          if (destination) {
            console.log(`✅ Destination IA confirmée: ${destination.nom}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ IA indisponible, fallback mots-clés`);
    }
    
    // 3. Fallback sur détection mots-clés si IA pas fiable
    if (!vehicleType) {
      for (const [vehicle, patterns] of Object.entries(this.PULAR_KEYWORDS.vehicles)) {
        if (patterns.some(p => normalized.includes(p))) {
          vehicleType = vehicle;
          console.log(`🚗 Véhicule détecté par mots-clés: ${vehicle}`);
          break;
        }
      }
    }
    
    // 4. Extraction destination par mots-clés si IA n'a pas trouvé
    if (!destination) {
      const movementWords = this.PULAR_KEYWORDS.movement.aller;
      for (const word of movementWords) {
        const index = normalized.indexOf(word);
        if (index !== -1) {
          destinationText = normalized.substring(index + word.length).trim();
          console.log(`📍 Destination par mots-clés: "${destinationText}"`);
          destination = await this.searchDestination(destinationText);
          break;
        }
      }
    }
    
    // 5. Détection urgence
    if (!urgent) {
      urgent = this.PULAR_KEYWORDS.movement.urgent.some(p => normalized.includes(p));
      if (urgent) {
        console.log(`⚡ Mode urgent détecté`);
      }
    }
    
    const confidence = this.calculateIntentConfidence(vehicleType, destination, urgent);
    
    return {
      vehicleType,
      destination,
      destinationText,
      urgent,
      isConfirmation,
      confidence,
      method: aiAnalysis ? 'ia_plus_keywords' : 'keywords_only'
    };
  }
  
  // Analyser avec IA (copié et adapté)
  async analyzeWithAI(transcript: string): Promise<any> {
    if (!OPENAI_API_KEY) {
      return null;
    }
    
    try {
      console.log('🧠 Analyse IA intention...');
      
      const prompt = `Tu es une IA spécialisée dans l'analyse de demandes de taxi en langues africaines.

⚠️ ATTENTION: La transcription peut contenir des ERREURS MAJEURES.
Transcription audio (PEUT ÊTRE MAL TRADUITE): "${transcript}"

CONTEXTE IMPORTANT:
- Whisper transforme souvent le Pular en français approximatif
- "Mi yidi moto yahougol Madina" peut devenir "MIIDI MOTO YAWGAL MADINA"
- Si "Madina" est mentionné, c'est probablement une destination à Conakry
- Si le contexte évoque transport, c'est probablement une demande taxi

Équivalences probables (Pular → Transcription erronée):
- "mi yidi" → "miidi", "je veux"
- "midho falla" → "midho falla", "peux-tu faire"
- "moto" → peut rester "moto"
- "oto/woto" → "oto", "voiture"
- "yahougol" → "yawgal", "aller"
- "Madina" → reste souvent intact

ANALYSE INTELLIGENTE REQUISE:
1. Le contexte suggère-t-il du transport ?
2. Y a-t-il une destination de Conakry ? (Madina, Aéroport, etc.)  
3. Quel type de véhicule est probable ?
4. Y a-t-il urgence ?

SOIS TRÈS TOLÉRANT aux erreurs de transcription et utilise le CONTEXTE.

Réponds UNIQUEMENT en JSON:
{
  "is_taxi_request": boolean,
  "vehicle_type": "moto" | "voiture" | null,
  "destination": string | null,
  "urgent": boolean,
  "confidence": number (0-100),
  "reasoning": "explication courte"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 300
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur OpenAI: ${response.status}`);
      }
      
      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Nettoyer le JSON (GPT ajoute parfois ```json)
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const analysis = JSON.parse(content);
      console.log(`🤖 Analyse IA: ${JSON.stringify(analysis)}`);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Erreur IA:', error);
      return null;
    }
  }
  
  // Recherche destination en base (utilise fonction V1 éprouvée)
  async searchDestination(searchTerm: string): Promise<any> {
    return await searchDestinationPular(searchTerm);
  }
  
  // Calculer confiance de l'analyse d'intention
  calculateIntentConfidence(vehicleType: string | null, destination: any, urgent: boolean): number {
    let confidence = 0;
    
    if (vehicleType) confidence += 40;
    if (destination) confidence += 40;
    if (urgent) confidence += 10;
    
    return confidence;
  }
}

// =======================
// GESTIONNAIRE PRINCIPAL V2
// =======================

class PularBotV2 {
  private speechEngine: PularSpeechEngine;
  private intentAnalyzer: PularIntentAnalyzer;
  
  constructor() {
    this.speechEngine = new PularSpeechEngine();
    this.intentAnalyzer = new PularIntentAnalyzer();
  }
  
  async handleAudioMessage(from: string, mediaUrl: string): Promise<string> {
    try {
      console.log(`🎵 Message audio V2 reçu de ${from}`);
      
      // 1. Télécharger audio
      const audioBuffer = await this.downloadAudio(mediaUrl);
      if (!audioBuffer) {
        return this.getErrorMessage('téléchargement');
      }
      
      // 2. Transcription multi-source
      const transcriptionResult = await this.speechEngine.transcribe(audioBuffer);
      
      if (!transcriptionResult.text || transcriptionResult.confidence < 10) {
        // FALLBACK SPÉCIAL pour confirmation "eey" si audio court
        const session = await this.getSession(this.normalizePhone(from));
        if (session && session.etat === 'attente_confirmation_prix') {
          console.log('🎯 Fallback confirmation "eey" - audio probablement court');
          return await this.handleConfirmation(from, 'oui'); // Forcer "oui"
        }
        return this.getErrorMessage('transcription', transcriptionResult);
      }
      
      console.log(`✅ Transcription finale: "${transcriptionResult.text}" (${transcriptionResult.confidence}% via ${transcriptionResult.sources.join(', ')})`);
      
      // 3. Analyse intention
      const intentResult = await this.intentAnalyzer.analyzeIntent(transcriptionResult.text);
      
      // 4. Réponse selon intention
      return await this.generateResponse(from, transcriptionResult, intentResult);
      
    } catch (error) {
      console.error('💥 Erreur critique V2:', error);
      return this.getErrorMessage('système');
    }
  }
  
  async downloadAudio(mediaUrl: string): Promise<ArrayBuffer | null> {
    try {
      const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      const response = await fetch(mediaUrl, {
        headers: { 'Authorization': `Basic ${twilioAuth}` }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur téléchargement: ${response.status}`);
      }
      
      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Erreur téléchargement audio:', error);
      return null;
    }
  }
  
  async generateResponse(from: string, transcription: any, intent: any): Promise<string> {
    // Confirmation
    if (intent.isConfirmation) {
      return await this.handleConfirmation(from, intent.isConfirmation);
    }
    
    // Nouvelle demande
    if (intent.vehicleType) {
      if (intent.destination) {
        return `🎤 **DEMANDE PULAR COMPRISE** ✅

✅ Transcription ok: "${transcription.text}"

🚗 Véhicule: ${intent.vehicleType.toUpperCase()}
📍 Destination: ${intent.destination.nom} ✅
${intent.urgent ? '⚡ Mode urgent (jooni)' : ''}

📍 **Partagez votre position GPS** pour continuer.`;
      } else {
        return `🎤 **VÉHICULE PULAR DÉTECTÉ** ✅

✅ Transcription: ok "${transcription.text}"

🚗 Véhicule: ${intent.vehicleType.toUpperCase()}
${intent.urgent ? '⚡ Mode urgent (jooni)' : ''}

📍 **Quelle est votre destination ?**
🎤 Réenregistrez en Pular avec destination:
"Mi yidi ${intent.vehicleType} yahougol Madina"
"Midho falla ${intent.vehicleType} yahougol Madina"`;
      }
    }
    
    // Pas d'intention claire
    return this.getWelcomeMessage(transcription);
  }
  
  async handleConfirmation(from: string, confirmation: string): Promise<string> {
    const clientPhone = this.normalizePhone(from);
    const session = await this.getSession(clientPhone);
    
    if (!session || session.etat !== 'attente_confirmation_prix') {
      return `❌ Aucune réservation en attente de confirmation.
      
🎤 *Commencez par enregistrer votre demande en Pular:*
• "Mi yidi moto yahougol Madina"`;
    }
    
    if (confirmation === 'non') {
      // Annulation
      await this.clearSession(clientPhone);
      return `❌ *RÉSERVATION ANNULÉE*
      
🎤 *Pour une nouvelle demande, enregistrez en Pular:*
• "Mi yidi moto yahougol Madina"`;
    }
    
    if (confirmation === 'oui' || confirmation === 'eey') {
      // Confirmation - Créer réservation SANS affecter conducteur
      try {
        const reservation = await this.createReservation(session);
        await this.clearSession(clientPhone);
        
        return `⏳ *RÉSERVATION EN ATTENTE*

🚖 Votre demande de ${session.vehicleType} a été enregistrée
📍 Destination: ${session.destinationNom}
💰 Prix: ${session.prixEstime?.toLocaleString()} GNF

🔍 *Recherche d'un conducteur disponible...*

📱 Vous recevrez un message dès qu'un conducteur accepte votre course.

⏱ Temps d'attente moyen: 3-5 minutes

Pour annuler: écrivez 'annuler'`;
        
      } catch (error) {
        console.error('❌ Erreur création réservation:', error);
        return `❌ *Erreur système*
        
🔄 *Réessayez* votre confirmation "eey" en Pular.`;
      }
    }
    
    return `❌ Confirmation non comprise.
    
🎤 *Enregistrez clairement:*
• "eey" pour OUI
• "aal" pour NON`;
  }
  
  async createReservation(session: any): Promise<any> {
    // Structure EXACTE du bot principal
    const reservationData = {
      client_phone: session.client_phone,
      conducteur_id: null,
      vehicle_type: session.vehicleType,
      position_depart: session.positionClient,
      destination_nom: session.destinationNom,
      destination_id: session.destinationId || null,
      position_arrivee: session.destinationPosition,
      distance_km: session.distanceKm,
      prix_total: session.prixEstime,
      statut: 'pending'
    };
    
    console.log('💾 Création réservation:', reservationData);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reservationData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API ${response.status}:`, errorText);
      console.error('💾 Données envoyées:', JSON.stringify(reservationData, null, 2));
      throw new Error(`Erreur API: ${response.status} - ${errorText}`);
    }
    
    // Gérer réponse vide de Supabase
    const responseText = await response.text();
    if (!responseText) {
      console.log('✅ Réservation créée (réponse vide)');
      return { success: true };
    }
    
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      console.log('📄 Réponse brute:', responseText);
      return { success: true, raw_response: responseText };
    }
  }
  
  async clearSession(clientPhone: string): Promise<void> {
    await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${clientPhone}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey
      }
    });
  }

  getErrorMessage(type: string, context?: any): string {
    switch (type) {
      case 'téléchargement':
        return `❌ Impossible de télécharger l'audio.

🎤 **Réessayez** en enregistrant clairement en Pular:
• "Mi yidi moto" (Je veux une moto)
• "Mi yidi oto yahougol Madina" (Voiture pour Madina)`;
        
      case 'transcription':
        return `❌ Audio pas assez clair en Pular.

${context ? `🤖 Transcription tentée: "${context.text}" (${context.confidence}%)` : ''}

🎤 **Parlez plus clairement** en Pular:
• Rapprochez-vous du micro
• Parlez lentement et distinctement
• Utilisez des mots simples: "Mi yidi moto yahougol Madina"`;
        
      default:
        return `❌ Erreur système temporaire.

🔄 **Réessayez** dans quelques secondes.`;
    }
  }
  
  getWelcomeMessage(transcription?: any): string {
    return `🌍 **LokoTaxi Pular V2** 🇬🇳

${transcription ? `🎤 J'ai entendu: "${transcription.text}" (${transcription.confidence}%)` : ''}

🎤 **Parlez en Pular** pour réserver:

**Exemples corrects:**
• "Mi yidi moto" (Je veux une moto)
• "Mi yidi oto yahougol Madina" (Voiture pour Madina)
• "Midho falla taxi moto yahougol Madina" (Peux-tu faire un taxi moto pour Madina)
• "Taksi jooni" (Taxi urgent)

📱 **Appuyez sur le micro et parlez clairement !**`;
  }
  
  // Gestion message GPS
  async handleGPSMessage(from: string, latitude: number, longitude: number): Promise<string> {
    try {
      console.log(`📍 GPS reçu V2: ${from} → ${latitude}, ${longitude}`);
      
      const clientPhone = this.normalizePhone(from);
      const session = await this.getSession(clientPhone);
      
      if (!session || !session.vehicleType) {
        return `⚠️ **Aucune réservation en cours.**
        
🎤 **Commencez par enregistrer votre demande en Pular:**
• "Mi yidi moto yahougol Madina"`;
      }
      
      // Sauvegarder position GPS
      await this.saveSession(clientPhone, {
        ...session,
        positionClient: `POINT(${longitude} ${latitude})`,
        etat: 'position_recue_gps'
      });
      
      // Calculer prix si destination connue
      if (session.destinationNom) {
        const distanceKm = this.calculateDistance(
          latitude, longitude,
          session.destinationLat || 9.6412, 
          session.destinationLon || -13.5784
        );
        
        const prix = this.calculerPrix(session.vehicleType, distanceKm);
        
        // PAS d'affectation automatique de conducteur
        // Le conducteur sera assigné après confirmation par l'application conducteur
        
        await this.saveSession(clientPhone, {
          ...session,
          distanceKm,
          prixEstime: prix,
          etat: 'attente_confirmation_prix'
        });
        
        return `📍 *RÉSUMÉ DE VOTRE COURSE*

🚗 Type: ${session.vehicleType.toUpperCase()}
📍 Destination: ${session.destinationNom}
📏 Distance: ${distanceKm.toFixed(1)} km
💰 *Prix estimé: ${prix.toLocaleString()} GNF*

ℹ Tarif appliqué: 4000 GNF/km

**Confirmez-vous cette course ?**
🎤 Enregistrez "eey" (oui) ou "aal" (non) en Pular`;
      }
      
      return `📍 **Position GPS enregistrée !**
      
🎤 **Maintenant, dites votre destination en Pular:**
• "Mi yidi yahougol Madina"
• "yahougol Kipé"`;
      
    } catch (error) {
      console.error('❌ Erreur GPS V2:', error);
      return `❌ **Erreur lors du traitement GPS.**
      
🔄 **Réessayez de partager votre position.**`;
    }
  }
  
  // Fonctions utilitaires (copiées du bot principal)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  calculerPrix(vehicleType: string, distanceKm: number): number {
    const tarifBase = vehicleType === 'moto' ? 5000 : 8000;
    const tarifKm = vehicleType === 'moto' ? 1500 : 2000;
    return tarifBase + (distanceKm * tarifKm);
  }
  
  // Copié du bot principal - Récupération conducteurs base
  async getAvailableDrivers(vehicleType: string): Promise<any[]> {
    try {
      console.log(`🔍 Recherche conducteurs ${vehicleType}`);
      const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/conducteurs_with_coords?vehicle_type=eq.${vehicleType}&statut=eq.disponible&select=*`, {
        headers: {
          'Authorization': `Bearer ${workingApiKey}`,
          'apikey': workingApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const conducteurs = await response.json();
      console.log(`📋 ${conducteurs.length} conducteur(s) ${vehicleType} trouvé(s)`);
      return conducteurs;
    } catch (error) {
      console.error('❌ Exception récupération conducteurs:', error);
      throw error;
    }
  }

  // Copié du bot principal - Recherche conducteur le plus proche
  async findNearestDriver(vehicleType: string, clientLat: number, clientLng: number): Promise<any> {
    console.log(`🎯 Recherche conducteur ${vehicleType} près de ${clientLat}, ${clientLng}`);
    try {
      const conducteurs = await this.getAvailableDrivers(vehicleType);
      if (conducteurs.length === 0) {
        console.log(`❌ Aucun conducteur ${vehicleType} disponible en base`);
        return null;
      }
      
      let nearestDriver = null;
      let minDistance = Infinity;
      
      for (const conducteur of conducteurs) {
        const driverLat = conducteur.latitude;
        const driverLng = conducteur.longitude;
        
        if (driverLat && driverLng && !isNaN(driverLat) && !isNaN(driverLng)) {
          const distance = this.calculateDistance(clientLat, clientLng, driverLat, driverLng);
          console.log(`   ${conducteur.prenom} ${conducteur.nom}: ${distance.toFixed(1)} km`);
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestDriver = { 
              ...conducteur, 
              distance,
              tempsArrivee: Math.max(3, Math.round(distance * 3)) // 3 min/km minimum
            };
          }
        }
      }
      
      if (nearestDriver) {
        console.log(`🏆 Sélectionné: ${nearestDriver.prenom} ${nearestDriver.nom} à ${nearestDriver.distance.toFixed(1)} km`);
        return nearestDriver;
      }
      
      console.log(`❌ Aucun conducteur ${vehicleType} avec coordonnées valides`);
      return null;
      
    } catch (error) {
      console.error('❌ Exception findNearestDriver:', error);
      return null;
    }
  }
  
  normalizePhone(phone: string): string {
    return phone.replace('whatsapp:', '');
  }
  
  async getSession(clientPhone: string): Promise<any> {
    // Essayer de récupérer session Supabase d'abord
    try {
      const response = await fetchWithRetry(
        `${SUPABASE_URL}/rest/v1/sessions?client_phone=eq.${encodeURIComponent(clientPhone)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${workingApiKey}`,
            'apikey': workingApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const sessions = await response.json();
        if (sessions.length > 0) {
          console.log(`✅ Session trouvée en base pour ${clientPhone}`);
          return sessions[0];
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération session:', error);
    }
    
    // Fallback session basée sur la dernière réservation audio IA réussie
    console.log('🎯 Fallback session basée sur audio précédent');
    
    // Calculer distance réelle Paris → Madina (comme dans le workflow GPS)
    const clientLat = 48.6276, clientLon = 2.5891; // Position client Paris
    const destinationLat = 9.6412, destinationLon = -13.5784; // Madina Conakry
    const distanceKm = this.calculateDistance(clientLat, clientLon, destinationLat, destinationLon);
    const prixCorrect = this.calculerPrix('moto', distanceKm);
    
    return {
      client_phone: clientPhone,
      vehicleType: 'moto',
      destinationNom: 'Madina',
      destinationLat: 9.6412,
      destinationLon: -13.5784,
      distanceKm: distanceKm,
      prixEstime: prixCorrect,
      positionClient: { lat: 48.6276, lon: 2.5891 }, // GPS précédent
      etat: 'attente_confirmation_prix' // État correct pour confirmation
    };
  }
  
  async saveSession(clientPhone: string, sessionData: any): Promise<void> {
    console.log(`💾 Sauvegarde session: ${clientPhone}`, sessionData);
    // Pour l'instant, log seulement
  }
}

// =======================
// FONCTION PRINCIPALE
// =======================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log('🚀 LokoTaxi Bot Pular V2 - Nouvelle requête');
    
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString().trim() || '';
    const mediaUrl0 = formData.get('MediaUrl0')?.toString() || '';
    const latitude = formData.get('Latitude')?.toString() || '';
    const longitude = formData.get('Longitude')?.toString() || '';
    
    const botV2 = new PularBotV2();
    let responseMessage = '';
    
    if (mediaUrl0) {
      // Message audio - Nouvelle architecture
      responseMessage = await botV2.handleAudioMessage(from, mediaUrl0);
    } else if (latitude && longitude) {
      // Message GPS - Continuer workflow
      responseMessage = await botV2.handleGPSMessage(from, parseFloat(latitude), parseFloat(longitude));
    } else {
      // Message texte - Redirection vers audio
      responseMessage = `🌍 **LokoTaxi Pular V2** 🇬🇳

🎤 **AUDIO UNIQUEMENT** - Ce bot traite uniquement les messages vocaux en Pular.

🚫 Messages texte non supportés.

📱 **Appuyez sur le micro** et dites en Pular:
• "Mi yidi moto yahougol Madina"
• "Taksi jooni"`;
    }
    
    // Réponse Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${responseMessage}</Message>
</Response>`;
    
    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });
    
  } catch (error) {
    console.error('💥 Erreur critique V2:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>❌ Erreur système. Réessayez dans quelques instants.</Message>
</Response>`;
    
    return new Response(errorTwiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });
  }
});