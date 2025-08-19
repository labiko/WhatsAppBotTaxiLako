// ========================================
// DICTIONNAIRE FAUTES COURANTES
// ========================================

/**
 * Dictionnaire des corrections de fautes de frappe courantes
 * Catégorie sûre - Erreurs évidentes et répétitives
 * 
 * Pattern: faute_évidente → orthographe_correcte
 * Confiance: 90% (fautes claires sans ambiguïté)
 */

export const COMMON_TYPOS_DICTIONARY = new Map<string, string>([
  // === DOUBLEMENT/MANQUE DE LETTRES ===
  ['ecol', 'école'],
  ['ecole', 'école'],  // Déjà correct avec accent
  ['école', 'école'],  // Déjà correct
  
  ['hoptal', 'hôpital'],
  ['hopital', 'hôpital'],  // Correction accent
  ['hôpital', 'hôpital'],  // Déjà correct
  
  ['aeroprt', 'aéroport'],
  ['aerport', 'aéroport'],  // Correction accent
  ['aéroport', 'aéroport'],  // Déjà correct
  
  ['pharmacie', 'pharmacie'],  // Déjà correct
  ['farmacie', 'pharmacie'],   // Variation phonétique
  ['pharmasi', 'pharmacie'],
  
  ['batmant', 'bâtiment'],
  ['batiment', 'bâtiment'],  // Correction accent
  ['bâtiment', 'bâtiment'],  // Déjà correct
  
  ['restrant', 'restaurant'],
  ['restorant', 'restaurant'],
  ['restaurant', 'restaurant'],  // Déjà correct
  
  // === LETTRES MANQUANTES ===
  ['voitre', 'voiture'],
  ['voiture', 'voiture'],  // Déjà correct
  ['voitur', 'voiture'],
  
  ['apartemnt', 'appartement'],
  ['apartement', 'appartement'],
  ['appartement', 'appartement'],  // Déjà correct
  
  ['gouvernemnt', 'gouvernement'],
  ['gouvernement', 'gouvernement'],  // Déjà correct
  ['governement', 'gouvernement'],
  
  ['restrant', 'restaurant'],
  ['restarant', 'restaurant'],
  ['restauran', 'restaurant'],
  
  // === LETTRES INVERSÉES ===
  ['aeroport', 'aéroport'],  // Accent manquant
  ['hopitla', 'hôpital'],
  ['hopital', 'hôpital'],   // Accent manquant
  ['ecoel', 'école'],
  ['ecole', 'école'],       // Accent manquant
  
  // === SUBSTITUTIONS COURANTES ===
  ['farmacy', 'pharmacie'],  // Anglicisme
  ['pharmacy', 'pharmacie'], // Anglicisme
  ['farmasi', 'pharmacie'],
  
  ['hospitl', 'hôpital'],
  ['hospital', 'hôpital'],   // Anglicisme
  ['ospital', 'hôpital'],
  
  ['scool', 'école'],        // Anglicisme
  ['school', 'école'],       // Anglicisme
  ['skool', 'école'],
  
  ['hotl', 'hôtel'],
  ['hotel', 'hôtel'],        // Accent manquant
  ['hôtel', 'hôtel'],        // Déjà correct
  
  // === CONFUSION DE LETTRES ===
  ['banqe', 'banque'],
  ['banque', 'banque'],      // Déjà correct
  ['bank', 'banque'],        // Anglicisme
  
  ['polise', 'police'],
  ['police', 'police'],      // Déjà correct
  ['poliss', 'police'],
  
  ['pompiee', 'pompier'],
  ['pompier', 'pompier'],    // Déjà correct
  ['pompié', 'pompier'],
  
  ['doctur', 'docteur'],
  ['docteur', 'docteur'],    // Déjà correct
  ['docter', 'docteur'],
  ['doctor', 'docteur'],     // Anglicisme
  
  // === MOTS COURTS AVEC FAUTES ===
  ['rue', 'rue'],            // Déjà correct
  ['ru', 'rue'],
  ['rü', 'rue'],
  
  ['pont', 'pont'],          // Déjà correct
  ['pon', 'pont'],
  ['pont', 'pont'],
  
  ['port', 'port'],          // Déjà correct
  ['por', 'port'],
  ['pord', 'port'],
  
  ['gare', 'gare'],          // Déjà correct
  ['gar', 'gare'],
  ['garre', 'gare'],
  
  // === PLURIELS ET VARIANTES ===
  ['ecoles', 'écoles'],
  ['écoles', 'écoles'],      // Déjà correct
  
  ['hopitaux', 'hôpitaux'],
  ['hôpitaux', 'hôpitaux'],  // Déjà correct
  
  ['restaurants', 'restaurants'],  // Déjà correct
  ['restorants', 'restaurants'],
  
  ['hotels', 'hôtels'],
  ['hôtels', 'hôtels'],      // Déjà correct
  
  // === VARIANTES AVEC ESPACES ===
  ['grand place', 'grand-place'],
  ['grand-place', 'grand-place'],  // Déjà correct
  
  ['belle vue', 'bellevue'],
  ['bellevue', 'bellevue'],  // Déjà correct
  
  ['pont neuf', 'pont-neuf'],
  ['pont-neuf', 'pont-neuf'],  // Déjà correct
  
  // === FAUTES DE CLAVIER ===
  ['qbanque', 'banque'],     // q au lieu d'espace
  ['pharmaciee', 'pharmacie'], // e double accidentel
  ['restaurantt', 'restaurant'], // t double accidentel
  ['ecolee', 'école'],       // e double + accent
  
  // === CONTRACTIONS ERRONÉES ===
  ['dhamdallaye', 'hamdallaye'],  // d ajouté par erreur
  ['delambanyi', 'lambanyi'],     // de ajouté par erreur
  ['laecole', 'l\'école'],        // contraction mal écrite
  
  // === VARIANTES MAJUSCULES ===
  ['ECOL', 'ÉCOLE'],
  ['HOPTAL', 'HÔPITAL'],
  ['AEROPRT', 'AÉROPORT'],
  ['VOITRE', 'VOITURE'],
  ['RESTRANT', 'RESTAURANT'],
  ['HOTL', 'HÔTEL'],
  
  // === VARIANTES MIXTES ===
  ['Ecol', 'École'],
  ['Hoptal', 'Hôpital'],
  ['Aeroprt', 'Aéroport'],
  ['Voitre', 'Voiture'],
  ['Restrant', 'Restaurant'],
  ['Hotl', 'Hôtel']
]);

