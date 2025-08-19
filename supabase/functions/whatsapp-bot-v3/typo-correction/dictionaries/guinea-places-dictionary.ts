// ========================================
// DICTIONNAIRE LIEUX GUINÉENS
// ========================================

/**
 * Dictionnaire des corrections orthographiques spécifiques à la Guinée
 * Catégorie très sûre - Orthographe locale spécifique
 * 
 * Pattern: orthographe_courante → orthographe_officielle_locale
 * Confiance: 95% (spécificités locales bien documentées)
 */

export const GUINEA_PLACES_DICTIONARY = new Map<string, string>([
  // === QUARTIERS CONAKRY - VARIATIONS ORTHOGRAPHIQUES ===
  ['lambayi', 'lambanyi'],
  ['lambay', 'lambanyi'],
  ['lambani', 'lambanyi'],
  ['lambanyi', 'lambanyi'],  // Déjà correct
  
  ['ratoma', 'ratoma'],  // Déjà correct
  ['ratoma', 'ratoma'],
  
  ['madina', 'madina'],  // Déjà correct
  ['medina', 'madina'],
  ['madin', 'madina'],
  
  ['kipe', 'kipé'],
  ['kipé', 'kipé'],  // Déjà correct
  ['kippé', 'kipé'],
  
  ['bambeto', 'bambéto'],
  ['bambéto', 'bambéto'],  // Déjà correct
  ['bambetto', 'bambéto'],
  
  ['simbaya', 'simbaya'],  // Déjà correct
  ['simba', 'simbaya'],
  ['simbay', 'simbaya'],
  
  ['dixinn', 'dixinn'],  // Déjà correct (orthographe locale)
  ['dixhinn', 'dixinn'],
  ['dikhinn', 'dixinn'],
  ['dixhin', 'dixinn'],
  
  ['kaloum', 'kaloum'],  // Déjà correct
  ['kalon', 'kaloum'],
  ['kaloum', 'kaloum'],
  
  ['matoto', 'matoto'],  // Déjà correct
  ['matotto', 'matoto'],
  ['mattoto', 'matoto'],
  
  ['matam', 'matam'],  // Déjà correct
  ['mattam', 'matam'],
  ['matan', 'matam'],
  
  // === AUTRES QUARTIERS CONAKRY ===
  ['hamdallaye', 'hamdallaye'],  // Déjà correct
  ['hamdallai', 'hamdallaye'],
  ['amdallaye', 'hamdallaye'],
  
  ['koloma', 'koloma'],  // Déjà correct
  ['kolom', 'koloma'],
  ['kolomma', 'koloma'],
  
  ['camayenne', 'camayenne'],  // Déjà correct
  ['kamayenne', 'camayenne'],
  ['camayèn', 'camayenne'],
  
  ['bellevue', 'bellevue'],  // Déjà correct
  ['belle vue', 'bellevue'],
  ['belvue', 'bellevue'],
  
  // === INSTITUTIONS GUINÉENNES ===
  ['palais du peuple', 'palais du peuple'],  // Déjà correct
  ['palé du peuple', 'palais du peuple'],
  ['palais peuple', 'palais du peuple'],
  
  ['assemblee nationale', 'assemblée nationale'],
  ['assemblée nationale', 'assemblée nationale'],  // Déjà correct
  ['asemblée nationale', 'assemblée nationale'],
  
  ['presidence', 'présidence'],
  ['présidence', 'présidence'],  // Déjà correct
  ['presidanse', 'présidence'],
  
  ['gouvernorat', 'gouvernorat'],  // Déjà correct
  ['gouvernora', 'gouvernorat'],
  ['governorat', 'gouvernorat'],
  
  ['prefecture', 'préfecture'],
  ['préfecture', 'préfecture'],  // Déjà correct
  ['prefektür', 'préfecture'],
  
  ['mairie', 'mairie'],  // Déjà correct
  ['mèrie', 'mairie'],
  ['mairrie', 'mairie'],
  
  // === HÔPITAUX CONAKRY ===
  ['ignace deen', 'ignace deen'],  // Déjà correct
  ['ignasse deen', 'ignace deen'],
  ['ignace din', 'ignace deen'],
  ['ignas deen', 'ignace deen'],
  
  ['hopital national', 'hôpital national'],
  ['hôpital national', 'hôpital national'],  // Déjà correct
  ['opital national', 'hôpital national'],
  
  ['sino guineen', 'sino-guinéen'],
  ['sino-guinéen', 'sino-guinéen'],  // Déjà correct
  ['sino guinéen', 'sino-guinéen'],
  ['chino guinéen', 'sino-guinéen'],
  
  ['donka', 'donka'],  // Déjà correct
  ['donk', 'donka'],
  ['donkar', 'donka'],
  
  // === UNIVERSITÉS ===
  ['gamal abdel nasser', 'gamal abdel nasser'],  // Déjà correct
  ['gamal nasser', 'gamal abdel nasser'],
  ['universite gamal', 'université gamal abdel nasser'],
  
  ['universite conakry', 'université de conakry'],
  ['université conakry', 'université de conakry'],
  ['université de conakry', 'université de conakry'],  // Déjà correct
  
  ['uganc', 'UGANC'],
  ['UGANC', 'UGANC'],  // Déjà correct
  
  // === MARCHÉS ===
  ['marche niger', 'marché niger'],
  ['marché niger', 'marché niger'],  // Déjà correct
  ['marché nigèr', 'marché niger'],
  
  ['marche madina', 'marché madina'],
  ['marché madina', 'marché madina'],  // Déjà correct
  ['marché de madina', 'marché madina'],
  
  ['marche bambeto', 'marché bambéto'],
  ['marché bambéto', 'marché bambéto'],  // Déjà correct
  ['marché de bambéto', 'marché bambéto'],
  
  ['grand marche', 'grand marché'],
  ['grand marché', 'grand marché'],  // Déjà correct
  ['gran marché', 'grand marché'],
  
  // === AÉROPORTS ===
  ['gbessia', 'gbessia'],  // Déjà correct
  ['gbesia', 'gbessia'],
  ['gbechia', 'gbessia'],
  
  ['aeroport conakry', 'aéroport de conakry'],
  ['aéroport conakry', 'aéroport de conakry'],
  ['aéroport de conakry', 'aéroport de conakry'],  // Déjà correct
  
  ['aeroport international', 'aéroport international'],
  ['aéroport international', 'aéroport international'],  // Déjà correct
  ['aeroport inter', 'aéroport international'],
  
  // === ROUTES/AXES PRINCIPAUX ===
  ['autoroute', 'autoroute'],  // Déjà correct
  ['otoroute', 'autoroute'],
  ['auto route', 'autoroute'],
  
  ['corniche', 'corniche'],  // Déjà correct
  ['korniche', 'corniche'],
  ['cornish', 'corniche'],
  
  ['avenue', 'avenue'],  // Déjà correct
  ['avenu', 'avenue'],
  ['avenü', 'avenue'],
  
  ['boulevard', 'boulevard'],  // Déjà correct
  ['bulvar', 'boulevard'],
  ['boulevar', 'boulevard'],
  
  // === AUTRES VILLES GUINÉE ===
  ['kindia', 'kindia'],  // Déjà correct
  ['kindi', 'kindia'],
  ['kindiaa', 'kindia'],
  
  ['boke', 'boké'],
  ['boké', 'boké'],  // Déjà correct
  ['bokè', 'boké'],
  
  ['labe', 'labé'],
  ['labé', 'labé'],  // Déjà correct
  ['labè', 'labé'],
  
  ['kankan', 'kankan'],  // Déjà correct
  ['kankane', 'kankan'],
  ['kancan', 'kankan'],
  
  ['nzerekoré', 'nzérékoré'],
  ['nzérékoré', 'nzérékoré'],  // Déjà correct
  ['nzerekore', 'nzérékoré'],
  
  ['faranah', 'faranah'],  // Déjà correct
  ['farana', 'faranah'],
  ['faranna', 'faranah'],
  
  ['mamou', 'mamou'],  // Déjà correct
  ['mamu', 'mamou'],
  ['mamù', 'mamou'],
  
  // === VARIANTES MAJUSCULES ===
  ['LAMBAYI', 'LAMBANYI'],
  ['RATOMA', 'RATOMA'],
  ['MADINA', 'MADINA'],
  ['KIPE', 'KIPÉ'],
  ['BAMBETO', 'BAMBÉTO'],
  
  // === VARIANTES MIXTES ===
  ['Lambayi', 'Lambanyi'],
  ['Ratoma', 'Ratoma'],
  ['Madina', 'Madina'],
  ['Kipe', 'Kipé'],
  ['Bambeto', 'Bambéto']
]);

