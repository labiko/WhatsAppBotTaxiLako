// =================================================================
// 🛡️ MODULE RÈGLES DE GESTION - TEXT INTELLIGENCE
// =================================================================
// 
// OBJECTIF : Règles de validation et détection de complexité
//           pour le système d'intelligence artificielle
//
// RESPONSABILITÉ : 
// - Détecter si un message nécessite l'IA
// - Valider les extractions IA selon les règles métier
// - Gérer les ambiguïtés et cas limites
// =================================================================

// =================================================================
// INTERFACES DE VALIDATION
// =================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ComplexityIndicators {
  minWordCount: number;
  multipleKeywords: string[][];
  temporalKeywords: string[];
  destinationKeywords: string[];
  vehicleKeywords: string[];
}

// =================================================================
// CONFIGURATION DÉTECTION DE COMPLEXITÉ
// =================================================================

const COMPLEXITY_INDICATORS: ComplexityIndicators = {
  // Longueur minimale suggérant une phrase complexe
  minWordCount: 4,
  
  // Mots-clés multiples dans une phrase (combinaisons qui nécessitent IA)
  multipleKeywords: [
    ['taxi', 'moto', 'demain'],
    ['taxi', 'voiture', 'aéroport'],
    ['moto', 'pour', 'aller'],
    ['besoin', 'taxi', 'pour'],
    ['veux', 'taxi', 'moto'],
    ['taksi', 'motor', 'pr'], // Avec fautes
    ['je', 'veux', 'aller'],
    ['urgent', 'taxi', 'maintenant']
  ],
  
  // Indicateurs temporels
  temporalKeywords: [
    'demain', 'aujourd\'hui', 'ce soir', 'ce matin',
    'après-midi', 'midi', 'minuit', 'tantôt',
    'bientôt', 'plus tard', 'urgent', 'maintenant',
    'demen', 'dman', 'ojourdui', // Avec fautes courantes
    '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h',
    'matin', 'soir', 'nuit'
  ],
  
  // Indicateurs de destination
  destinationKeywords: [
    'pour aller', 'vers', 'jusqu\'à', 'direction',
    'pour', 'à destination', 'arriver à', 'aller à',
    'pr ale', 'pr aller', 'vers le', 'vers la', // Avec fautes
    'aéroport', 'aerport', 'madina', 'kaloum', 'kipé', 'kipe',
    'ratoma', 'bambeto', 'simbaya', 'gbessia'
  ],

  // Types de véhicules (pour validation)
  vehicleKeywords: [
    'moto', 'voiture', 'motor', 'voitur', // Avec fautes courantes
    'taksi', 'taxi'
  ]
};

// =================================================================
// FONCTION PRINCIPALE DÉTECTION COMPLEXITÉ
// =================================================================

export function isComplexMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  const words = normalizedMessage.split(/\s+/);
  
  console.log(`🔍 [RULES] Analyse complexité: "${message}" (${words.length} mots)`);
  
  // 1. Vérifier longueur minimale
  if (words.length < COMPLEXITY_INDICATORS.minWordCount) {
    console.log(`📏 [RULES] Message trop court (${words.length} < ${COMPLEXITY_INDICATORS.minWordCount})`);
    return false;
  }
  
  // 2. Vérifier combinaisons de mots-clés
  const hasMultipleKeywords = COMPLEXITY_INDICATORS.multipleKeywords.some(keywords => {
    const found = keywords.filter(keyword => normalizedMessage.includes(keyword));
    return found.length >= 2; // Au moins 2 mots-clés de la combinaison
  });
  
  if (hasMultipleKeywords) {
    console.log(`🎯 [RULES] Mots-clés multiples détectés → IA nécessaire`);
    return true;
  }
  
  // 3. Vérifier indicateurs temporels
  const hasTemporalIndicators = COMPLEXITY_INDICATORS.temporalKeywords.some(keyword =>
    normalizedMessage.includes(keyword)
  );
  
  if (hasTemporalIndicators) {
    console.log(`⏰ [RULES] Indicateurs temporels détectés → IA nécessaire`);
    return true;
  }
  
  // 4. Vérifier patterns de destination
  const hasDestinationPattern = COMPLEXITY_INDICATORS.destinationKeywords.some(keyword =>
    normalizedMessage.includes(keyword)
  );
  
  if (hasDestinationPattern && words.length >= 3) {
    console.log(`📍 [RULES] Pattern destination détecté → IA nécessaire`);
    return true;
  }
  
  // 5. Vérifier phrases avec fautes mais intentions claires
  if (hasClearIntentWithTypos(normalizedMessage)) {
    console.log(`🔤 [RULES] Intention claire avec fautes → IA nécessaire`);
    return true;
  }
  
  console.log(`✋ [RULES] Message simple détecté → Workflow standard`);
  return false;
}

