// ========================================
// DICTIONNAIRE ACCENTS FRANÇAIS
// ========================================

/**
 * Dictionnaire des corrections d'accents français manquants
 * Catégorie la plus sûre - Corrections évidentes et sans ambiguïté
 * 
 * Pattern: mot_sans_accent → mot_avec_accent
 * Confiance: 100% (ajout d'accent uniquement)
 */

export const FRENCH_ACCENTS_DICTIONARY = new Map<string, string>([
  // === LIEUX PUBLICS ===
  ['aerport', 'aéroport'],
  ['aeroport', 'aéroport'],
  ['hopital', 'hôpital'],
  ['ecole', 'école'],
  ['universite', 'université'],
  ['eglise', 'église'],
  ['theatre', 'théâtre'],
  ['cinema', 'cinéma'],
  ['bibliotheque', 'bibliothèque'],
  ['prefecture', 'préfecture'],
  ['mairie', 'mairie'],  // Déjà correct
  ['musee', 'musée'],
  
  // === COMMERCES ===
  ['pharmacie', 'pharmacie'],  // Déjà correct
  ['boulangerie', 'boulangerie'],  // Déjà correct
  ['epicerie', 'épicerie'],
  ['librairie', 'librairie'],  // Déjà correct
  ['bijouterie', 'bijouterie'],  // Déjà correct
  ['patisserie', 'pâtisserie'],
  ['charcuterie', 'charcuterie'],  // Déjà correct
  ['boucherie', 'boucherie'],  // Déjà correct
  ['poisonnerie', 'poissonnerie'],  // Déjà correct
  ['fromagerie', 'fromagerie'],  // Déjà correct
  
  // === TRANSPORT ===
  ['gare', 'gare'],  // Déjà correct
  ['station', 'station'],  // Déjà correct
  ['arret', 'arrêt'],
  ['parking', 'parking'],  // Déjà correct
  ['garage', 'garage'],  // Déjà correct
  ['peage', 'péage'],
  
  // === RESTAURANTS ===
  ['restaurant', 'restaurant'],  // Déjà correct
  ['cafe', 'café'],
  ['bar', 'bar'],  // Déjà correct
  ['brasserie', 'brasserie'],  // Déjà correct
  ['creperie', 'crêperie'],
  ['pizzeria', 'pizzeria'],  // Déjà correct
  
  // === SERVICES ===
  ['banque', 'banque'],  // Déjà correct
  ['bureau', 'bureau'],  // Déjà correct
  ['agence', 'agence'],  // Déjà correct
  ['cabinet', 'cabinet'],  // Déjà correct
  ['clinique', 'clinique'],  // Déjà correct
  ['veterinaire', 'vétérinaire'],
  
  // === LOGEMENT ===
  ['hotel', 'hôtel'],
  ['residence', 'résidence'],
  ['appartement', 'appartement'],  // Déjà correct
  ['immeuble', 'immeuble'],  // Déjà correct
  ['chateau', 'château'],
  
  // === SPORTS/LOISIRS ===
  ['stade', 'stade'],  // Déjà correct
  ['gymnase', 'gymnase'],  // Déjà correct
  ['piscine', 'piscine'],  // Déjà correct
  ['terrain', 'terrain'],  // Déjà correct
  
  // === ADMINISTRATIF ===
  ['ministere', 'ministère'],
  ['ambassade', 'ambassade'],  // Déjà correct
  ['consulat', 'consulat'],  // Déjà correct
  ['tribunal', 'tribunal'],  // Déjà correct
  ['prison', 'prison'],  // Déjà correct
  ['commissariat', 'commissariat'],  // Déjà correct
  
  // === SANTÉ ===
  ['medecin', 'médecin'],
  ['dentiste', 'dentiste'],  // Déjà correct
  ['infirmier', 'infirmier'],  // Déjà correct
  ['kinesitherapeute', 'kinésithérapeute'],
  
  // === ÉDUCATION ===
  ['creche', 'crèche'],
  ['college', 'collège'],
  ['lycee', 'lycée'],
  ['faculte', 'faculté'],
  
  // === RELIGIEUX ===
  ['mosquee', 'mosquée'],
  ['cathedrale', 'cathédrale'],
  ['chapelle', 'chapelle'],  // Déjà correct
  
  // === NATURE ===
  ['foret', 'forêt'],
  ['riviere', 'rivière'],
  ['montagne', 'montagne'],  // Déjà correct
  ['plage', 'plage'],  // Déjà correct
  
  // === VARIANTES MAJUSCULES ===
  ['AERPORT', 'AÉROPORT'],
  ['HOPITAL', 'HÔPITAL'],
  ['ECOLE', 'ÉCOLE'],
  ['HOTEL', 'HÔTEL'],
  ['THEATRE', 'THÉÂTRE'],
  ['CINEMA', 'CINÉMA'],
  
  // === VARIANTES MIXTES ===
  ['Aerport', 'Aéroport'],
  ['Hopital', 'Hôpital'],
  ['Ecole', 'École'],
  ['Hotel', 'Hôtel'],
  ['Theatre', 'Théâtre'],
  ['Cinema', 'Cinéma']
]);

/**
 * Métadonnées du dictionnaire
 */
export const FRENCH_ACCENTS_METADATA = {
  name: 'french_accents',
  version: '1.0',
  size: FRENCH_ACCENTS_DICTIONARY.size,
  confidence: 1.0,  // Confiance maximale
  description: 'Correction accents français manquants',
  priority: 1,      // Priorité la plus haute
  safe: true        // Corrections 100% sûres
} as const;

/**
 * Fonction utilitaire pour vérifier si un mot a besoin de correction d'accent
 */
export function needsAccentCorrection(word: string): boolean {
  return FRENCH_ACCENTS_DICTIONARY.has(word.toLowerCase());
}

/**
 * Fonction utilitaire pour obtenir la correction d'accent
 */
export function getAccentCorrection(word: string): string | null {
  const correction = FRENCH_ACCENTS_DICTIONARY.get(word.toLowerCase());
  
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