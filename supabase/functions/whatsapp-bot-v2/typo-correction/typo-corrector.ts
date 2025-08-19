// ========================================
// CLASSE PRINCIPALE CORRECTION ORTHOGRAPHIQUE
// ========================================

import { 
  TypoCorrectorConfig, 
  CorrectionResult, 
  AppliedCorrection, 
  CategoryAnalysis,
  CorrectionEvent,
  CorrectionEventType,
  PerformanceMetrics,
  ULTRA_SAFE_CONFIG 
} from './config/typo-config.ts';

import { 
  FRENCH_ACCENTS_DICTIONARY, 
  FRENCH_ACCENTS_METADATA,
  getAccentCorrection 
} from './dictionaries/french-accents-dictionary.ts';

import { 
  SMS_SHORTCUTS_DICTIONARY, 
  SMS_SHORTCUTS_METADATA,
  getSmsExpansion,
  isAmbiguousSmsShortcut 
} from './dictionaries/sms-shortcuts-dictionary.ts';

import { 
  PHONETIC_VARIANTS_DICTIONARY, 
  PHONETIC_VARIANTS_METADATA,
  getPhoneticCorrection,
  isAmbiguousPhoneticVariant 
} from './dictionaries/phonetic-variants-dictionary.ts';

import { 
  GUINEA_PLACES_DICTIONARY, 
  GUINEA_PLACES_METADATA,
  getGuineaPlaceCorrection 
} from './dictionaries/guinea-places-dictionary.ts';

import { 
  COMMON_TYPOS_DICTIONARY, 
  COMMON_TYPOS_METADATA,
  getCommonTypoCorrection,
  shouldNeverCorrect 
} from './dictionaries/common-typos-dictionary.ts';

/**
 * Interface pour les mots tokenisés avec position
 */
interface TokenizedWord {
  text: string;
  position: number;
  length: number;
}

/**
 * Interface pour le résultat du preprocessing
 */
interface PreprocessResult {
  original: string;
  normalized: string;
  words: TokenizedWord[];
  preserveCase: boolean;
}

/**
 * Interface pour le résultat de validation
 */
interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Classe principale de correction orthographique intelligente
 * Architecture sécurisée avec fallbacks multiples et monitoring intégré
 */
export class TypoCorrector {
  private config: TypoCorrectorConfig;
  private cache: Map<string, CorrectionResult>;
  private metrics: PerformanceMetrics;
  private events: CorrectionEvent[];
  private startTime: number = 0;

  constructor(config: TypoCorrectorConfig = ULTRA_SAFE_CONFIG) {
    this.config = config;
    this.cache = new Map();
    this.metrics = this.initializeMetrics();
    this.events = [];
  }

  // =====================================================
  // MÉTHODE PRINCIPALE DE CORRECTION
  // =====================================================

