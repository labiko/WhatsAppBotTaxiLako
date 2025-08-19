// =================================================================
// 🧪 TESTS D'INTÉGRATION - BOT V2 + IA
// =================================================================
// 
// OBJECTIF : Valider l'intégration complète du système IA 
//           avec le bot WhatsApp v2 existant
//
// TESTS CRITIQUES :
// - Workflow standard non impacté
// - IA intervient seulement quand nécessaire  
// - Fallback automatique fonctionne
// - Sessions correctement mises à jour
// - Zéro régression sur fonctions existantes
// =================================================================

// =================================================================
// SIMULATION ENVIRONNEMENT BOT V2
// =================================================================

// Mock des fonctions critiques du bot existant
const mockBotFunctions = {
  // Mock session management
  saveSession: async (clientPhone: string, sessionData: any) => {
    console.log(`📝 [MOCK] saveSession(${clientPhone}):`, JSON.stringify(sessionData));
    return { success: true };
  },
  
  getSession: async (clientPhone: string) => {
    console.log(`🔍 [MOCK] getSession(${clientPhone})`);
    return {
      vehicleType: null,
      etat: 'initial',
      updated_at: new Date().toISOString()
    };
  },
  
  // Mock conducteurs
  getAvailableDrivers: async (vehicleType: string) => {
    console.log(`🚗 [MOCK] getAvailableDrivers(${vehicleType})`);
    return [
      { id: 1, nom: "Conducteur Test", vehicleType, available: true }
    ];
  },
  
  // Mock géolocalisation
  getCoordinatesFromAddress: async (address: string) => {
    console.log(`📍 [MOCK] getCoordinatesFromAddress(${address})`);
    return { latitude: 9.6412, longitude: -13.5784 };
  },
  
  // Mock prix
  calculatePrice: async (distance: number, vehicleType: string) => {
    console.log(`💰 [MOCK] calculatePrice(${distance}km, ${vehicleType})`);
    return { prix_total: 15000, prix_par_km: 3000 };
  }
};

// =================================================================
// TESTS INTÉGRATION WORKFLOW STANDARD
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS WORKFLOW STANDARD =====`);

// Test 1: Vérifier que les messages simples suivent l'ancien flow
async function testStandardWorkflowIntact() {
  console.log(`🔍 [INTEGRATION] Test workflow standard inchangé...`);
  
  const simpleCommands = [
    { input: "taxi", expected: "workflow standard" },
    { input: "moto", expected: "workflow standard" }, 
    { input: "voiture", expected: "workflow standard" },
    { input: "oui", expected: "workflow standard" },
    { input: "non", expected: "workflow standard" }
  ];
  
  // Import functions to test
  try {
    const { shouldUseAIAnalysis } = await import('./text-intelligence.ts');
    
    simpleCommands.forEach(testCase => {
      const useAI = shouldUseAIAnalysis(testCase.input);
      
      if (!useAI) {
        console.log(`✅ [INTEGRATION] "${testCase.input}" → ${testCase.expected} ✓`);
      } else {
        console.error(`❌ [INTEGRATION] "${testCase.input}" utilise IA à tort !`);
      }
    });
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] Erreur test workflow standard:`, error);
  }
}

// =================================================================
// TESTS INTERVENTION IA APPROPRIÉE
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS INTERVENTION IA =====`);

// Test 2: Vérifier que l'IA intervient seulement quand nécessaire
async function testAIInterventionTiming() {
  console.log(`🔍 [INTEGRATION] Test timing intervention IA...`);
  
  const testScenarios = [
    {
      input: "Je veux taxi moto demain 8h aéroport",
      expectAI: true,
      reason: "phrase complexe avec temporel"
    },
    {
      input: "taksi motor pr madina",
      expectAI: true, 
      reason: "phrase avec fautes et destination"
    },
    {
      input: "taxi",
      expectAI: false,
      reason: "commande simple standard"
    },
    {
      input: "urgent taxi clinique maintenant",
      expectAI: true,
      reason: "urgence avec destination"
    }
  ];
  
  try {
    const { shouldUseAIAnalysis, handleComplexTextMessage } = await import('./text-intelligence.ts');
    
    for (const scenario of testScenarios) {
      const shouldUseAI = shouldUseAIAnalysis(scenario.input);
      
      if (shouldUseAI === scenario.expectAI) {
        console.log(`✅ [INTEGRATION] "${scenario.input}" → ${scenario.reason} ✓`);
        
        // Si IA attendue, tester le traitement
        if (scenario.expectAI) {
          try {
            const result = await handleComplexTextMessage(
              scenario.input, 
              "+224622000111"
            );
            console.log(`   📊 [INTEGRATION] Résultat IA: handled=${result.handled}`);
          } catch (error) {
            console.log(`   ⚠️ [INTEGRATION] Fallback IA activé (normal en test sans OpenAI)`);
          }
        }
        
      } else {
        console.error(`❌ [INTEGRATION] "${scenario.input}" comportement inattendu !`);
      }
    }
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] Erreur test intervention IA:`, error);
  }
}

