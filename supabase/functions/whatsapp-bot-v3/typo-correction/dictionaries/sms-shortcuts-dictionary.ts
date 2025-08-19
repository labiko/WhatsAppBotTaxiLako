// ========================================
// DICTIONNAIRE RACCOURCIS SMS/CHAT
// ========================================

/**
 * Dictionnaire des corrections de raccourcis SMS et abréviations
 * Catégorie sûre - Expansions standard des raccourcis modernes
 * 
 * Pattern: abréviation → mot_complet
 * Confiance: 90% (expansions courantes)
 */

export const SMS_SHORTCUTS_DICTIONARY = new Map<string, string>([
  // === MOTS DE LIAISON COURANTS ===
  ['pr', 'pour'],
  ['vs', 'vers'],
  ['dc', 'donc'],
  ['ds', 'dans'],
  ['ac', 'avec'],
  ['ss', 'sans'],
  ['ms', 'mais'],
  ['kom', 'comme'],
  ['kand', 'quand'],
  ['ke', 'que'],
  ['ki', 'qui'],
  ['ou', 'où'],
  
  // === VERBES COURANTS ===
  ['ale', 'aller'],
  ['venir', 'venir'],  // Déjà correct
  ['partir', 'partir'],  // Déjà correct
  ['arriver', 'arriver'],  // Déjà correct
  ['rentrer', 'rentrer'],  // Déjà correct
  ['sortir', 'sortir'],  // Déjà correct
  ['prendre', 'prendre'],  // Déjà correct
  
  // === EXPRESSIONS TEMPORELLES ===
  ['demen', 'demain'],
  ['dman', 'demain'],
  ['dmain', 'demain'],
  ['ojourdui', 'aujourd\'hui'],
  ['aujourdhui', 'aujourd\'hui'],  // Déjà correct
  ['maintnan', 'maintenant'],
  ['mnt', 'maintenant'],
  ['tjrs', 'toujours'],
  ['jms', 'jamais'],
  ['souven', 'souvent'],
  ['tt', 'tout'],
  ['tte', 'toute'],
  ['tts', 'tous'],
  ['ttes', 'toutes'],
  
  // === POLITESSE ET COURTOISIE ===
  ['stp', 's\'il te plaît'],
  ['svp', 's\'il vous plaît'],
  ['merci', 'merci'],  // Déjà correct
  ['derien', 'de rien'],
  ['bjr', 'bonjour'],
  ['bsr', 'bonsoir'],
  ['salut', 'salut'],  // Déjà correct
  ['coucou', 'coucou'],  // Déjà correct
  
  // === QUANTITÉ ET MESURE ===
  ['bcp', 'beaucoup'],
  ['bocou', 'beaucoup'],
  ['tp', 'trop'],
  ['assé', 'assez'],
  ['asse', 'assez'],
  ['peu', 'peu'],  // Déjà correct
  ['plu', 'plus'],
  ['moin', 'moins'],
  ['autant', 'autant'],  // Déjà correct
  
  // === DIRECTIONS ET LIEUX ===
  ['la', 'là'],
  ['ici', 'ici'],  // Déjà correct
  ['labas', 'là-bas'],
  ['pres', 'près'],
  ['pre', 'près'],
  ['loin', 'loin'],  // Déjà correct
  ['derriere', 'derrière'],
  ['devant', 'devant'],  // Déjà correct
  ['cote', 'côté'],
  ['coté', 'côté'],
  
  // === SENTIMENTS ET ÉTATS ===
  ['content', 'content'],  // Déjà correct
  ['heureus', 'heureux'],
  ['triste', 'triste'],  // Déjà correct
  ['fatigue', 'fatigué'],
  ['malade', 'malade'],  // Déjà correct
  
  // === NÉGATIONS ===
  ['pa', 'pas'],
  ['nan', 'non'],
  ['jamé', 'jamais'],
  ['rien', 'rien'],  // Déjà correct
  ['personne', 'personne'],  // Déjà correct
  
  // === QUESTIONS ===
  ['koi', 'quoi'],
  ['quoi', 'quoi'],  // Déjà correct
  ['comment', 'comment'],  // Déjà correct
  ['komen', 'comment'],
  ['pourquoi', 'pourquoi'],  // Déjà correct
  ['pq', 'pourquoi'],
  ['pkoi', 'pourquoi'],
  
  // === AFFIRMATIONS ===
  ['oui', 'oui'],  // Déjà correct
  ['wi', 'oui'],
  ['ouai', 'ouais'],
  ['daccord', 'd\'accord'],
  ['ok', 'ok'],  // Déjà correct
  ['dac', 'd\'accord'],
  
  // === FAMILLE ===
  ['papa', 'papa'],  // Déjà correct
  ['maman', 'maman'],  // Déjà correct
  ['frere', 'frère'],
  ['soeur', 'sœur'],
  ['famille', 'famille'],  // Déjà correct
  
  // === VARIANTES MAJUSCULES ===
  ['PR', 'POUR'],
  ['VS', 'VERS'],
  ['DC', 'DONC'],
  ['AC', 'AVEC'],
  ['SS', 'SANS'],
  ['MS', 'MAIS'],
  
  // === VARIANTES MIXTES ===
  ['Pr', 'Pour'],
  ['Vs', 'Vers'],
  ['Dc', 'Donc'],
  ['Ac', 'Avec'],
  ['Ss', 'Sans'],
  ['Ms', 'Mais']
]);

/**
 * Métadonnées du dictionnaire
 */
export const SMS_SHORTCUTS_METADATA = {
  name: 'sms_shortcuts',
  version: '1.0',
  size: SMS_SHORTCUTS_DICTIONARY.size,
  confidence: 0.9,  // Confiance élevée mais pas maximale
  description: 'Expansion raccourcis SMS et abréviations',
  priority: 2,      // Priorité élevée
  safe: true        // Corrections sûres
} as const;

/**
 * Fonction utilitaire pour vérifier si un mot est un raccourci SMS
 */
export function isSmsShortcut(word: string): boolean {
  return SMS_SHORTCUTS_DICTIONARY.has(word.toLowerCase());
}

/**
 * Fonction utilitaire pour obtenir l'expansion d'un raccourci SMS
 */
export function getSmsExpansion(word: string): string | null {
  const expansion = SMS_SHORTCUTS_DICTIONARY.get(word.toLowerCase());
  
  if (!expansion) return null;
  
  // Préserver la casse originale
  if (word === word.toUpperCase()) {
    return expansion.toUpperCase();
  }
  
  if (word[0] === word[0].toUpperCase()) {
    return expansion.charAt(0).toUpperCase() + expansion.slice(1);
  }
  
  return expansion;
}

/**
 * Liste des raccourcis à traiter avec précaution (ambiguïtés possibles)
 */
export const AMBIGUOUS_SMS_SHORTCUTS = new Set([
  'la',  // Peut être article ou adverbe de lieu
  'ou',  // Peut être conjonction ou adverbe de lieu
  'tt',  // Peut être "tout" ou abréviation de nom propre
  'pr'   // Peut être "pour" ou initiales
]);

/**
 * Fonction pour vérifier si un raccourci SMS est ambigu
 */
export function isAmbiguousSmsShortcut(word: string): boolean {
  return AMBIGUOUS_SMS_SHORTCUTS.has(word.toLowerCase());
}