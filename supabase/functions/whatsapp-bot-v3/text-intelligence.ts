// =================================================================
// 🤖 MODULE TEXT INTELLIGENCE - BOT LOKOTAXI V2
// =================================================================
// 
// OBJECTIF : Analyser les textes complexes avec GPT-4 et extraire 
//           les informations structurées pour le bot WhatsApp
//
// ARCHITECTURE : Module séparé, injection minimale dans bot existant
// FALLBACK : Si IA échoue → retour au workflow standard
// =================================================================

import { isComplexMessage, validateExtraction } from './text-intelligence-rules.ts';

// =================================================================
// CONSTANTES ET FONCTIONS COPIÉES DEPUIS INDEX.TS
// =================================================================

// Constantes Supabase
const SUPABASE_URL = 'https://nmwnibzgvwltipmtwhzo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M';
let workingApiKey = SUPABASE_SERVICE_KEY;

// Interface Session
interface Session {
  vehicleType?: string
  positionClient?: string
  destinationNom?: string
  destinationId?: string
  destinationPosition?: string
  departNom?: string
  departId?: string
  departPosition?: string
  distanceKm?: number
  prixEstime?: number
  prixConfirme?: boolean
  etat?: string
  timestamp?: number
  plannedDate?: string
  plannedHour?: number
  plannedMinute?: number
  temporalPlanning?: boolean
  suggestionsDepart?: string
  suggestionsDestination?: string
  waitingForNote?: boolean
  waitingForComment?: boolean
  reservationToRate?: string
  currentRating?: number
}

// Fonction normalizePhone
const normalizePhone = (phone: string): string => {
  return phone.replace(/^whatsapp:/, '').replace(/\s+/g, '').trim();
};

// Fonction fetchWithRetry
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 [IA-SESSION] Tentative ${i + 1}/${maxRetries}: ${url}`);
      const response = await fetch(url, options);
      if (response.status === 503) {
        console.log(`⏳ [IA-SESSION] Service indisponible (503), retry dans ${(i + 1) * 1000}ms...`);
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
          continue;
        }
      }
      return response;
    } catch (error) {
      console.log(`❌ [IA-SESSION] Erreur tentative ${i + 1}: ${error.message}`);
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error('Max retries reached');
}

// Fonction saveSession
async function saveSession(phone: string, data: any): Promise<void> {
  try {
    console.log(`🚨 [IA-SESSION] ENTRÉE DANS saveSession pour phone: ${phone}`);
    console.log(`🚨 [IA-SESSION] data reçu:`, JSON.stringify(data, null, 2));
    
    const sessionData = {
      client_phone: phone,
      vehicle_type: data.vehicleType || null,
      position_client: data.positionClient || null,
      destination_nom: data.destinationNom || null,
      destination_id: (data.destinationId && !data.destinationId.startsWith('google_')) ? data.destinationId : null,
      destination_position: data.destinationPosition || null,
      depart_nom: data.departNom || null,
      depart_id: (data.departId && !data.departId.startsWith('google_')) ? data.departId : null,
      depart_position: data.departPosition || null,
      distance_km: data.distanceKm || null,
      prix_estime: data.prixEstime || null,
      prix_confirme: data.prixConfirme || false,
      etat: data.etat || 'initial',
      planned_date: data.plannedDate || null,
      planned_hour: data.plannedHour || null,
      planned_minute: data.plannedMinute || null,
      temporal_planning: data.temporalPlanning || false,
      suggestions_depart: data.suggestionsDepart || null,
      suggestions_destination: data.suggestionsDestination || null,
      waiting_for_note: data.waitingForNote || false,
      waiting_for_comment: data.waitingForComment || false,
      reservation_to_rate: data.reservationToRate || null,
      current_rating: data.currentRating || null,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    };

    console.log(`🚨 [IA-SESSION] sessionData construit:`, JSON.stringify(sessionData, null, 2));
    
    console.log(`💾 [IA-SESSION] UPSERT session pour ${phone}`);
    
    const response = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingApiKey}`,
        'apikey': workingApiKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(sessionData)
    });
    
    console.log(`🚨 [IA-SESSION] APRÈS fetchWithRetry, response.ok: ${response.ok}, status: ${response.status}`);

    if (response.ok) {
      console.log(`💾 [IA-SESSION] Session sauvée: ${phone} → État: ${data.etat}`);
      console.log(`✅ [IA-SESSION] HTTP Status: ${response.status}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ [IA-SESSION] Erreur HTTP ${response.status}: ${errorText}`);
      console.error(`❌ [IA-SESSION] Request body:`, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error(`❌ [IA-SESSION] Exception sauvegarde session: ${error.message}`);
  }
}