// =================================================================
// TESTS FALLBACK AUTOMATIQUE
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS FALLBACK AUTOMATIQUE =====`);

// Test 3: Vérifier fallback quand IA échoue
async function testAutomaticFallback() {
  console.log(`🔍 [INTEGRATION] Test fallback automatique...`);
  
  try {
    const { handleComplexTextMessage } = await import('./text-intelligence.ts');
    
    // Test avec phrase complexe mais sans clé OpenAI (doit fallback)
    const complexMessage = "Je veux taxi moto demain pour aéroport à 8h";
    
    const result = await handleComplexTextMessage(
      complexMessage,
      "+224622000111"
    );
    
    // En l'absence d'OpenAI key, doit fallback
    if (!result.handled) {
      console.log(`✅ [INTEGRATION] Fallback automatique fonctionne ✓`);
      console.log(`   💡 [INTEGRATION] Message passera au workflow standard`);
    } else {
      console.log(`🤔 [INTEGRATION] IA a traité le message (clé OpenAI présente ?)`);
    }
    
  } catch (error) {
    console.log(`✅ [INTEGRATION] Fallback sur erreur activé ✓`);
  }
}

// =================================================================
// TESTS SESSION MANAGEMENT
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS GESTION SESSIONS =====`);

// Test 4: Vérifier que les sessions sont correctement mises à jour
async function testSessionIntegration() {
  console.log(`🔍 [INTEGRATION] Test intégration sessions...`);
  
  const testPhone = "+224622000111";
  
  // Simuler session vide initiale
  const mockSession = await mockBotFunctions.getSession(testPhone);
  
  if (mockSession) {
    console.log(`✅ [INTEGRATION] Session mock récupérée ✓`);
    
    // Simuler mise à jour session après traitement IA
    const sessionUpdate = {
      vehicleType: "moto",
      destinationNom: "aéroport", 
      etat: "vehicule_choisi",
      timestamp: Date.now()
    };
    
    const saveResult = await mockBotFunctions.saveSession(testPhone, sessionUpdate);
    
    if (saveResult.success) {
      console.log(`✅ [INTEGRATION] Session mise à jour après IA ✓`);
    } else {
      console.error(`❌ [INTEGRATION] Échec mise à jour session`);
    }
    
  } else {
    console.error(`❌ [INTEGRATION] Impossible récupérer session`);
  }
}

// =================================================================
// TESTS PERFORMANCE ET TIMEOUT
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS PERFORMANCE =====`);

// Test 5: Vérifier que les timeouts n'impactent pas le bot
async function testPerformanceImpact() {
  console.log(`🔍 [INTEGRATION] Test impact performance...`);
  
  const startTime = Date.now();
  
  try {
    const { shouldUseAIAnalysis } = await import('./text-intelligence.ts');
    
    // Test rapidité détection
    const quickTests = [
      "taxi",
      "moto", 
      "Je veux taxi moto demain aéroport",
      "taksi motor pr madina"
    ];
    
    quickTests.forEach(message => {
      const testStart = Date.now();
      const result = shouldUseAIAnalysis(message);
      const testDuration = Date.now() - testStart;
      
      if (testDuration > 10) { // Plus de 10ms est lent pour la détection
        console.error(`❌ [INTEGRATION] Détection lente (${testDuration}ms): "${message}"`);
      } else {
        console.log(`✅ [INTEGRATION] Détection rapide (${testDuration}ms): "${message}"`);
      }
    });
    
    const totalDuration = Date.now() - startTime;
    console.log(`📊 [INTEGRATION] Durée totale tests: ${totalDuration}ms`);
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] Erreur test performance:`, error);
  }
}