// =================================================================
// DÉTECTION INTENTIONS AVEC FAUTES
// =================================================================

function hasClearIntentWithTypos(message: string): boolean {
  // Patterns courants avec fautes d'orthographe
  const typoPatterns = [
    /je\s+(ve|veu|veux)\s+(taksi|taxi)/i,        // "je ve taksi"
    /taksi\s+(motor|moto)\s+pr/i,                // "taksi motor pr"
    /besoin\s+(taksi|taxi)\s+(moto|voiture)/i,   // "besoin taksi moto"
    /(urgent|urgant)\s+(taksi|taxi)/i,           // "urgent taksi"
    /aller\s+([a-zA-Z]+)\s+(demen|demain)/i      // "aller madina demen"
  ];
  
  return typoPatterns.some(pattern => pattern.test(message));
}

// =================================================================
// VALIDATION DES EXTRACTIONS IA
// =================================================================

export function validateExtraction(extraction: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log(`🔍 [RULES] Validation extraction:`, JSON.stringify(extraction));
  
  // 1. Vérifier structure de base
  if (!extraction || typeof extraction !== 'object') {
    errors.push("Format extraction invalide");
    return { isValid: false, errors };
  }
  
  // 2. Valider le type de véhicule
  if (extraction.vehicle_type) {
    if (!['moto', 'voiture'].includes(extraction.vehicle_type)) {
      errors.push(`Type véhicule invalide: ${extraction.vehicle_type}`);
    }
  }
  
  // 3. Valider la destination
  if (extraction.destination) {
    if (typeof extraction.destination !== 'string' || extraction.destination.length < 2) {
      errors.push("Destination trop courte ou invalide");
    }
    
    // Vérifier destinations connues de Conakry
    if (!isValidConakryDestination(extraction.destination)) {
      warnings.push(`Destination non reconnue pour Conakry: ${extraction.destination}`);
    }
  }
  
  // 4. Valider les informations temporelles
  if (extraction.temporal) {
    const temporalErrors = validateTemporalInfo(extraction.temporal);
    errors.push(...temporalErrors);
  }
  
  // 5. Vérifier cohérence confidence
  if (extraction.confidence !== undefined) {
    if (typeof extraction.confidence !== 'number' || 
        extraction.confidence < 0 || extraction.confidence > 1) {
      errors.push("Confidence doit être entre 0 et 1");
    }
  }
  
  // 6. Validation combinaisons logiques
  const logicErrors = validateLogicalCombinations(extraction);
  errors.push(...logicErrors);
  
  const isValid = errors.length === 0;
  
  console.log(`${isValid ? '✅' : '❌'} [RULES] Validation ${isValid ? 'réussie' : 'échouée'}`);
  if (!isValid) console.log(`❌ [RULES] Erreurs:`, errors);
  if (warnings.length > 0) console.log(`⚠️ [RULES] Avertissements:`, warnings);
  
  return {
    isValid,
    errors,
    warnings
  };
}

// =================================================================
// VALIDATION INFORMATIONS TEMPORELLES
// =================================================================

