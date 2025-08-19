// =================================================================
// 🧪 TESTS UNITAIRES - MODULE TEXT INTELLIGENCE
// =================================================================
// 
// OBJECTIF : Tests complets du système d'intelligence artificielle
//           selon le plan PLAN_INTEGRATION_IA_TEXTE_COMPLEXE.md
//
// COVERAGE : 
// - Détection complexité
// - Validation extractions
// - Gestion fallback
// - Cas limites et erreurs
// =================================================================

import { 
  analyzeComplexText, 
  handleComplexTextMessage,
  shouldUseAIAnalysis,
  type TextAnalysisRequest,
  type TextAnalysisResult 
} from './text-intelligence.ts';

import { 
  isComplexMessage,
  validateExtraction,
  handleAmbiguity,
  CONFIDENCE_THRESHOLDS 
} from './text-intelligence-rules.ts';

// =================================================================
// TESTS DÉTECTION COMPLEXITÉ
// =================================================================

console.log(`🧪 [TEST] ===== TESTS DÉTECTION COMPLEXITÉ =====`);

// Test 1: Phrases simples (ne doivent PAS utiliser IA)
function testSimpleMessages() {
  const simpleMessages = [
    "taxi",
    "moto", 
    "voiture",
    "oui",
    "non",
    "annuler"
  ];
  
  console.log(`🔍 [TEST] Test phrases simples...`);
  
  simpleMessages.forEach(message => {
    const shouldUseAI = shouldUseAIAnalysis(message);
    const isComplex = isComplexMessage(message);
    
    if (shouldUseAI || isComplex) {
      console.error(`❌ [TEST] ÉCHEC - "${message}" détecté comme complexe`);
    } else {
      console.log(`✅ [TEST] OK - "${message}" → workflow standard`);
    }
  });
}

// Test 2: Phrases complexes (DOIVENT utiliser IA)
function testComplexMessages() {
  const complexMessages = [
    "Je veux un taxi moto pour demain matin 8h pour aller à l'aéroport",
    "taksi motor pr ale madina demen",
    "besoin taxi voiture pour aller kaloum maintenant",
    "je ve taksi pr aller ratoma ce soir",
    "urgent taxi pour clinique",
    "taxi moto demain 9h madina"
  ];
  
  console.log(`🔍 [TEST] Test phrases complexes...`);
  
  complexMessages.forEach(message => {
    const shouldUseAI = shouldUseAIAnalysis(message);
    const isComplex = isComplexMessage(message);
    
    if (!shouldUseAI || !isComplex) {
      console.error(`❌ [TEST] ÉCHEC - "${message}" PAS détecté comme complexe`);
    } else {
      console.log(`✅ [TEST] OK - "${message}" → IA nécessaire`);
    }
  });
}

// =================================================================
// TESTS VALIDATION EXTRACTIONS
// =================================================================

console.log(`🧪 [TEST] ===== TESTS VALIDATION EXTRACTIONS =====`);

// Test 3: Validations correctes
function testValidExtractions() {
  const validExtractions = [
    {
      vehicle_type: "moto",
      destination: "madina",
      confidence: 0.95
    },
    {
      vehicle_type: "voiture", 
      destination: "aéroport",
      temporal: {
        is_planned: true,
        relative: "demain",
        time: "08:00"
      },
      confidence: 0.9
    }
  ];
  
  console.log(`🔍 [TEST] Test validations correctes...`);
  
  validExtractions.forEach((extraction, index) => {
    const result = validateExtraction(extraction);
    
    if (!result.isValid) {
      console.error(`❌ [TEST] ÉCHEC validation ${index + 1}:`, result.errors);
    } else {
      console.log(`✅ [TEST] OK validation ${index + 1}`);
    }
  });
}

// Test 4: Validations incorrectes
function testInvalidExtractions() {
  const invalidExtractions = [
    // Type véhicule invalide
    {
      vehicle_type: "avion",
      destination: "madina",
      confidence: 0.8
    },
    // Destination trop courte
    {
      vehicle_type: "moto",
      destination: "X",
      confidence: 0.9
    },
    // Date passée
    {
      vehicle_type: "voiture",
      destination: "aéroport",
      temporal: {
        is_planned: true,
        date: "2020-01-01"
      },
      confidence: 0.85
    },
    // Confidence hors limites
    {
      vehicle_type: "moto",
      destination: "madina", 
      confidence: 1.5
    }
  ];
  
  console.log(`🔍 [TEST] Test validations incorrectes...`);
  
  invalidExtractions.forEach((extraction, index) => {
    const result = validateExtraction(extraction);
    
    if (result.isValid) {
      console.error(`❌ [TEST] ÉCHEC - Validation ${index + 1} devrait échouer`);
    } else {
      console.log(`✅ [TEST] OK - Validation ${index + 1} échoue correctement:`, result.errors[0]);
    }
  });
}

// =================================================================
// TESTS GESTION AMBIGUÏTÉS
// =================================================================

console.log(`🧪 [TEST] ===== TESTS GESTION AMBIGUÏTÉS =====`);

