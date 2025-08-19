// ========================================
// TESTS UNITAIRES CORRECTION ORTHOGRAPHIQUE
// ========================================

import { TypoCorrector } from '../typo-corrector.ts';
import { 
  ULTRA_SAFE_CONFIG, 
  DEVELOPMENT_CONFIG, 
  createCustomConfig 
} from '../config/typo-config.ts';

/**
 * Suite de tests de non-régression et fonctionnels
 * Garantit le fonctionnement correct du système de correction
 */

// =====================================================
// TESTS DE NON-RÉGRESSION (PRIORITÉ ABSOLUE)
// =====================================================

/**
 * Tests critiques: Vérification que la correction désactivée ne fait rien
 */
function testDisabledCorrection() {
  console.log('🧪 === TESTS NON-RÉGRESSION - CORRECTION DÉSACTIVÉE ===');
  
  const corrector = new TypoCorrector(ULTRA_SAFE_CONFIG); // enabled: false
  
  const testQueries = [
    'madina',
    'aéroport', 
    'hôpital',
    'école primaire',
    'poste de police lambanyi',
    'aerport',  // Même avec faute, ne doit pas corriger
    'hopital'   // Même avec faute, ne doit pas corriger
  ];
  
  let passed = 0;
  let total = testQueries.length;
  
  for (const query of testQueries) {
    const result = corrector.correctQuery(query);
    
    // Vérifications critiques de non-régression
    const isUnchanged = result.corrected === query;
    const isNotChanged = !result.changed;
    const hasNoCorrections = result.appliedCorrections.length === 0;
    
    if (isUnchanged && isNotChanged && hasNoCorrections) {
      console.log(`✅ "${query}" → inchangé (correct)`);
      passed++;
    } else {
      console.log(`❌ "${query}" → "${result.corrected}" (RÉGRESSION DÉTECTÉE!)`);
    }
  }
  
  console.log(`📊 Tests non-régression: ${passed}/${total} ${passed === total ? '✅' : '❌'}`);
  return passed === total;
}

/**
 * Tests de performance: Vérification des temps de traitement
 */
function testPerformanceGuarantees() {
  console.log('\n🧪 === TESTS PERFORMANCE ===');
  
  const corrector = new TypoCorrector({
    ...DEVELOPMENT_CONFIG,
    enabled: true,
    maxProcessingTimeMs: 10
  });
  
  const testQueries = [
    'aerport',
    'hopital national',
    'ecole primaire lambanyi',
    'taksi moto pr ale madina',
    'voitr batiman restoran sinema'
  ];
  
  let passed = 0;
  let maxTime = 0;
  
  for (const query of testQueries) {
    const result = corrector.correctQuery(query);
    
    if (result.processingTimeMs <= 10) {
      console.log(`⚡ "${query}" → ${result.processingTimeMs}ms ✅`);
      passed++;
    } else {
      console.log(`🐌 "${query}" → ${result.processingTimeMs}ms ❌ (trop lent)`);
    }
    
    maxTime = Math.max(maxTime, result.processingTimeMs);
  }
  
  console.log(`📊 Performance: ${passed}/${testQueries.length} sous 10ms (max: ${maxTime}ms)`);
  return passed === testQueries.length;
}

// =====================================================
// TESTS FONCTIONNELS PAR CATÉGORIE
// =====================================================

/**
 * Tests accents français - Catégorie la plus sûre
 */
function testFrenchAccents() {
  console.log('\n🧪 === TESTS ACCENTS FRANÇAIS ===');
  
  const corrector = new TypoCorrector({
    ...createCustomConfig({
      enabled: true,
      enableAccentCorrection: true,
      enableSmsCorrection: false,
      enablePhoneticCorrection: false,
      enableGuineaPlacesCorrection: false,
      enableCommonTyposCorrection: false,
      minConfidenceThreshold: 0.9
    })
  });
  
  const testCases = [
    // Corrections attendues
    { input: 'aerport', expected: 'aéroport', shouldChange: true },
    { input: 'hopital', expected: 'hôpital', shouldChange: true },
    { input: 'ecole', expected: 'école', shouldChange: true },
    { input: 'hotel', expected: 'hôtel', shouldChange: true },
    
    // Préservation (déjà corrects)
    { input: 'aéroport', expected: 'aéroport', shouldChange: false },
    { input: 'hôpital', expected: 'hôpital', shouldChange: false },
    { input: 'école', expected: 'école', shouldChange: false },
    
    // Casse préservée
    { input: 'AERPORT', expected: 'AÉROPORT', shouldChange: true },
    { input: 'Hopital', expected: 'Hôpital', shouldChange: true }
  ];
  
  let passed = 0;
  
  for (const testCase of testCases) {
    const result = corrector.correctQuery(testCase.input);
    const success = result.corrected === testCase.expected && result.changed === testCase.shouldChange;
    
    console.log(`${success ? '✅' : '❌'} "${testCase.input}" → "${result.corrected}" ${testCase.shouldChange ? '(changé)' : '(inchangé)'}`);
    
    if (success) passed++;
  }
  
  console.log(`📊 Accents français: ${passed}/${testCases.length}`);
  return passed === testCases.length;
}

/**
 * Tests lieux guinéens - Spécificité locale
 */