/**
 * Métadonnées du dictionnaire
 */
export const GUINEA_PLACES_METADATA = {
  name: 'guinea_places',
  version: '1.0',
  size: GUINEA_PLACES_DICTIONARY.size,
  confidence: 0.95,  // Très haute confiance (spécificités locales)
  description: 'Correction orthographe lieux guinéens',
  priority: 1,       // Priorité très haute (expertise locale)
  safe: true         // Corrections très sûres
} as const;

/**
 * Fonction utilitaire pour vérifier si un mot est un lieu guinéen
 */
export function isGuineaPlace(word: string): boolean {
  return GUINEA_PLACES_DICTIONARY.has(word.toLowerCase());
}

/**
 * Fonction utilitaire pour obtenir la correction d'un lieu guinéen
 */
export function getGuineaPlaceCorrection(word: string): string | null {
  const correction = GUINEA_PLACES_DICTIONARY.get(word.toLowerCase());
  
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
 * Liste des quartiers de Conakry (pour validation contextuelle)
 */
export const CONAKRY_DISTRICTS = new Set([
  'lambanyi', 'ratoma', 'madina', 'kipé', 'bambéto', 'simbaya', 
  'dixinn', 'kaloum', 'matoto', 'matam', 'hamdallaye', 'koloma',
  'camayenne', 'bellevue'
]);

/**
 * Fonction pour vérifier si un lieu est un quartier de Conakry
 */
export function isConakryDistrict(place: string): boolean {
  return CONAKRY_DISTRICTS.has(place.toLowerCase());
}

/**
 * Liste des autres villes importantes de Guinée
 */
export const MAJOR_GUINEA_CITIES = new Set([
  'kindia', 'boké', 'labé', 'kankan', 'nzérékoré', 
  'faranah', 'mamou', 'siguiri', 'kouroussa'
]);

/**
 * Fonction pour vérifier si un lieu est une ville importante de Guinée
 */
export function isMajorGuineaCity(place: string): boolean {
  return MAJOR_GUINEA_CITIES.has(place.toLowerCase());
}