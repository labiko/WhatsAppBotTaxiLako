// ========================================
// CONFIGURATION SYSTÈME CORRECTION ORTHOGRAPHIQUE
// ========================================

/**
 * Interface de configuration complète du système de correction
 * Conçue pour une sécurité maximale avec des defaults ultra-conservateurs
 */

export interface TypoCorrectorConfig {
  // === ACTIVATION GRANULAIRE ===
  enabled: boolean;                           // Master switch - Défaut: false
  enableAccentCorrection: boolean;            // Défaut: true
  enableSmsCorrection: boolean;               // Défaut: false (plus risqué)
  enablePhoneticCorrection: boolean;          // Défaut: false (plus risqué)
  enableGuineaPlacesCorrection: boolean;      // Défaut: true (expertise locale)
  enableCommonTyposCorrection: boolean;       // Défaut: true (très sûr)
  
  // === SEUILS DE SÉCURITÉ ===
  minConfidenceThreshold: number;             // Défaut: 0.95 (très conservateur)
  maxCorrectionsPerQuery: number;             // Défaut: 1 (évite sur-correction)
  maxQueryLength: number;                     // Défaut: 100 (évite requêtes trop longues)
  minWordLength: number;                      // Défaut: 4 (pas de correction mots courts)
  
  // === PERFORMANCE ===
  maxProcessingTimeMs: number;                // Défaut: 5ms (timeout sécurité)
  enableCaching: boolean;                     // Défaut: true
  cacheSize: number;                          // Défaut: 500 corrections
  
  // === LOGGING ET MONITORING ===
  enableDetailedLogging: boolean;             // Défaut: false en prod
  logCorrectionStats: boolean;                // Défaut: true
  logPerformanceMetrics: boolean;             // Défaut: true
  logOnlyChanges: boolean;                    // Défaut: true (évite spam logs)
  
  // === SÉCURITÉ AVANCÉE ===
  preserveOriginalOnAmbiguity: boolean;       // Défaut: true (sécurité max)
  enableWhitelist: boolean;                   // Défaut: false
  whitelistedTerms: string[];                 // Termes à ne jamais corriger
  enableBlacklist: boolean;                   // Défaut: true
  blacklistedTerms: string[];                 // Termes à ignorer complètement
  
  // === FALLBACK ===
  fallbackToOriginalOnError: boolean;         // Défaut: true (sécurité ultime)
  enableGracefulDegradation: boolean;         // Défaut: true
}

/**
 * Configuration ultra-sécurisée par défaut
 * Utilisée pour le déploiement initial sans risque
 */
export const ULTRA_SAFE_CONFIG: TypoCorrectorConfig = {
  // Démarrage désactivé pour tests
  enabled: false,
  
  // Catégories les plus sûres uniquement
  enableAccentCorrection: true,      // ✅ Très sûr (aerport → aéroport)
  enableCommonTyposCorrection: true, // ✅ Très sûr (hoptal → hôpital)
  enableGuineaPlacesCorrection: true,// ✅ Spécifique, donc sûr
  enableSmsCorrection: false,        // ⚠️ Plus risqué, désactivé par défaut
  enablePhoneticCorrection: false,   // ⚠️ Plus risqué, désactivé par défaut
  
  // Seuils très conservateurs
  minConfidenceThreshold: 0.95,      // 95% de confiance minimum
  maxCorrectionsPerQuery: 1,         // 1 seule correction maximum
  maxQueryLength: 50,                // Requêtes courtes uniquement
  minWordLength: 4,                  // Mots >= 4 lettres uniquement
  
  // Performance stricte
  maxProcessingTimeMs: 5,            // 5ms maximum
  enableCaching: true,
  cacheSize: 500,
  
  // Logging détaillé pour début
  enableDetailedLogging: false,      // Pas de spam en prod
  logCorrectionStats: true,
  logPerformanceMetrics: true,
  logOnlyChanges: true,
  
  // Sécurité maximale
  preserveOriginalOnAmbiguity: true,
  enableWhitelist: false,
  whitelistedTerms: [],
  enableBlacklist: true,
  blacklistedTerms: [
    // Termes à ne jamais corriger (noms propres, etc.)
    'madina', 'kaloum', 'ratoma', 'kipé', 'simbaya', 'dixinn',
    'lambanyi', 'bambéto', 'matoto', 'matam', 'conakry'
  ],
  
  // Fallback absolu
  fallbackToOriginalOnError: true,
  enableGracefulDegradation: true
};

/**
 * Configuration pour développement avec logs détaillés
 */