// =================================================================
// INTERFACES SELON LE PLAN
// =================================================================

// Interface d'entrée
export interface TextAnalysisRequest {
  message: string;
  clientPhone: string;
  currentSession?: any;
  context?: {
    lastMessages?: string[];
    location?: { lat: number; lon: number };
  };
}

// Interface de sortie
export interface TextAnalysisResult {
  isComplex: boolean;
  confidence: number;
  extractedData?: {
    vehicleType?: 'moto' | 'voiture';
    destination?: string;
    departure?: string;
    temporalInfo?: {
      type: 'immediate' | 'planned';
      date?: string;
      time?: string;
      relativeTime?: string; // "demain", "ce soir", etc.
    };
    action?: 'new_booking' | 'modification' | 'cancellation' | 'question';
  };
  suggestedResponse?: string;
  requiresConfirmation?: boolean;
  fallbackToStandardFlow?: boolean;
}

// =================================================================
// CONFIGURATION OPENAI
// =================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// =================================================================
// PROMPT GPT-4 OPTIMISÉ SELON LE PLAN
// =================================================================

const COMPLEX_TEXT_ANALYSIS_PROMPT = `
Tu es un assistant spécialisé dans l'analyse de demandes de taxi en français à Conakry, Guinée.
Extrais les informations suivantes d'un message client, même avec des fautes d'orthographe.

Message client : "{message}"

Extrais et retourne UNIQUEMENT en JSON :
{
  "vehicle_type": "moto" | "voiture" | null,
  "destination": "nom du lieu" | null,
  "departure": "lieu de départ si mentionné" | null,
  "temporal": {
    "is_planned": boolean,
    "date": "YYYY-MM-DD" | null,
    "time": "HH:MM" | null,
    "relative": "demain" | "ce soir" | etc | null
  },
  "confidence": 0.0 à 1.0
}

RÈGLE IMPORTANTE: Si le client dit "taxi" sans préciser moto/voiture, mets vehicle_type: "voiture" (type par défaut en Guinée).

Exemples :
- "Je veux taxi moto demain pour aéroport" → vehicle_type: "moto", destination: "aéroport", temporal.relative: "demain"
- "Je veux un taxi pour aller à l'hôpital" → vehicle_type: "voiture", destination: "hôpital"
- "Taksi motor pr madina" → vehicle_type: "moto", destination: "madina"
- "je ve taksi voiture pr ale kaloum demen 8h" → vehicle_type: "voiture", destination: "kaloum", temporal.relative: "demain", temporal.time: "08:00"

Sois tolérant aux fautes d'orthographe. Si pas sûr, mets null.
`;

// =================================================================
// FONCTION PRINCIPALE D'ANALYSE
// =================================================================