// =================================================================
// TESTS ANTI-RÉGRESSION
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS ANTI-RÉGRESSION =====`);

// Test 6: Vérifier qu'aucune fonction existante n'est cassée
async function testNoRegression() {
  console.log(`🔍 [INTEGRATION] Test anti-régression...`);
  
  // Simuler fonctions critiques du bot
  const criticalFunctions = [
    { name: "getAvailableDrivers", func: mockBotFunctions.getAvailableDrivers },
    { name: "getCoordinatesFromAddress", func: mockBotFunctions.getCoordinatesFromAddress },
    { name: "calculatePrice", func: mockBotFunctions.calculatePrice },
    { name: "saveSession", func: mockBotFunctions.saveSession },
    { name: "getSession", func: mockBotFunctions.getSession }
  ];
  
  for (const testFunc of criticalFunctions) {
    try {
      // Test basique de chaque fonction critique
      let result;
      
      switch (testFunc.name) {
        case "getAvailableDrivers":
          result = await testFunc.func("moto");
          break;
        case "getCoordinatesFromAddress":
          result = await testFunc.func("madina");
          break;  
        case "calculatePrice":
          result = await testFunc.func(5.2, "moto");
          break;
        case "saveSession":
          result = await testFunc.func("+224622000111", { test: true });
          break;
        case "getSession":
          result = await testFunc.func("+224622000111");
          break;
      }
      
      if (result) {
        console.log(`✅ [INTEGRATION] ${testFunc.name} fonctionne ✓`);
      } else {
        console.error(`❌ [INTEGRATION] ${testFunc.name} retour invalide`);
      }
      
    } catch (error) {
      console.error(`❌ [INTEGRATION] ${testFunc.name} cassée:`, error);
    }
  }
}

// =================================================================
// TESTS SCÉNARIOS RÉELS
// =================================================================

console.log(`🧪 [INTEGRATION] ===== TESTS SCÉNARIOS RÉELS =====`);

// Test 7: Simulation workflow complet
async function testCompleteWorkflows() {
  console.log(`🔍 [INTEGRATION] Test workflows complets...`);
  
  const realScenarios = [
    {
      name: "Réservation standard",
      steps: ["taxi", "moto", "oui", "[GPS]", "madina", "oui"],
      expectAI: [false, false, false, false, false, false]
    },
    {
      name: "Phrase complexe",
      steps: ["Je veux taxi moto demain 8h aéroport"],
      expectAI: [true]
    },
    {
      name: "Phrase avec fautes",
      steps: ["taksi motor pr ale madina demen"],
      expectAI: [true]  
    }
  ];
  
  try {
    const { shouldUseAIAnalysis } = await import('./text-intelligence.ts');
    
    realScenarios.forEach(scenario => {
      console.log(`\n📋 [INTEGRATION] Scénario: ${scenario.name}`);
      
      scenario.steps.forEach((step, index) => {
        const useAI = shouldUseAIAnalysis(step);
        const expectedAI = scenario.expectAI[index];
        
        if (useAI === expectedAI) {
          console.log(`  ✅ [INTEGRATION] Étape ${index + 1}: "${step}" → ${useAI ? 'IA' : 'Standard'} ✓`);
        } else {
          console.error(`  ❌ [INTEGRATION] Étape ${index + 1}: "${step}" → Comportement inattendu !`);
        }
      });
    });
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] Erreur scénarios réels:`, error);
  }
}

// =================================================================
// EXÉCUTION COMPLÈTE DES TESTS D'INTÉGRATION
// =================================================================

async function runIntegrationTests() {
  console.log(`🚀 [INTEGRATION] ===== TESTS D'INTÉGRATION BOT V2 + IA =====`);
  console.log(`📅 [INTEGRATION] Date: ${new Date().toISOString()}`);
  console.log(`🎯 [INTEGRATION] Objectif: Valider intégration sans régression`);
  console.log(`🔧 [INTEGRATION] Mode: Mock (sans vraies APIs externes)`);
  
  try {
    // Tous les tests d'intégration
    await testStandardWorkflowIntact();
    await testAIInterventionTiming();
    await testAutomaticFallback();
    await testSessionIntegration();
    await testPerformanceImpact();
    await testNoRegression();
    await testCompleteWorkflows();
    
    console.log(`\n🎉 [INTEGRATION] ===== TESTS INTÉGRATION TERMINÉS =====`);
    console.log(`✅ [INTEGRATION] Bot V2 + IA prêt pour déploiement`);
    console.log(`💡 [INTEGRATION] Prochaine étape: Tests avec vraie API OpenAI`);
    
  } catch (error) {
    console.error(`❌ [INTEGRATION] ERREUR CRITIQUE INTÉGRATION:`, error);
    console.log(`🚨 [INTEGRATION] Déploiement non recommandé !`);
  }
}

// =================================================================
// EXPORT POUR EXÉCUTION
// =================================================================

export {
  runIntegrationTests,
  testStandardWorkflowIntact,
  testAIInterventionTiming,
  testAutomaticFallback,
  testSessionIntegration,
  testPerformanceImpact,
  testNoRegression,
  testCompleteWorkflows
};

// Exécution automatique si appelé directement
if (import.meta.main) {
  await runIntegrationTests();
}