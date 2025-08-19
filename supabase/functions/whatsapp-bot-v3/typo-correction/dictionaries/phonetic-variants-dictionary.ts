// ========================================
// DICTIONNAIRE VARIATIONS PHONÉTIQUES
// ========================================

/**
 * Dictionnaire des corrections de variations phonétiques
 * Catégorie moyennement sûre - Orthographe phonétique intuitive
 * 
 * Pattern: orthographe_phonétique → orthographe_correcte
 * Confiance: 85% (variations logiques mais moins évidentes)
 */

export const PHONETIC_VARIANTS_DICTIONARY = new Map<string, string>([
  // === TRANSPORT ===
  ['taksi', 'taxi'],
  ['taxi', 'taxi'],  // Déjà correct
  ['voitur', 'voiture'],
  ['voiture', 'voiture'],  // Déjà correct
  ['motor', 'moto'],
  ['moto', 'moto'],  // Déjà correct
  ['otobuss', 'autobus'],
  ['autobus', 'autobus'],  // Déjà correct
  ['kamion', 'camion'],
  ['camion', 'camion'],  // Déjà correct
  ['velo', 'vélo'],
  ['vèlo', 'vélo'],
  
  // === BÂTIMENTS ===
  ['batiman', 'bâtiment'],
  ['bâtiment', 'bâtiment'],  // Déjà correct
  ['immebl', 'immeuble'],
  ['immeuble', 'immeuble'],  // Déjà correct
  ['mazon', 'maison'],
  ['maison', 'maison'],  // Déjà correct
  ['appertman', 'appartement'],
  ['appartement', 'appartement'],  // Déjà correct
  
  // === NOURRITURE/RESTAURANTS ===
  ['restoran', 'restaurant'],
  ['restorant', 'restaurant'],
  ['restaurant', 'restaurant'],  // Déjà correct
  ['sinema', 'cinéma'],
  ['cinema', 'cinéma'],
  ['cinéma', 'cinéma'],  // Déjà correct
  ['kaffe', 'café'],
  ['kafe', 'café'],
  ['café', 'café'],  // Déjà correct
  
  // === SERVICES ===
  ['banke', 'banque'],
  ['banque', 'banque'],  // Déjà correct
  ['poste', 'poste'],  // Déjà correct
  ['police', 'police'],  // Déjà correct
  ['polise', 'police'],
  ['pompier', 'pompier'],  // Déjà correct
  ['pompiee', 'pompier'],
  ['pompié', 'pompier'],
  
  // === SANTÉ ===
  ['dokteur', 'docteur'],
  ['docteur', 'docteur'],  // Déjà correct
  ['dokter', 'docteur'],
  ['medsin', 'médecin'],
  ['médecin', 'médecin'],  // Déjà correct
  ['medesin', 'médecin'],
  ['infirmier', 'infirmier'],  // Déjà correct
  ['infirmié', 'infirmier'],
  ['dentiste', 'dentiste'],  // Déjà correct
  ['dentist', 'dentiste'],
  ['farmacie', 'pharmacie'],
  ['farmasie', 'pharmacie'],
  ['pharmacie', 'pharmacie'],  // Déjà correct
  
  // === ÉDUCATION ===
  ['maitresse', 'maîtresse'],
  ['maîtresse', 'maîtresse'],  // Déjà correct
  ['mètresse', 'maîtresse'],
  ['professeur', 'professeur'],  // Déjà correct
  ['profeseur', 'professeur'],
  ['prof', 'professeur'],
  ['etudiant', 'étudiant'],
  ['étudiant', 'étudiant'],  // Déjà correct
  ['etudiante', 'étudiante'],
  ['eleve', 'élève'],
  ['élève', 'élève'],  // Déjà correct
  ['elèv', 'élève'],
  
  // === LIEUX DE CULTE ===
  ['mosqé', 'mosquée'],
  ['moskée', 'mosquée'],
  ['mosquée', 'mosquée'],  // Déjà correct
  ['eglis', 'église'],
  ['eglise', 'église'],
  ['église', 'église'],  // Déjà correct
  ['catédral', 'cathédrale'],
  ['cathédrale', 'cathédrale'],  // Déjà correct
  ['katédral', 'cathédrale'],
  
  // === MAGASINS ===
  ['boulanjer', 'boulanger'],
  ['boulanger', 'boulanger'],  // Déjà correct
  ['boulangé', 'boulanger'],
  ['boucher', 'boucher'],  // Déjà correct
  ['bouchè', 'boucher'],
  ['coiffeur', 'coiffeur'],  // Déjà correct
  ['koiffeur', 'coiffeur'],
  ['tailleur', 'tailleur'],  // Déjà correct
  ['tayeur', 'tailleur'],
  
  // === COULEURS (pour descriptions) ===
  ['rouge', 'rouge'],  // Déjà correct
  ['rouj', 'rouge'],
  ['bleu', 'bleu'],  // Déjà correct
  ['blé', 'bleu'],
  ['vert', 'vert'],  // Déjà correct
  ['vèr', 'vert'],
  ['jaune', 'jaune'],  // Déjà correct
  ['jon', 'jaune'],
  ['blanc', 'blanc'],  // Déjà correct
  ['blan', 'blanc'],
  ['noir', 'noir'],  // Déjà correct
  ['nwar', 'noir'],
  
  // === NOMBRES ÉCRITS ===
  ['un', 'un'],  // Déjà correct
  ['deux', 'deux'],  // Déjà correct
  ['deu', 'deux'],
  ['trois', 'trois'],  // Déjà correct
  ['trwa', 'trois'],
  ['quatre', 'quatre'],  // Déjà correct
  ['katr', 'quatre'],
  ['cinq', 'cinq'],  // Déjà correct
  ['sink', 'cinq'],
  ['six', 'six'],  // Déjà correct
  ['sis', 'six'],
  ['sept', 'sept'],  // Déjà correct
  ['sèt', 'sept'],
  ['huit', 'huit'],  // Déjà correct
  ['wit', 'huit'],
  ['neuf', 'neuf'],  // Déjà correct
  ['nef', 'neuf'],
  ['dix', 'dix'],  // Déjà correct
  ['dis', 'dix'],
  
  // === VARIANTES MAJUSCULES ===
  ['TAKSI', 'TAXI'],
  ['VOITUR', 'VOITURE'],
  ['MOTOR', 'MOTO'],
  ['RESTORAN', 'RESTAURANT'],
  ['SINEMA', 'CINÉMA'],
  ['DOKTEUR', 'DOCTEUR'],
  
  // === VARIANTES MIXTES ===
  ['Taksi', 'Taxi'],
  ['Voitur', 'Voiture'],
  ['Motor', 'Moto'],
  ['Restoran', 'Restaurant'],
  ['Sinema', 'Cinéma'],
  ['Dokteur', 'Docteur']
]);