export async function analyzeComplexText(
  request: TextAnalysisRequest
): Promise<TextAnalysisResult> {
  console.log(`🤖 [TEXT-INTELLIGENCE] Analyse demande: "${request.message}"`);
  
  try {
    // 1. Vérifier si le message nécessite l'IA
    if (!isComplexMessage(request.message)) {
      console.log(`🔄 [TEXT-INTELLIGENCE] Message simple détecté, fallback au workflow standard`);
      return {
        isComplex: false,
        confidence: 0,
        fallbackToStandardFlow: true
      };
    }

    console.log(`🧠 [TEXT-INTELLIGENCE] Message complexe détecté, appel GPT-4...`);

    // 2. Appel GPT-4
    const aiResponse = await callGPT4Analysis(request.message);
    
    if (!aiResponse) {
      console.log(`❌ [TEXT-INTELLIGENCE] Échec GPT-4, fallback au workflow standard`);
      return {
        isComplex: true,
        confidence: 0,
        fallbackToStandardFlow: true
      };
    }

    // 3. Validation des résultats
    const validationResult = validateExtraction(aiResponse);
    
    if (!validationResult.isValid) {
      console.log(`⚠️ [TEXT-INTELLIGENCE] Validation échouée: ${validationResult.errors.join(', ')}`);
      return {
        isComplex: true,
        confidence: 0.5,
        fallbackToStandardFlow: true
      };
    }

    // 4. Construction du résultat
    const result: TextAnalysisResult = {
      isComplex: true,
      confidence: aiResponse.confidence || 0.8,
      extractedData: {
        vehicleType: aiResponse.vehicle_type,
        destination: aiResponse.destination,
        departure: aiResponse.departure,
        temporalInfo: aiResponse.temporal ? {
          type: aiResponse.temporal.is_planned ? 'planned' : 'immediate',
          date: aiResponse.temporal.date,
          time: aiResponse.temporal.time,
          relativeTime: aiResponse.temporal.relative
        } : undefined,
        action: 'new_booking' // Par défaut pour cette version
      },
      fallbackToStandardFlow: false
    };

    console.log(`✅ [TEXT-INTELLIGENCE] Analyse réussie:`, JSON.stringify(result.extractedData));
    return result;

  } catch (error) {
    console.error(`❌ [TEXT-INTELLIGENCE] Erreur analyse:`, error);
    return {
      isComplex: true,
      confidence: 0,
      fallbackToStandardFlow: true
    };
  }
}

// =================================================================
// APPEL GPT-4 AVEC GESTION D'ERREURS
// =================================================================

async function callGPT4Analysis(message: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    console.log(`⚠️ [TEXT-INTELLIGENCE] Clé OpenAI manquante`);
    return null;
  }

  const prompt = COMPLEX_TEXT_ANALYSIS_PROMPT.replace('{message}', message.replace(/"/g, '\\"'));

  console.log(`🔍 [TEXT-INTELLIGENCE] Prompt envoyé:`, prompt.substring(0, 200) + '...');

  try {
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en analyse de demandes de taxi. Réponds UNIQUEMENT en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    };
    
    console.log(`🔍 [TEXT-INTELLIGENCE] Requête OpenAI:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
      // Pas de double timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TEXT-INTELLIGENCE] Erreur API OpenAI: ${response.status}`);
      console.error(`❌ [TEXT-INTELLIGENCE] Détail erreur:`, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error(`❌ [TEXT-INTELLIGENCE] Pas de contenu dans réponse OpenAI`);
      return null;
    }

    console.log(`🔍 [TEXT-INTELLIGENCE] Contenu brut reçu:`, content);

    // Nettoyer le contenu - supprimer les balises markdown
    let cleanContent = content.trim();
    
    // Supprimer les balises ```json et ``` si présentes
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log(`🧹 [TEXT-INTELLIGENCE] Contenu nettoyé:`, cleanContent);

    // Parse JSON nettoyé
    const parsed = JSON.parse(cleanContent.trim());
    console.log(`🤖 [TEXT-INTELLIGENCE] Réponse GPT-4 parsée:`, JSON.stringify(parsed));
    
    return parsed;

  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log(`⏰ [TEXT-INTELLIGENCE] Timeout GPT-4 (3s), fallback au workflow standard`);
    } else {
      console.error(`❌ [TEXT-INTELLIGENCE] Erreur GPT-4:`, error);
    }
    return null;
  }
}

// =================================================================
// FONCTION DE GESTION DES RÉSULTATS COMPLEXES
// =================================================================

