#!/usr/bin/env node
/**
 * 🔍 SCRIPT VALIDATION INTÉGRITÉ V3
 * 
 * VÉRIFIE : Que les zones IA sont préservées après synchronisation
 * USAGE : node validate-v3-integrity.js
 */

const fs = require('fs');

// Fichier à valider
const V3_FILE = './supabase/functions/whatsapp-bot-v3/index.ts';

// Éléments critiques à vérifier
const CRITICAL_IA_ELEMENTS = [
  'shouldUseAIAnalysis',
  'handleComplexTextMessage',
  'IA_CONFIDENCE_THRESHOLD',
  'text-intelligence.ts',
  'ia_attente_confirmation',
  'ia_attente_gps',
  'ia_attente_heure',
  'handleComplexTextMessageV3',
  'formatDateForDisplay'
];

const ZONE_MARKERS = [
  '🛡️ ZONE IA V3 - NE PAS ÉCRASER',
  '🛡️ FIN ZONE IA V3 - PROTÉGÉE'
];

/**
 * Valider la présence des éléments IA critiques
 */
function validateIAElements(content) {
  console.log('🔍 Validation des éléments IA critiques...');
  const missing = [];
  
  CRITICAL_IA_ELEMENTS.forEach(element => {
    if (!content.includes(element)) {
      missing.push(element);
    } else {
      console.log(`✅ ${element}`);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Éléments IA manquants:');
    missing.forEach(element => console.error(`  - ${element}`));
    return false;
  }
  
  console.log('✅ Tous les éléments IA critiques sont présents');
  return true;
}

/**
 * Valider la présence des zones protégées
 */
function validateProtectedZones(content) {
  console.log('🛡️ Validation des zones protégées...');
  
  const hasStartMarker = ZONE_MARKERS[0] && content.includes(ZONE_MARKERS[0]);
  const hasEndMarker = ZONE_MARKERS[1] && content.includes(ZONE_MARKERS[1]);
  
  if (!hasStartMarker || !hasEndMarker) {
    console.error('❌ Marqueurs de zones protégées manquants');
    return false;
  }
  
  console.log('✅ Zones protégées correctement marquées');
  return true;
}

/**
 * Valider la structure générale V3
 */
function validateV3Structure(content) {
  console.log('🏗️ Validation de la structure V3...');
  
  // Vérifier que c'est bien du code V3 (pas V2 écrasé)
  const v3Indicators = [
    'INTÉGRATION INTELLIGENCE ARTIFICIELLE',
    'CONFIGURATION IA AVANCÉE',
    'whatsapp-bot-v3'
  ];
  
  const hasV3Structure = v3Indicators.some(indicator => content.includes(indicator));
  
  if (!hasV3Structure) {
    console.error('❌ Structure V3 non détectée - Possible écrasement par V2');
    return false;
  }
  
  console.log('✅ Structure V3 préservée');
  return true;
}

/**
 * Génerer rapport de validation
 */
function generateValidationReport(results) {
  console.log('\n📊 RAPPORT DE VALIDATION V3');
  console.log('═══════════════════════════════════════');
  
  const allValid = results.every(r => r.valid);
  
  results.forEach(result => {
    const status = result.valid ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.message}`);
  });
  
  console.log('\n' + '═'.repeat(40));
  
  if (allValid) {
    console.log('🎉 VALIDATION RÉUSSIE - V3 intègre et fonctionnel');
    return true;
  } else {
    console.log('🚨 VALIDATION ÉCHOUÉE - Action corrective requise');
    return false;
  }
}

/**
 * Validation complète
 */
function validateV3Integrity() {
  try {
    console.log('🔍 VALIDATION INTÉGRITÉ V3');
    console.log('═══════════════════════════════════════');
    
    if (!fs.existsSync(V3_FILE)) {
      console.error(`❌ Fichier V3 non trouvé: ${V3_FILE}`);
      return false;
    }
    
    const content = fs.readFileSync(V3_FILE, 'utf8');
    
    const results = [
      {
        test: 'Éléments IA critiques',
        valid: validateIAElements(content),
        message: 'Fonctions IA essentielles'
      },
      {
        test: 'Zones protégées',
        valid: validateProtectedZones(content),
        message: 'Marqueurs de protection'
      },
      {
        test: 'Structure V3',
        valid: validateV3Structure(content),
        message: 'Architecture V3 préservée'
      }
    ];
    
    return generateValidationReport(results);
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    return false;
  }
}

// Exécution principale
if (require.main === module) {
  const isValid = validateV3Integrity();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateV3Integrity, validateIAElements, validateProtectedZones };