/**
 * Métadonnées du dictionnaire
 */
export const COMMON_TYPOS_METADATA = {
  name: 'common_typos',
  version: '1.0',
  size: COMMON_TYPOS_DICTIONARY.size,
  confidence: 0.9,   // Haute confiance (fautes évidentes)
  description: 'Correction fautes de frappe courantes',
  priority: 1,       // Priorité très haute
  safe: true         // Corrections très sûres
} as const;

/**
 * Fonction utilitaire pour vérifier si un mot est une faute courante
 */
export function isCommonTypo(word: string): boolean {
  return COMMON_TYPOS_DICTIONARY.has(word.toLowerCase());
}

/**
 * Fonction utilitaire pour obtenir la correction d'une faute courante
 */
export function getCommonTypoCorrection(word: string): string | null {
  const correction = COMMON_TYPOS_DICTIONARY.get(word.toLowerCase());
  
  if (!correction) return null;
  
  // Préserver la casse originale
  if (word === word.toUpperCase()) {
    return correction.toUpperCase();
  }
  
  if (word[0] === word[0].toUpperCase()) {
    return correction.charAt(0).toUpperCase() + correction.slice(1);
  }
  
  return correction;
}

/**
 * Patterns de fautes récurrentes pour détection automatique
 */
export const COMMON_TYPO_PATTERNS = [
  // Lettres manquantes en fin de mot
  { pattern: /^(\w+)l$/, replacement: '$1le', examples: ['ecol → école'] },
  
  // Lettres doublées accidentellement
  { pattern: /^(\w+)([aeiou])\2+(\w*)$/, replacement: '$1$2$3', examples: ['ecolee → école'] },
  
  // Substitution c/k dans certains contextes
  { pattern: /^(.*)c([aeiou].*)$/, replacement: '$1k$2', examples: ['cafe → kafe'] },
  
  // Substitution ph/f
  { pattern: /^(.*)f([aeiou].*)$/, replacement: '$1ph$2', examples: ['farmacie → pharmacie'] }
];

/**
 * Fonction pour détecter des patterns de fautes automatiquement
 */
export function detectTypoPattern(word: string): string | null {
  for (const pattern of COMMON_TYPO_PATTERNS) {
    if (pattern.pattern.test(word)) {
      const corrected = word.replace(pattern.pattern, pattern.replacement);
      
      // Vérifier si la correction produit un mot valide connu
      if (COMMON_TYPOS_DICTIONARY.has(corrected.toLowerCase())) {
        return corrected;
      }
    }
  }
  
  return null;
}

/**
 * Liste des mots à ne jamais corriger (déjà corrects)
 */
export const NEVER_CORRECT_WORDS = new Set([
  'école', 'hôpital', 'aéroport', 'hôtel', 'théâtre', 'cinéma',
  'pharmacie', 'restaurant', 'voiture', 'appartement', 'gouvernement'
]);

/**
 * Fonction pour vérifier si un mot ne doit jamais être corrigé
 */
export function shouldNeverCorrect(word: string): boolean {
  return NEVER_CORRECT_WORDS.has(word.toLowerCase());
}