export async function handleComplexTextMessage(
  message: string,
  clientPhone: string,
  session: any = null
): Promise<{ handled: boolean; response?: string }> {
  
  console.log(`🔄 [TEXT-INTELLIGENCE] Traitement message complexe pour ${clientPhone}`);
  
  try {
    // 1. Analyser avec IA
    const analysis = await analyzeComplexText({ 
      message, 
      clientPhone, 
      currentSession: session 
    });
    
    // 2. Si confidence trop faible, fallback
    if (analysis.confidence < 0.7 || analysis.fallbackToStandardFlow) {
      console.log(`⚠️ [TEXT-INTELLIGENCE] Confidence faible (${analysis.confidence}), retour au flow standard`);
      return { handled: false };
    }
    
    // 3. Si données critiques manquantes, demander clarification
    if (!analysis.extractedData?.vehicleType) {
      return {
        handled: true,
        response: "J'ai compris que vous voulez un taxi. Précisez-vous 'moto' ou 'voiture' ?"
      };
    }
    
    // 4. Sauvegarder les données IA dans la session AVANT de poser la question
    const phoneNormalized = normalizePhone(clientPhone);
    
    console.log(`💾 [IA-SESSION] Sauvegarde données IA extraites...`);
    
    // Calculer la vraie date pour les termes relatifs
    let calculatedDate = analysis.extractedData.temporalInfo?.date;
    const now = new Date();
    
    if (analysis.extractedData.temporalInfo?.relativeTime === 'demain') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      calculatedDate = tomorrow.toISOString().split('T')[0]; // Format YYYY-MM-DD
      console.log(`📅 [IA-SESSION] "demain" converti en date: ${calculatedDate}`);
    } else if (analysis.extractedData.temporalInfo?.relativeTime === "aujourd'hui") {
      calculatedDate = now.toISOString().split('T')[0];
      console.log(`📅 [IA-SESSION] "aujourd'hui" converti en date: ${calculatedDate}`);
    } else if (analysis.extractedData.temporalInfo?.relativeTime === 'ce soir') {
      // "Ce soir" = aujourd'hui vers 19h si pas d'heure spécifiée
      calculatedDate = now.toISOString().split('T')[0];
      console.log(`📅 [IA-SESSION] "ce soir" converti en date: ${calculatedDate} (aujourd'hui)`);
    } else if (analysis.extractedData.temporalInfo?.relativeTime === 'ce matin') {
      // "Ce matin" = aujourd'hui vers 9h si pas d'heure spécifiée
      calculatedDate = now.toISOString().split('T')[0];
      console.log(`📅 [IA-SESSION] "ce matin" converti en date: ${calculatedDate} (aujourd'hui)`);
    }
    
    // Calculer heure par défaut selon contexte temporel
    let plannedHour = analysis.extractedData.temporalInfo?.time ? parseInt(analysis.extractedData.temporalInfo.time.split(':')[0]) : null;
    let plannedMinute = analysis.extractedData.temporalInfo?.time ? parseInt(analysis.extractedData.temporalInfo.time.split(':')[1]) : null;
    
    // Heures par défaut si pas spécifiée
    if (!plannedHour && analysis.extractedData.temporalInfo?.relativeTime) {
      if (analysis.extractedData.temporalInfo.relativeTime === 'ce soir') {
        plannedHour = 19; // 19h par défaut pour "ce soir"
        plannedMinute = 0;
        console.log(`🕕 [IA-SESSION] "ce soir" → heure par défaut: 19h00`);
      } else if (analysis.extractedData.temporalInfo.relativeTime === 'ce matin') {
        plannedHour = 9;  // 9h par défaut pour "ce matin"
        plannedMinute = 0;
        console.log(`🌅 [IA-SESSION] "ce matin" → heure par défaut: 09h00`);
      }
    }
    
    // VALIDATION TEMPORELLE : Vérifier si l'heure demandée est dans le passé
    if (plannedHour !== null && analysis.extractedData.temporalInfo?.relativeTime === "aujourd'hui") {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const requestedMinute = plannedMinute || 0;
      
      // Comparer heure:minute actuelle vs demandée
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const requestedTotalMinutes = plannedHour * 60 + requestedMinute;
      
      if (requestedTotalMinutes <= currentTotalMinutes) {
        // L'heure est dans le passé → Reporter automatiquement à demain
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        calculatedDate = tomorrow.toISOString().split('T')[0];
        
        console.log(`⏰ [IA-SESSION] HEURE PASSÉE: ${plannedHour}:${requestedMinute.toString().padStart(2, '0')} déjà passé (maintenant: ${currentHour}:${currentMinute.toString().padStart(2, '0')})`);
        console.log(`📅 [IA-SESSION] → Reporté automatiquement à DEMAIN: ${calculatedDate} à ${plannedHour}:${requestedMinute.toString().padStart(2, '0')}`);
        
        // Modifier le terme relatif pour l'affichage
        analysis.extractedData.temporalInfo.relativeTime = 'demain (reporté auto)';
      } else {
        console.log(`✅ [IA-SESSION] Heure valide: ${plannedHour}:${requestedMinute.toString().padStart(2, '0')} aujourd'hui`);
      }
    }
    
    await saveSession(phoneNormalized, {
      vehicleType: analysis.extractedData.vehicleType,
      destinationNom: analysis.extractedData.destination,
      etat: "ia_attente_confirmation", // État spécifique IA - isolé des autres workflows
      temporalPlanning: analysis.extractedData.temporalInfo?.type === 'planned',
      plannedDate: calculatedDate,
      plannedHour: plannedHour,
      plannedMinute: plannedMinute
    });
    
    console.log(`✅ [IA-SESSION] Données IA sauvées avec état "ia_attente_confirmation"`);
    
    // 5. Générer réponse selon données extraites
    const response = generateSmartResponse(analysis.extractedData);
    
    return {
      handled: true,
      response: response
    };
    
  } catch (error) {
    console.error(`❌ [TEXT-INTELLIGENCE] Erreur traitement:`, error);
    // En cas d'erreur, retour au flow standard
    return { handled: false };
  }
}