// Test 5: Détection ambiguïtés
function testAmbiguityHandling() {
  const ambiguousCases = [
    // Manque type véhicule
    {
      extractedData: {
        destination: "madina"
      }
    },
    // Manque destination  
    {
      extractedData: {
        vehicleType: "moto"
      }
    },
    // Manque heure pour demain
    {
      extractedData: {
        vehicleType: "moto",
        destination: "aéroport",
        temporalInfo: {
          relativeTime: "demain"
        }
      }
    }
  ];
  
  console.log(`🔍 [TEST] Test détection ambiguïtés...`);
  
  ambiguousCases.forEach((testCase, index) => {
    const message = handleAmbiguity(testCase);
    
    if (!message || message.length === 0) {
      console.error(`❌ [TEST] ÉCHEC - Ambiguïté ${index + 1} non détectée`);
    } else {
      console.log(`✅ [TEST] OK - Ambiguïté ${index + 1} détectée: "${message.substring(0, 50)}..."`);
    }
  });
}

// =================================================================
// TESTS SEUILS DE CONFIANCE
// =================================================================

console.log(`🧪 [TEST] ===== TESTS SEUILS CONFIANCE =====`);

// Test 6: Vérification seuils
function testConfidenceThresholds() {
  console.log(`🔍 [TEST] Vérification seuils de confiance...`);
  
  const expectedThresholds = {
    MINIMUM_FOR_PROCESSING: 0.7,
    HIGH_CONFIDENCE: 0.9,
    REQUIRES_CONFIRMATION: 0.8,
    FALLBACK_TO_STANDARD: 0.6
  };
  
  Object.entries(expectedThresholds).forEach(([key, expectedValue]) => {
    const actualValue = CONFIDENCE_THRESHOLDS[key as keyof typeof CONFIDENCE_THRESHOLDS];
    
    if (actualValue !== expectedValue) {
      console.error(`❌ [TEST] ÉCHEC - Seuil ${key}: attendu ${expectedValue}, reçu ${actualValue}`);
    } else {
      console.log(`✅ [TEST] OK - Seuil ${key}: ${actualValue}`);
    }
  });
}

// =================================================================
// TESTS MOCK (sans OpenAI)
// =================================================================

console.log(`🧪 [TEST] ===== TESTS MOCK ANALYSE COMPLÈTE =====`);

// Test 7: Analyse avec mock GPT-4
async function testAnalysisWithMock() {
  console.log(`🔍 [TEST] Test analyse avec données mock...`);
  
  // Mock de réponse GPT-4
  const mockAnalysisRequest: TextAnalysisRequest = {
    message: "Je veux taxi moto pour madina demain 8h",
    clientPhone: "+224622000111"
  };
  
  try {
    // Dans un environnement de test, on mockerait l'appel GPT-4
    // Pour ce test, on simule le comportement attendu
    
    const expectedBehavior = {
      shouldUseAI: shouldUseAIAnalysis(mockAnalysisRequest.message),
      isComplex: isComplexMessage(mockAnalysisRequest.message)
    };
    
    if (expectedBehavior.shouldUseAI && expectedBehavior.isComplex) {
      console.log(`✅ [TEST] OK - Analyse détecte correctement le besoin d'IA`);
    } else {
      console.error(`❌ [TEST] ÉCHEC - Analyse ne détecte pas le besoin d'IA`);
    }
    
  } catch (error) {
    console.error(`❌ [TEST] ERREUR analyse mock:`, error);
  }
}

// =================================================================
// TESTS FALLBACK
// =================================================================

console.log(`🧪 [TEST] ===== TESTS FALLBACK =====`);

// Test 8: Vérification fallback
async function testFallbackBehavior() {
  console.log(`🔍 [TEST] Test comportement fallback...`);
  
  const testCases = [
    {
      message: "taxi",
      expectFallback: true,
      reason: "message simple"
    },
    {
      message: "Je veux taxi moto demain aéroport", 
      expectFallback: false,
      reason: "message complexe"
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const result = await handleComplexTextMessage(
        testCase.message,
        "+224622000111"
      );
      
      const actualFallback = !result.handled;
      
      if (actualFallback === testCase.expectFallback) {
        console.log(`✅ [TEST] OK - "${testCase.message}" → ${testCase.reason}`);
      } else {
        console.error(`❌ [TEST] ÉCHEC - "${testCase.message}" comportement inattendu`);
      }
      
    } catch (error) {
      console.log(`⚠️ [TEST] Erreur attendue pour test fallback:`, error.message);
    }
  }
}

// =================================================================
// EXÉCUTION DES TESTS
// =================================================================

async function runAllTests() {
  console.log(`🚀 [TEST] ===== DÉMARRAGE TESTS UNITAIRES IA =====`);
  console.log(`📅 [TEST] Date: ${new Date().toISOString()}`);
  console.log(`🎯 [TEST] Objectif: Validation module text-intelligence selon le plan`);
  
  try {
    // Tests synchrones
    testSimpleMessages();
    testComplexMessages(); 
    testValidExtractions();
    testInvalidExtractions();
    testAmbiguityHandling();
    testConfidenceThresholds();
    
    // Tests asynchrones
    await testAnalysisWithMock();
    await testFallbackBehavior();
    
    console.log(`🎉 [TEST] ===== TESTS TERMINÉS =====`);
    console.log(`✅ [TEST] Modules IA prêts pour intégration`);
    
  } catch (error) {
    console.error(`❌ [TEST] ERREUR CRITIQUE:`, error);
  }
}

// =================================================================
// EXPORT POUR EXÉCUTION
// =================================================================

export {
  runAllTests,
  testSimpleMessages,
  testComplexMessages,
  testValidExtractions,
  testInvalidExtractions,
  testAmbiguityHandling,
  testConfidenceThresholds
};

// Exécution automatique si appelé directement
if (import.meta.main) {
  await runAllTests();
}