export const DEVELOPMENT_CONFIG: TypoCorrectorConfig = {
  ...ULTRA_SAFE_CONFIG,
  enabled: true,                     // Activé pour les tests
  enableDetailedLogging: true,       // Logs complets
  maxProcessingTimeMs: 10,           // Plus de temps en dev
  minConfidenceThreshold: 0.85,      // Moins strict pour les tests
  maxCorrectionsPerQuery: 2,         // Plus permissif
  enableSmsCorrection: true,         // Toutes catégories activées
  enablePhoneticCorrection: true
};

/**
 * Configuration pour production optimisée
 */
export const PRODUCTION_CONFIG: TypoCorrectorConfig = {
  ...ULTRA_SAFE_CONFIG,
  enabled: true,                     // Activé en production
  enableDetailedLogging: false,      // Logs minimaux
  logOnlyChanges: true,              // Seulement les corrections appliquées
  enableSmsCorrection: true,         // Catégories sûres activées
  minConfidenceThreshold: 0.9,       // Équilibré pour la prod
  maxCorrectionsPerQuery: 2,         // Légèrement plus permissif
  cacheSize: 1000                    // Cache plus large
};

/**
 * Interface pour les résultats de correction
 */
export interface CorrectionResult {
  original: string;
  corrected: string;
  changed: boolean;
  success: boolean;
  processingTimeMs: number;
  appliedCorrections: AppliedCorrection[];
  totalConfidence: number;
  error?: string;
}

/**
 * Interface pour une correction appliquée
 */
export interface AppliedCorrection {
  from: string;
  to: string;
  category: 'accents' | 'sms' | 'phonetic' | 'guinea' | 'typos';
  confidence: number;
  position: number;
}

/**
 * Interface pour l'analyse de catégorie
 */
export interface CategoryAnalysis {
  word: string;
  correction: string;
  category: string;
  confidence: number;
  position: number;
}

/**
 * Interface pour les métadonnées de dictionnaire
 */
export interface DictionaryMetadata {
  name: string;
  version: string;
  size: number;
  confidence: number;
  description: string;
  priority: number;
  safe: boolean;
}

/**
 * Interface pour les métriques de performance
 */
export interface PerformanceMetrics {
  totalCorrections: number;
  successfulCorrections: number;
  failedCorrections: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  cacheHitRate: number;
  categoryUsage: Map<string, number>;
}

/**
 * Types d'événements pour le monitoring
 */
export type CorrectionEventType = 
  | 'correction_applied'
  | 'correction_skipped' 
  | 'error_occurred'
  | 'timeout_reached'
  | 'fallback_used'
  | 'cache_hit'
  | 'cache_miss';

/**
 * Interface pour les événements de correction
 */
export interface CorrectionEvent {
  type: CorrectionEventType;
  timestamp: number;
  query: string;
  result?: CorrectionResult;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Fonction utilitaire pour créer une configuration personnalisée
 */
export function createCustomConfig(overrides: Partial<TypoCorrectorConfig>): TypoCorrectorConfig {
  return {
    ...ULTRA_SAFE_CONFIG,
    ...overrides
  };
}

/**
 * Fonction pour valider une configuration
 */
export function validateConfig(config: TypoCorrectorConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validation des seuils
  if (config.minConfidenceThreshold < 0 || config.minConfidenceThreshold > 1) {
    errors.push('minConfidenceThreshold doit être entre 0 et 1');
  }
  
  if (config.maxCorrectionsPerQuery < 1 || config.maxCorrectionsPerQuery > 10) {
    errors.push('maxCorrectionsPerQuery doit être entre 1 et 10');
  }
  
  if (config.maxProcessingTimeMs < 1 || config.maxProcessingTimeMs > 1000) {
    errors.push('maxProcessingTimeMs doit être entre 1 et 1000');
  }
  
  if (config.minWordLength < 1 || config.minWordLength > 10) {
    errors.push('minWordLength doit être entre 1 et 10');
  }
  
  if (config.maxQueryLength < 10 || config.maxQueryLength > 1000) {
    errors.push('maxQueryLength doit être entre 10 et 1000');
  }
  
  // Validation logique
  if (config.enabled && !config.enableAccentCorrection && !config.enableSmsCorrection && 
      !config.enablePhoneticCorrection && !config.enableGuineaPlacesCorrection && 
      !config.enableCommonTyposCorrection) {
    errors.push('Au moins une catégorie de correction doit être activée si enabled=true');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Fonction pour obtenir une configuration en fonction de l'environnement
 */
export function getConfigForEnvironment(env: 'development' | 'production' | 'testing'): TypoCorrectorConfig {
  switch (env) {
    case 'development':
      return DEVELOPMENT_CONFIG;
    case 'production':
      return PRODUCTION_CONFIG;
    case 'testing':
      return {
        ...ULTRA_SAFE_CONFIG,
        enabled: true,
        enableDetailedLogging: true,
        maxProcessingTimeMs: 50  // Plus de temps pour les tests
      };
    default:
      return ULTRA_SAFE_CONFIG;
  }
}