// =================================================================
// GÉNÉRATION DE RÉPONSE INTELLIGENTE
// =================================================================

function generateSmartResponse(data: any): string {
  console.log(`💬 [TEXT-INTELLIGENCE] Génération réponse pour:`, JSON.stringify(data));
  
  let response = `✅ J'ai compris votre demande :\n`;
  
  if (data.vehicleType) {
    response += `• Type: ${data.vehicleType.toUpperCase()}\n`;
  }
  
  if (data.destination) {
    response += `• Destination: ${data.destination}\n`;
  }
  
  if (data.temporalInfo?.relativeTime) {
    response += `• Moment: ${data.temporalInfo.relativeTime}\n`;
  }
  
  if (data.temporalInfo?.time) {
    response += `• Heure: ${data.temporalInfo.time}\n`;
  }
  
  response += `\n🤔 Cette réservation est-elle pour vous ?\n\n`;
  response += `Répondez:\n`;
  response += `• "oui" → Partager votre position GPS\n`;
  response += `• "non" → Réservation pour quelqu'un d'autre`;
  
  return response;
}

// =================================================================
// FONCTION DE DÉTECTION DE BESOIN D'IA (selon le plan)
// =================================================================

export function shouldUseAIAnalysis(message: string): boolean {
  // NE PAS utiliser l'IA pour les messages simples
  if (message.length < 10) return false; // Trop court
  if (message === 'taxi') return false; // Commande simple
  if (message === 'moto' || message === 'voiture') return false; // Réponse simple
  if (message === 'oui' || message === 'non') return false; // Confirmation
  if (message === 'annuler') return false; // Commande simple
  
  // UTILISER l'IA pour les phrases complexes
  if (message.split(' ').length >= 4) return true; // Phrase de 4+ mots
  if (hasMultipleIntents(message)) return true; // Plusieurs intentions
  if (hasTemporalIndicators(message)) return true; // Mention temporelle
  if (hasDestinationPattern(message)) return true; // Pattern destination
  
  return false;
}

// =================================================================
// FONCTIONS UTILITAIRES DÉTECTION
// =================================================================

function hasMultipleIntents(message: string): boolean {
  const keywords = ['taxi', 'moto', 'voiture', 'aller', 'pour', 'demain', 'aéroport'];
  const found = keywords.filter(keyword => message.toLowerCase().includes(keyword));
  return found.length >= 2;
}

function hasTemporalIndicators(message: string): boolean {
  const temporalKeywords = [
    'demain', 'aujourd\'hui', 'ce soir', 'ce matin', 
    'après-midi', 'midi', 'minuit', 'tantôt',
    'bientôt', 'plus tard', 'urgent', 'maintenant'
  ];
  return temporalKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
}

function hasDestinationPattern(message: string): boolean {
  const destinationPatterns = [
    'pour aller', 'vers', 'jusqu\'à', 'direction',
    'pour', 'à destination', 'arriver à', 'aller à'
  ];
  return destinationPatterns.some(pattern => 
    message.toLowerCase().includes(pattern)
  );
}