/**
 * Métadonnées du dictionnaire
 */
export const PHONETIC_VARIANTS_METADATA = {
  name: 'phonetic_variants',
  version: '1.0',
  size: PHONETIC_VARIANTS_DICTIONARY.size,
  confidence: 0.85,  // Confiance bonne mais pas maximale
  description: 'Correction variations phonétiques courantes',
  priority: 3,       // Priorité moyenne
  safe: true         // Corrections relativement sûres
} as const;

/**
 * Fonction utilitaire pour vérifier si un mot est une variation phonétique
 */
export function isPhoneticVariant(word: string): boolean {
  return PHONETIC_VARIANTS_DICTIONARY.has(word.toLowerCase());
}

/**
 * Fonction utilitaire pour obtenir la correction d'une variation phonétique
 */
export function getPhoneticCorrection(word: string): string | null {
  const correction = PHONETIC_VARIANTS_DICTIONARY.get(word.toLowerCase());
  
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
 * Liste des variantes phonétiques à traiter avec précaution
 */
export const AMBIGUOUS_PHONETIC_VARIANTS = new Set([
  'motor',  // Peut être "moto" ou terme technique anglais
  'prof',   // Peut être "professeur" ou nom propre
  'taxi'    // Déjà correct, ne pas corriger
]);

/**
 * Fonction pour vérifier si une variante phonétique est ambiguë
 */
export function isAmbiguousPhoneticVariant(word: string): boolean {
  return AMBIGUOUS_PHONETIC_VARIANTS.has(word.toLowerCase());
}