function testGuineaPlaces() {
  console.log('\n🧪 === TESTS LIEUX GUINÉENS ===');
  
  const corrector = new TypoCorrector({
    ...createCustomConfig({
      enabled: true,
      enableAccentCorrection: false,
      enableSmsCorrection: false,
      enablePhoneticCorrection: false,
      enableGuineaPlacesCorrection: true,
      enableCommonTyposCorrection: false
    })
  });
  
  const testCases = [
    // Corrections orthographiques locales
    { input: 'lambayi', expected: 'lambanyi', shouldChange: true },
    { input: 'bambeto', expected: 'bambéto', shouldChange: true },
    { input: 'kipe', expected: 'kipé', shouldChange: true },
    
    // Préservation (corrects)
    { input: 'lambanyi', expected: 'lambanyi', shouldChange: false },
    { input: 'madina', expected: 'madina', shouldChange: false },
    { input: 'ratoma', expected: 'ratoma', shouldChange: false },
    
    // Phrases complètes
    { input: 'poste de police lambayi', expected: 'poste de police lambanyi', shouldChange: true }
  ];
  
  let passed = 0;
  
  for (const testCase of testCases) {
    const result = corrector.correctQuery(testCase.input);
    const success = result.corrected === testCase.expected && result.changed === testCase.shouldChange;
    
    console.log(`${success ? '✅' : '❌'} "${testCase.input}" → "${result.corrected}"`);
    
    if (success) passed++;
  }
  
  console.log(`📊 Lieux guinéens: ${passed}/${testCases.length}`);
  return passed === testCases.length;
}

/**
 * Tests fautes courantes
 */
function testCommonTypos() {
  console.log('\n🧪 === TESTS FAUTES COURANTES ===');
  
  const corrector = new TypoCorrector({
    ...createCustomConfig({
      enabled: true,
      enableAccentCorrection: false,
      enableSmsCorrection: false,
      enablePhoneticCorrection: false,
      enableGuineaPlacesCorrection: false,
      enableCommonTyposCorrection: true
    })
  });
  
  const testCases = [
    { input: 'hoptal', expected: 'hôpital', shouldChange: true },
    { input: 'voitre', expected: 'voiture', shouldChange: true },
    { input: 'restrant', expected: 'restaurant', shouldChange: true },
    { input: 'apartemnt', expected: 'appartement', shouldChange: true }
  ];
  
  let passed = 0;
  
  for (const testCase of testCases) {
    const result = corrector.correctQuery(testCase.input);
    const success = result.corrected === testCase.expected && result.changed === testCase.shouldChange;
    
    console.log(`${success ? '✅' : '❌'} "${testCase.input}" → "${result.corrected}"`);
    
    if (success) passed++;
  }
  
  console.log(`📊 Fautes courantes: ${passed}/${testCases.length}`);
  return passed === testCases.length;
}

// =====================================================
// TESTS D'INTÉGRATION
// =====================================================

/**
 * Tests intégration complète - Toutes catégories activées
 */
function testFullIntegration() {
  console.log('\n🧪 === TESTS INTÉGRATION COMPLÈTE ===');
  
  const corrector = new TypoCorrector({
    ...DEVELOPMENT_CONFIG,
    enabled: true,
    enableAccentCorrection: true,
    enableCommonTyposCorrection: true,
    enableGuineaPlacesCorrection: true,
    enableSmsCorrection: true,
    enablePhoneticCorrection: true
  });
  
  const testCases = [
    // Corrections multiples possibles (priorisation)
    { input: 'hoptal ignac din', expected: 'hôpital ignace deen' },
    { input: 'aerport gbessia', expected: 'aéroport gbessia' },
    { input: 'ecole lambayi', expected: 'école lambanyi' },
    
    // Correction unique évidente
    { input: 'taksi', expected: 'taxi' },
    { input: 'pr ale madina', expected: 'pour aller madina' }
  ];
  
  let passed = 0;
  
  for (const testCase of testCases) {
    const result = corrector.correctQuery(testCase.input);
    const isImproved = result.changed && result.success;
    
    console.log(`${isImproved ? '✅' : '📝'} "${testCase.input}" → "${result.corrected}" (${result.appliedCorrections.length} corrections)`);
    
    // Logging des corrections appliquées
    result.appliedCorrections.forEach(c => {
      console.log(`   🔧 [${c.category.toUpperCase()}] "${c.from}" → "${c.to}" (${(c.confidence * 100).toFixed(1)}%)`);
    });
    
    if (isImproved) passed++;
  }
  
  console.log(`📊 Intégration complète: ${passed}/${testCases.length} améliorées`);
  return passed >= Math.floor(testCases.length * 0.8); // 80% de succès minimum
}

// =====================================================
// FONCTION PRINCIPALE D'EXÉCUTION DES TESTS
// =====================================================

/**
 * Exécute tous les tests et retourne le rapport final
 */
export function runAllTests(): boolean {
  console.log('🚀 === DÉMARRAGE TESTS CORRECTION ORTHOGRAPHIQUE ===\n');
  
  const results = [
    testDisabledCorrection(),    // CRITIQUE: Non-régression
    testPerformanceGuarantees(), // CRITIQUE: Performance
    testFrenchAccents(),         // Fonctionnel: Accents
    testGuineaPlaces(),          // Fonctionnel: Guinée
    testCommonTypos(),           // Fonctionnel: Fautes
    testFullIntegration()        // Intégration: Complet
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 === RAPPORT FINAL TESTS ===`);
  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`📈 Taux de réussite: ${(passed/total*100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log(`🎉 TOUS LES TESTS PASSÉS - SYSTÈME PRÊT POUR DÉPLOIEMENT`);
  } else {
    console.log(`⚠️ TESTS ÉCHOUÉS - VÉRIFIER AVANT DÉPLOIEMENT`);
  }
  
  return passed === total;
}

// Auto-exécution des tests si lancé directement
if (import.meta.main) {
  runAllTests();
}