  /**
   * Méthode principale de correction orthographique
   * Point d'entrée sécurisé avec validation et fallbacks
   */
  correctQuery(query: string): CorrectionResult {
    this.startTime = Date.now();

    try {
      // Étape 1: Validation préalable
      const validation = this.validateInput(query);
      if (!validation.valid) {
        return this.createFailureResult(query, `Validation échouée: ${validation.reason}`);
      }

      // Étape 2: Vérification cache
      if (this.config.enableCaching && this.cache.has(query)) {
        const cached = this.cache.get(query)!;
        this.logEvent('cache_hit', query);
        return cached;
      }

      // Étape 3: Vérification si correction désactivée
      if (!this.config.enabled) {
        return this.createSuccessResult(query, query, []);
      }

      // Étape 4: Preprocessing intelligent
      const preprocessResult = this.preprocessQuery(query);

      // Étape 5: Analyse par catégorie avec priorisation
      const analyses = this.analyzeByCategory(preprocessResult.words);

      // Étape 6: Résolution des conflits
      const resolvedCorrections = this.resolveConflicts(analyses);

      // Étape 7: Application sécurisée des corrections
      const result = this.applyCorrections(preprocessResult, resolvedCorrections);

      // Étape 8: Validation finale et cache
      const finalResult = this.finalizeCorrectionResult(result);
      
      if (this.config.enableCaching) {
        this.cache.set(query, finalResult);
        
        // Nettoyage du cache si trop grand
        if (this.cache.size > this.config.cacheSize) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      this.logEvent('correction_applied', query, finalResult);
      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logEvent('error_occurred', query, undefined, error as Error);
      
      if (this.config.fallbackToOriginalOnError) {
        return this.createFailureResult(query, errorMessage);
      }
      
      throw error;
    }
  }

  // =====================================================
  // VALIDATION ET PREPROCESSING
  // =====================================================

  private validateInput(query: string): ValidationResult {
    // Vérifications de base
    if (!query || typeof query !== 'string') {
      return { valid: false, reason: 'Query invalide ou vide' };
    }
    
    if (query.length > this.config.maxQueryLength) {
      return { valid: false, reason: 'Query trop longue' };
    }
    
    if (query.trim().length === 0) {
      return { valid: false, reason: 'Query vide après trim' };
    }

    // Détection caractères suspects
    const suspiciousChars = /[<>{}[\]\\|`~]/;
    if (suspiciousChars.test(query)) {
      return { valid: false, reason: 'Caractères suspects détectés' };
    }

    return { valid: true };
  }

  private preprocessQuery(query: string): PreprocessResult {
    const original = query;
    
    // Normalisation conservatrice
    const normalized = query
      .trim()
      .replace(/\s+/g, ' ')  // Espaces multiples → simple
      .toLowerCase();        // Casse uniforme
    
    // Tokenisation avec préservation de position
    const words = this.tokenizeWithPositions(normalized);
    
    // Déterminer si on doit préserver la casse
    const preserveCase = this.shouldPreserveCase(original);
    
    return {
      original,
      normalized,
      words,
      preserveCase
    };
  }

  private tokenizeWithPositions(text: string): TokenizedWord[] {
    const words: TokenizedWord[] = [];
    const regex = /\b\w+\b/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      words.push({
        text: match[0],
        position: match.index,
        length: match[0].length
      });
    }
    
    return words;
  }

  private shouldPreserveCase(original: string): boolean {
    // Si tout en majuscules, préserver
    if (original === original.toUpperCase()) return true;
    
    // Si première lettre majuscule, préserver
    if (original[0] === original[0].toUpperCase()) return true;
    
    return false;
  }

  // =====================================================
  // ANALYSE PAR CATÉGORIE AVEC PRIORISATION
  // =====================================================

  private analyzeByCategory(words: TokenizedWord[]): CategoryAnalysis[] {
    const analyses: CategoryAnalysis[] = [];
    
    // Ordre de priorité (du plus sûr au moins sûr)
    const categoryOrder = [
      { 
        name: 'accents', 
        enabled: this.config.enableAccentCorrection,
        dictionary: FRENCH_ACCENTS_DICTIONARY,
        metadata: FRENCH_ACCENTS_METADATA,
        getCorrection: getAccentCorrection
      },
      { 
        name: 'typos', 
        enabled: this.config.enableCommonTyposCorrection,
        dictionary: COMMON_TYPOS_DICTIONARY,
        metadata: COMMON_TYPOS_METADATA,
        getCorrection: getCommonTypoCorrection
      },
      { 
        name: 'guinea', 
        enabled: this.config.enableGuineaPlacesCorrection,
        dictionary: GUINEA_PLACES_DICTIONARY,
        metadata: GUINEA_PLACES_METADATA,
        getCorrection: getGuineaPlaceCorrection
      },
      { 
        name: 'sms', 
        enabled: this.config.enableSmsCorrection,
        dictionary: SMS_SHORTCUTS_DICTIONARY,
        metadata: SMS_SHORTCUTS_METADATA,
        getCorrection: getSmsExpansion
      },
      { 
        name: 'phonetic', 
        enabled: this.config.enablePhoneticCorrection,
        dictionary: PHONETIC_VARIANTS_DICTIONARY,
        metadata: PHONETIC_VARIANTS_METADATA,
        getCorrection: getPhoneticCorrection
      }
    ];

    for (const word of words) {
      // Ignorer les mots trop courts
      if (word.text.length < this.config.minWordLength) continue;
      
      // Ignorer les mots en blacklist
      if (this.isInBlacklist(word.text)) continue;
      
      // Ignorer les mots à ne jamais corriger
      if (shouldNeverCorrect(word.text)) continue;

      for (const category of categoryOrder) {
        if (!category.enabled) continue;
        
        const correction = category.getCorrection(word.text);
        if (correction && correction !== word.text) {
          const confidence = this.calculateConfidence(
            word.text, 
            correction, 
            category.metadata
          );
          
          if (confidence >= this.config.minConfidenceThreshold) {
            analyses.push({
              word: word.text,
              correction,
              category: category.name,
              confidence,
              position: word.position
            });
            
            // Première correction valide trouvée pour ce mot
            break;
          }
        }
      }
    }

    return analyses;
  }

  private calculateConfidence(
    original: string, 
    correction: string, 
    metadata: any
  ): number {
    let confidence = metadata.confidence || 0.8;
    
    // Bonus pour corrections d'accents (très sûres)
    if (metadata.name === 'french_accents') {
      const withoutAccents = this.removeAccents(correction);
      if (withoutAccents === original) {
        confidence = 1.0;  // Confiance maximale
      }
    }
    
    // Malus pour corrections drastiques
    const editDistance = this.calculateLevenshteinDistance(original, correction);
    const lengthDiff = Math.abs(original.length - correction.length);
    
    if (editDistance > 3) confidence *= 0.7;
    if (lengthDiff > 3) confidence *= 0.8;
    
    // Bonus pour mots courts avec correction simple
    if (original.length <= 6 && editDistance === 1) {
      confidence *= 1.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // =====================================================
  // RÉSOLUTION DES CONFLITS
  // =====================================================

  private resolveConflicts(analyses: CategoryAnalysis[]): CategoryAnalysis[] {
    const resolved: CategoryAnalysis[] = [];
    const positionMap = new Map<number, CategoryAnalysis[]>();
    
    // Grouper par position
    for (const analysis of analyses) {
      if (!positionMap.has(analysis.position)) {
        positionMap.set(analysis.position, []);
      }
      positionMap.get(analysis.position)!.push(analysis);
    }
    
    // Résoudre conflits par position
    for (const [position, candidates] of positionMap) {
      if (candidates.length === 1) {
        resolved.push(candidates[0]);
      } else {
        // Conflit détecté - prendre la correction la plus sûre
        const best = candidates.reduce((a, b) => 
          a.confidence > b.confidence ? a : b
        );
        
        this.log(`⚠️ Conflit résolu position ${position}: ${best.word} → ${best.correction} (${best.category})`, 'detailed');
        
        // N'ajouter que si très confiant
        if (best.confidence >= this.config.minConfidenceThreshold) {
          resolved.push(best);
        }
      }
    }
    
    // Limiter au nombre maximum de corrections
    return resolved.slice(0, this.config.maxCorrectionsPerQuery);
  }

  // =====================================================
  // APPLICATION SÉCURISÉE DES CORRECTIONS
  // =====================================================

  private applyCorrections(
    preprocessResult: PreprocessResult, 
    corrections: CategoryAnalysis[]
  ): CorrectionResult {
    try {
      let correctedText = preprocessResult.normalized;
      const appliedCorrections: AppliedCorrection[] = [];
      
      // Tri par position (de droite à gauche pour éviter décalages)
      const sortedCorrections = corrections.sort((a, b) => b.position - a.position);
      
      for (const correction of sortedCorrections) {
        // Vérification timeout
        if (Date.now() - this.startTime > this.config.maxProcessingTimeMs) {
          this.logEvent('timeout_reached', preprocessResult.original);
          break;
        }
        
        const before = correctedText;
        correctedText = this.replaceWordAtPosition(
          correctedText,
          correction.word,
          correction.correction,
          correction.position
        );
        
        if (before !== correctedText) {
          appliedCorrections.push({
            from: correction.word,
            to: correction.correction,
            category: correction.category as any,
            confidence: correction.confidence,
            position: correction.position
          });
        }
      }
      
      // Restauration de la casse si nécessaire
      if (preprocessResult.preserveCase) {
        correctedText = this.restoreCase(correctedText, preprocessResult.original);
      }
      
      const processingTime = Date.now() - this.startTime;
      
      return this.createSuccessResult(
        preprocessResult.original,
        correctedText,
        appliedCorrections,
        processingTime
      );
      
    } catch (error) {
      this.log(`❌ Erreur application corrections: ${error.message}`, 'minimal');
      
      if (this.config.fallbackToOriginalOnError) {
        return this.createFailureResult(
          preprocessResult.original, 
          error.message
        );
      }
      
      throw error;
    }
  }

  private replaceWordAtPosition(
    text: string, 
    oldWord: string, 
    newWord: string, 
    position: number
  ): string {
    const before = text.substring(0, position);
    const after = text.substring(position + oldWord.length);
    return before + newWord + after;
  }

  private restoreCase(correctedText: string, originalText: string): string {
    if (originalText === originalText.toUpperCase()) {
      return correctedText.toUpperCase();
    }
    
    if (originalText[0] === originalText[0].toUpperCase()) {
      return correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
    }
    
    return correctedText;
  }

  // =====================================================
  // FONCTIONS UTILITAIRES
  // =====================================================

  private removeAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private calculateLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  private isInBlacklist(word: string): boolean {
    if (!this.config.enableBlacklist) return false;
    return this.config.blacklistedTerms.includes(word.toLowerCase());
  }

  // =====================================================
  // GESTION DES RÉSULTATS
  // =====================================================

  private createSuccessResult(
    original: string,
    corrected: string,
    corrections: AppliedCorrection[],
    processingTime?: number
  ): CorrectionResult {
    const totalConfidence = corrections.length > 0 ? 
      corrections.reduce((sum, c) => sum + c.confidence, 0) / corrections.length : 1.0;
    
    return {
      original,
      corrected,
      changed: original !== corrected,
      success: true,
      processingTimeMs: processingTime || (Date.now() - this.startTime),
      appliedCorrections: corrections,
      totalConfidence
    };
  }

  private createFailureResult(original: string, error: string): CorrectionResult {
    return {
      original,
      corrected: original,  // Fallback vers original
      changed: false,
      success: false,
      processingTimeMs: Date.now() - this.startTime,
      appliedCorrections: [],
      totalConfidence: 0,
      error
    };
  }

  private finalizeCorrectionResult(result: CorrectionResult): CorrectionResult {
    // Log selon la configuration
    if (this.config.logOnlyChanges && result.changed) {
      this.log(`🔧 "${result.original}" → "${result.corrected}" (${result.appliedCorrections.length} corrections)`, 'minimal');
    } else if (this.config.enableDetailedLogging) {
      this.logDetailed(result);
    }
    
    // Mise à jour des métriques
    this.updateMetrics(result);
    
    return result;
  }

  // =====================================================
  // LOGGING ET MONITORING
  // =====================================================

  private log(message: string, level: 'minimal' | 'detailed' | 'debug') {
    if (!this.config.enableDetailedLogging && level !== 'minimal') return;
    
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    console.log(`[${timestamp}] TYPO: ${message}`);
  }

  private logDetailed(result: CorrectionResult) {
    console.log(`📊 === CORRECTION DÉTAILLÉE ===`);
    console.log(`📝 Original: "${result.original}"`);
    console.log(`✅ Corrigé: "${result.corrected}"`);
    console.log(`⏱️ Temps: ${result.processingTimeMs}ms`);
    console.log(`🔢 Corrections: ${result.appliedCorrections.length}`);
    
    for (const correction of result.appliedCorrections) {
      console.log(`   🔧 [${correction.category.toUpperCase()}] "${correction.from}" → "${correction.to}" (${(correction.confidence * 100).toFixed(1)}%)`);
    }
    
    console.log(`📈 Confiance totale: ${(result.totalConfidence * 100).toFixed(1)}%`);
  }

  private logEvent(
    type: CorrectionEventType, 
    query: string, 
    result?: CorrectionResult, 
    error?: Error
  ) {
    if (!this.config.logPerformanceMetrics) return;
    
    const event: CorrectionEvent = {
      type,
      timestamp: Date.now(),
      query,
      result,
      error
    };
    
    this.events.push(event);
    
    // Limiter la taille du log d'événements
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  // =====================================================
  // MÉTRIQUES ET STATISTIQUES
  // =====================================================

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalCorrections: 0,
      successfulCorrections: 0,
      failedCorrections: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      cacheHitRate: 0,
      categoryUsage: new Map()
    };
  }

  private updateMetrics(result: CorrectionResult) {
    this.metrics.totalCorrections++;
    
    if (result.success) {
      this.metrics.successfulCorrections++;
    } else {
      this.metrics.failedCorrections++;
    }
    
    // Mise à jour des temps de traitement
    if (result.processingTimeMs > this.metrics.maxProcessingTime) {
      this.metrics.maxProcessingTime = result.processingTimeMs;
    }
    
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalCorrections - 1) + result.processingTimeMs) 
      / this.metrics.totalCorrections;
    
    // Mise à jour de l'utilisation des catégories
    for (const correction of result.appliedCorrections) {
      const count = this.metrics.categoryUsage.get(correction.category) || 0;
      this.metrics.categoryUsage.set(correction.category, count + 1);
    }
  }

  // =====================================================
  // API PUBLIQUE POUR MONITORING
  // =====================================================

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getEvents(): CorrectionEvent[] {
    return [...this.events];
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.events = [];
  }
}