function validateTemporalInfo(temporal: any): string[] {
  const errors: string[] = [];
  
  if (!temporal || typeof temporal !== 'object') {
    errors.push("Informations temporelles invalides");
    return errors;
  }
  
  // Vérifier date
  if (temporal.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(temporal.date)) {
      errors.push(`Format date invalide: ${temporal.date} (attendu YYYY-MM-DD)`);
    } else {
      const date = new Date(temporal.date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 30); // Maximum 30 jours
      
      if (date < today) {
        errors.push("Date passée non autorisée");
      }
      
      if (date > maxDate) {
        errors.push("Date trop éloignée (maximum 30 jours)");
      }
    }
  }
  
  // Vérifier heure
  if (temporal.time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(temporal.time)) {
      errors.push(`Format heure invalide: ${temporal.time} (attendu HH:MM)`);
    }
  }
  
  // Vérifier cohérence is_planned
  if (temporal.is_planned && !temporal.date && !temporal.time && !temporal.relative) {
    errors.push("Réservation planifiée sans information temporelle");
  }
  
  return errors;
}

// =================================================================
// VALIDATION COMBINAISONS LOGIQUES
// =================================================================

function validateLogicalCombinations(extraction: any): string[] {
  const errors: string[] = [];
  
  // Si pas de véhicule ni destination → extraction inutile
  if (!extraction.vehicle_type && !extraction.destination) {
    errors.push("Aucune information utile extraite");
  }
  
  // Si destination mais pas de véhicule pour phrases courtes
  if (extraction.destination && !extraction.vehicle_type) {
    const message = extraction.raw_transcript || '';
    if (message.length < 20) { // Phrase courte devrait avoir le véhicule
      errors.push("Destination sans type véhicule sur phrase courte");
    }
  }
  
  return errors;
}

// =================================================================
// VALIDATION DESTINATIONS CONAKRY
// =================================================================

function isValidConakryDestination(destination: string): boolean {
  const knownDestinations = [
    // Quartiers principaux
    'madina', 'kaloum', 'kipé', 'kipe', 'ratoma', 'bambeto',
    'simbaya', 'petit simbaya', 'gbessia', 'hafia',
    'dixinn', 'belle vue', 'bellevue',
    
    // Lieux importants
    'aéroport', 'aerport', 'aeroport', 'université', 'universite',
    'hôpital', 'hopital', 'clinique', 'marché', 'marche',
    'mosquée', 'mosquee', 'église', 'eglise',
    
    // Transport
    'gare', 'port', 'station'
  ];
  
  const normalizedDest = destination.toLowerCase();
  return knownDestinations.some(known => 
    normalizedDest.includes(known) || known.includes(normalizedDest)
  );
}

// =================================================================
// GESTION DES AMBIGUÏTÉS
// =================================================================

export function handleAmbiguity(analysis: any): string {
  const ambiguities: string[] = [];
  
  if (!analysis.extractedData?.vehicleType) {
    ambiguities.push("type de véhicule (moto ou voiture)");
  }
  
  if (!analysis.extractedData?.destination) {
    ambiguities.push("destination");
  }
  
  if (analysis.extractedData?.temporalInfo?.relativeTime === 'demain' && 
      !analysis.extractedData?.temporalInfo?.time) {
    ambiguities.push("heure exacte pour demain");
  }
  
  if (ambiguities.length > 0) {
    return `J'ai compris votre demande mais j'ai besoin de précisions sur : ${ambiguities.join(', ')}`;
  }
  
  return '';
}

// =================================================================
// CONFIGURATION SEUILS DE CONFIANCE
// =================================================================

export const CONFIDENCE_THRESHOLDS = {
  MINIMUM_FOR_PROCESSING: 0.7,    // Seuil minimum pour traiter
  HIGH_CONFIDENCE: 0.9,           // Confiance élevée
  REQUIRES_CONFIRMATION: 0.8,     // Nécessite confirmation utilisateur
  FALLBACK_TO_STANDARD: 0.6       // Retour workflow standard
};

// =================================================================
// UTILITAIRES RÈGLES MÉTIER
// =================================================================

export function getBusinessRules(): any {
  return {
    // Heures de service
    serviceHours: {
      start: 6,  // 6h00
      end: 23    // 23h00
    },
    
    // Types de véhicules autorisés PHASE 1
    allowedVehicles: ['moto', 'voiture'],
    
    // Capacités max
    maxCapacity: {
      moto: 2,
      voiture: 4
    },
    
    // Zone de service
    serviceArea: 'Conakry'
  };
}

// =================================================================
// EXPORT PRINCIPAL
// =================================================================

export {
  COMPLEXITY_INDICATORS
};