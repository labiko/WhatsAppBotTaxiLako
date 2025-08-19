// ========================================
// SERVICE DE RECHERCHE INTELLIGENT
// ========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🆕 NOUVEAU: Import correction orthographique
import { TypoCorrector } from './typo-correction/typo-corrector.ts';
import { TypoCorrectorConfig, ULTRA_SAFE_CONFIG } from './typo-correction/config/typo-config.ts';

// Types
export interface SearchResult {
  id: string;
  name: string;
  address: string;
  coords?: { lat: number; lng: number };
  source: 'database_exact' | 'database_fuzzy' | 'database_permutation' | 'database_phonetic' | 'database_partial' | 'google_places' | 'suggestion';
  score: number;
  matchDetails?: {
    strategy: string;
    originalQuery: string;
    matchedWith?: string;
    similarity?: number;
    wordMatches?: string[];
  };
}

export interface SearchOptions {
  maxResults?: number;
  includeCoords?: boolean;
  userLocation?: { lat: number; lng: number };
  logLevel?: 'minimal' | 'detailed' | 'debug';
}

export interface SearchConfig {
  supabaseUrl: string;
  supabaseKey: string;
  googleApiKey?: string;
  primarySource: 'database' | 'google_places';
  fuzzyThreshold: number;
  maxSuggestions: number;
  
  // 🆕 NOUVEAU: Configuration correction orthographique
  enableTypoCorrection?: boolean;
  typoConfig?: TypoCorrectorConfig;
}

// Configuration par défaut
const DEFAULT_CONFIG: Partial<SearchConfig> = {
  primarySource: 'database',
  fuzzyThreshold: 0.3,
  maxSuggestions: 10
};

// ========================================
// CLASSE PRINCIPALE DE RECHERCHE
// ========================================

export class LocationSearchService {
  private config: SearchConfig;
  private supabase: any;
  private searchLog: string[] = [];

  constructor(config: SearchConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  // === FONCTION PRINCIPALE ===
  async searchLocationGeneric(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    this.clearLogs();
    this.log(`🔍 === RECHERCHE GÉNÉRIQUE DÉMARRÉE ===`, 'minimal');
    this.log(`📝 Requête: "${query}"`, 'minimal');
    this.log(`⚙️ Options: ${JSON.stringify(options)}`, 'detailed');
    this.log(`🎯 Source prioritaire: ${this.config.primarySource}`, 'minimal');
    
    const startTime = Date.now();
    
    try {
      // 🔥 NOUVEAU: Respecter la priorité configurée
      if (this.config.primarySource === 'google_places' && this.config.googleApiKey) {
        // 1️⃣ GOOGLE PLACES EN PRIORITÉ 1
        this.log(`🌐 === RECHERCHE GOOGLE PLACES PRIORITAIRE ===`, 'minimal');
        const googleResults = await this.searchInGooglePlaces(query, options);
        
        if (googleResults.length > 0) {
          const elapsed = Date.now() - startTime;
          this.log(`✅ ${googleResults.length} résultats Google Places en ${elapsed}ms`, 'minimal');
          return googleResults.slice(0, options.maxResults || this.config.maxSuggestions);
        }
        
        // 2️⃣ Fallback vers base de données si Google Places ne trouve rien
        this.log(`⚠️ Google Places: aucun résultat pour "${query}", fallback vers base`, 'minimal');
        const dbResults = await this.searchInDatabaseSmart(query, options);
        
        if (dbResults.length > 0) {
          const elapsed = Date.now() - startTime;
          this.log(`✅ ${dbResults.length} résultats fallback base en ${elapsed}ms`, 'minimal');
          return dbResults.slice(0, options.maxResults || this.config.maxSuggestions);
        }
        
      } else {
        // 1️⃣ BASE DE DONNÉES EN PRIORITÉ 1 (comportement original)
        this.log(`🗄️ === RECHERCHE BASE DE DONNÉES PRIORITAIRE ===`, 'minimal');
        const dbResults = await this.searchInDatabaseSmart(query, options);
        
        if (dbResults.length > 0) {
          const elapsed = Date.now() - startTime;
          this.log(`✅ ${dbResults.length} résultats trouvés en base en ${elapsed}ms`, 'minimal');
          this.log(`📊 Sources: ${this.getSourcesSummary(dbResults)}`, 'detailed');
          
          // Limiter au nombre demandé
          const limited = dbResults.slice(0, options.maxResults || this.config.maxSuggestions);
          this.log(`📤 Retour de ${limited.length} résultats (max: ${options.maxResults || this.config.maxSuggestions})`, 'detailed');
          
          return limited;
        }
        
        // 2️⃣ Fallback vers Google Places si base ne trouve rien
        this.log(`⚠️ Aucun résultat en base pour "${query}", fallback Google Places`, 'minimal');
        
        if (this.config.googleApiKey) {
          this.log(`🌐 Tentative de recherche Google Places...`, 'minimal');
          const googleResults = await this.searchInGooglePlaces(query, options);
          
          if (googleResults.length > 0) {
            const elapsed = Date.now() - startTime;
            this.log(`✅ ${googleResults.length} résultats Google Places en ${elapsed}ms`, 'minimal');
            return googleResults.slice(0, options.maxResults || this.config.maxSuggestions);
          }
        }
      }
      
      const elapsed = Date.now() - startTime;
      this.log(`❌ Aucun résultat trouvé après ${elapsed}ms`, 'minimal');
      return [];
      
    } catch (error) {
      this.log(`❌ ERREUR: ${error.message}`, 'minimal');
      throw error;
    }
  }

  // === RECHERCHE INTELLIGENTE EN BASE ===
  async searchInDatabaseSmart(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    this.log(`🔍 === RECHERCHE DATABASE SMART ===`, 'detailed');
    
    const normalizedQuery = this.normalizeText(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
    
    this.log(`📝 Query normalisée: "${normalizedQuery}"`, 'detailed');
    this.log(`🔤 Mots extraits: [${queryWords.join(', ')}]`, 'debug');
    
    // NOUVEAU: Gérer les variations orthographiques de Lambanyi
    let searchQueries = [normalizedQuery];
    const lambanVariations = ['lambay', 'lambayi', 'lambani'];
    
    for (const variation of lambanVariations) {
      if (normalizedQuery.includes(variation)) {
        const variantQuery = normalizedQuery.replace(new RegExp(variation, 'g'), 'lambanyi');
        searchQueries.push(variantQuery);
        this.log(`🔄 Ajout variation orthographique: ${variation} → lambanyi`, 'detailed');
      }
    }
    
    let allResults: SearchResult[] = [];
    
    // Rechercher avec toutes les variations
    for (const searchQuery of searchQueries) {
      const searchWords = searchQuery.split(' ').filter(w => w.length > 2);
      
      // 1️⃣ RECHERCHE EXACTE
      this.log(`1️⃣ Tentative recherche EXACTE pour: "${searchQuery}"`, 'detailed');
      const exactResults = await this.searchExact(searchQuery);
      if (exactResults.length > 0) {
        this.log(`✅ ${exactResults.length} résultats exacts trouvés`, 'minimal');
        allResults.push(...exactResults);
      }
      
      // 2️⃣ PERMUTATION DES MOTS
      if (searchWords.length > 1 && searchWords.length <= 4) {
        this.log(`2️⃣ Tentative PERMUTATION des mots pour: "${searchQuery}"`, 'detailed');
        const permResults = await this.searchWithPermutations(searchWords, searchQuery);
        if (permResults.length > 0) {
          this.log(`✅ ${permResults.length} résultats par permutation`, 'minimal');
          allResults.push(...permResults);
        }
      }
      
      // 3️⃣ FUZZY MATCHING
      this.log(`3️⃣ Tentative recherche FUZZY pour: "${searchQuery}"`, 'detailed');
      const fuzzyResults = await this.searchFuzzy(searchQuery, searchWords);
      if (fuzzyResults.length > 0) {
        this.log(`✅ ${fuzzyResults.length} résultats fuzzy trouvés`, 'minimal');
        allResults.push(...fuzzyResults);
      }
      
      // 4️⃣ RECHERCHE PARTIELLE
      if (allResults.length < 5 && searchWords.length > 0) {
        this.log(`4️⃣ Tentative recherche PARTIELLE pour: "${searchQuery}"`, 'detailed');
        const partialResults = await this.searchPartial(searchWords);
        if (partialResults.length > 0) {
          this.log(`✅ ${partialResults.length} résultats partiels trouvés`, 'minimal');
          allResults.push(...partialResults);
        }
      }
    }
    
    // Dédupliquer et trier par score
    const uniqueResults = this.deduplicateResults(allResults);
    const sortedResults = uniqueResults.sort((a, b) => b.score - a.score);
    
    this.log(`📊 Total après déduplication: ${sortedResults.length} résultats uniques`, 'detailed');
    
    return sortedResults;
  }

  // === RECHERCHES SPÉCIFIQUES ===
  
  private async searchExact(query: string): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('adresses_with_coords')
        .select('*')
        .eq('nom_normalise', query)
        .eq('actif', true)
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map((item, index) => ({
        id: item.id,
        name: item.nom,
        address: item.adresse_complete || item.nom,
        coords: item.latitude ? { lat: item.latitude, lng: item.longitude } : undefined,
        source: 'database_exact' as const,
        score: 100 - index,
        matchDetails: {
          strategy: 'exact',
          originalQuery: query
        }
      }));
    } catch (error) {
      this.log(`❌ Erreur searchExact: ${error.message}`, 'minimal');
      return [];
    }
  }

  private async searchWithPermutations(
    words: string[], 
    originalQuery: string
  ): Promise<SearchResult[]> {
    const permutations = this.generatePermutations(words);
    const results: SearchResult[] = [];
    
    for (const perm of permutations) {
      const permQuery = perm.join(' ');
      if (permQuery === originalQuery) continue;
      
      this.log(`🔄 Test permutation: "${permQuery}"`, 'debug');
      
      const { data } = await this.supabase
        .from('adresses_with_coords')
        .select('*')
        .ilike('nom_normalise', `%${permQuery}%`)
        .eq('actif', true)
        .limit(5);
      
      if (data?.length > 0) {
        results.push(...data.map((item, index) => ({
          id: item.id,
          name: item.nom,
          address: item.adresse_complete || item.nom,
          coords: item.latitude ? { lat: item.latitude, lng: item.longitude } : undefined,
          source: 'database_permutation' as const,
          score: 90 - index,
          matchDetails: {
            strategy: 'permutation',
            originalQuery: originalQuery,
            matchedWith: permQuery
          }
        })));
      }
    }
    
    return results;
  }

  private async searchFuzzy(query: string, words: string[]): Promise<SearchResult[]> {
    try {
      // Recherche fuzzy sur le nom complet
      const { data: fuzzyData } = await this.supabase
        .from('adresses_with_coords')
        .select('*')
        .gte('similarity(nom_normalise, $1)', this.config.fuzzyThreshold)
        .eq('actif', true)
        .limit(10);
      
      // Recherche où tous les mots sont présents
      let wordMatchData = [];
      if (words.length > 1) {
        let wordQuery = this.supabase
          .from('adresses_with_coords')
          .select('*')
          .eq('actif', true);
        
        // Ajouter condition pour chaque mot
        words.forEach(word => {
          wordQuery = wordQuery.ilike('nom_normalise', `%${word}%`);
        });
        
        const result = await wordQuery.limit(10);
        wordMatchData = result.data || [];
      }
      
      // Combiner les résultats
      const allData = [...(fuzzyData || []), ...wordMatchData];
      const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());
      
      return uniqueData.map((item, index) => ({
        id: item.id,
        name: item.nom,
        address: item.adresse_complete || item.nom,
        coords: item.latitude ? { lat: item.latitude, lng: item.longitude } : undefined,
        source: 'database_fuzzy' as const,
        score: 80 - index,
        matchDetails: {
          strategy: 'fuzzy',
          originalQuery: query,
          wordMatches: words
        }
      }));
    } catch (error) {
      this.log(`❌ Erreur searchFuzzy: ${error.message}`, 'minimal');
      return [];
    }
  }

  private async searchPartial(words: string[]): Promise<SearchResult[]> {
    const partialResults: Map<string, any> = new Map();
    
    for (const word of words) {
      if (word.length < 3) continue;
      
      this.log(`🔍 Recherche partielle pour: "${word}"`, 'debug');
      
      const { data } = await this.supabase
        .from('adresses_with_coords')
        .select('*')
        .ilike('nom_normalise', `%${word}%`)
        .eq('actif', true)
        .limit(20);
      
      data?.forEach(item => {
        if (!partialResults.has(item.id)) {
          partialResults.set(item.id, { ...item, matchCount: 1, matchedWords: [word] });
        } else {
          const existing = partialResults.get(item.id);
          existing.matchCount++;
          existing.matchedWords.push(word);
        }
      });
    }
    
    // Retourner ceux qui matchent au moins 60% des mots
    const minMatches = Math.ceil(words.length * 0.6);
    const filtered = Array.from(partialResults.values())
      .filter(r => r.matchCount >= minMatches)
      .sort((a, b) => b.matchCount - a.matchCount);
    
    return filtered.map((item, index) => ({
      id: item.id,
      name: item.nom,
      address: item.adresse_complete || item.nom,
      coords: item.latitude ? { lat: item.latitude, lng: item.longitude } : undefined,
      source: 'database_partial' as const,
      score: 70 - (index * 2),
      matchDetails: {
        strategy: 'partial',
        originalQuery: words.join(' '),
        wordMatches: item.matchedWords
      }
    }));
  }

  // === RECHERCHE GOOGLE PLACES ===
  async searchInGooglePlaces(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.config.googleApiKey) {
      this.log(`⚠️ Google API Key non configurée`, 'minimal');
      return [];
    }
    
    try {
      // 🆕 NOUVEAU: Correction orthographique avant appel Google Places
      let finalQuery = query;
      
      if (this.config.enableTypoCorrection && this.config.typoConfig) {
        const corrector = new TypoCorrector(this.config.typoConfig);
        const correction = corrector.correctQuery(query);
        
        if (correction.changed && correction.success) {
          finalQuery = correction.corrected;
          this.log(`🔧 Correction orthographique: "${query}" → "${finalQuery}"`, 'minimal');
          
          // Log détaillé des corrections appliquées
          correction.appliedCorrections.forEach(c => {
            this.log(`   [${c.category.toUpperCase()}] "${c.from}" → "${c.to}" (${(c.confidence * 100).toFixed(1)}%)`, 'detailed');
          });
        }
      }
      
      this.log(`🌐 Appel Google Places API pour: "${finalQuery}"`, 'detailed');
      
      // 🔥 VRAIE API GOOGLE PLACES ACTIVÉE (avec query corrigée)
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(finalQuery + ' Conakry Guinea')}&key=${this.config.googleApiKey}`;
      
      this.log(`🔗 URL Google: ${url.replace(this.config.googleApiKey, 'API_KEY_HIDDEN')}`, 'debug');
      
      const response = await fetch(url);
      const data = await response.json();
      
      this.log(`📥 Google Places réponse: status=${data.status}, results=${data.results?.length || 0}`, 'detailed');
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.log(`⚠️ Google Places status: ${data.status} - ${data.error_message || 'Erreur inconnue'}`, 'minimal');
        return [];
      }
      
      if (!data.results || data.results.length === 0) {
        this.log(`📭 Google Places: aucun résultat trouvé`, 'minimal');
        return [];
      }
      
      // Traiter les résultats Google Places
      const results = data.results.slice(0, options.maxResults || 5).map((place: any, index: number) => ({
        id: `google_${place.place_id}`, // ID unique basé sur place_id Google
        name: query,
        address: place.formatted_address,
        coords: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        source: 'google_places' as const,
        score: 95 - index, // Score élevé pour Google Places en priorité
        matchDetails: {
          strategy: 'google_places_api',
          originalQuery: query,
          place_id: place.place_id,
          types: place.types
        }
      }));
      
      this.log(`✅ ${results.length} résultats Google Places traités`, 'detailed');
      results.forEach((r, i) => {
        this.log(`   ${i+1}. ${r.name} (${r.coords?.lat}, ${r.coords?.lng})`, 'debug');
      });
      
      return results;
      
    } catch (error) {
      this.log(`❌ Erreur Google Places: ${error.message}`, 'minimal');
      return [];
    }
  }

  // === HELPERS ===
  
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generatePermutations(words: string[]): string[][] {
    if (words.length <= 1) return [words];
    if (words.length > 4) return [words]; // Limiter pour performance
    
    const perms: string[][] = [];
    
    // Algorithme de permutation simple
    const permute = (arr: string[], m: string[] = []) => {
      if (arr.length === 0) {
        perms.push(m);
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };
    
    permute(words);
    return perms;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();
    
    results.forEach(result => {
      if (!seen.has(result.id) || seen.get(result.id)!.score < result.score) {
        seen.set(result.id, result);
      }
    });
    
    return Array.from(seen.values());
  }

  private getSourcesSummary(results: SearchResult[]): string {
    const sources = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(sources)
      .map(([source, count]) => `${source}(${count})`)
      .join(', ');
  }

  // === GESTION DES LOGS ===
  
  private log(message: string, level: 'minimal' | 'detailed' | 'debug') {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logEntry = `[${timestamp}] ${message}`;
    
    this.searchLog.push(logEntry);
    
    // Afficher selon le niveau configuré
    const configLevel = this.config.logLevel || 'minimal';
    const levels = ['minimal', 'detailed', 'debug'];
    
    if (levels.indexOf(level) <= levels.indexOf(configLevel)) {
      console.log(logEntry);
    }
  }

  clearLogs() {
    this.searchLog = [];
  }

  getLogs(): string[] {
    return [...this.searchLog];
  }
}

// ========================================
// EXPORTS POUR TESTS UNITAIRES
// ========================================

// Export de la classe principale (déjà exportée à la ligne 51)

// Factory pour créer une instance
export function createSearchService(config: SearchConfig): LocationSearchService {
  return new LocationSearchService(config);
}

// ========================================
// EXPORTS DES FONCTIONS INTERNES POUR TESTS
// ========================================

// Créer une instance globale pour exposer les méthodes
let globalSearchService: LocationSearchService | null = null;

export function initializeSearchService(config: SearchConfig) {
  globalSearchService = new LocationSearchService(config);
  return globalSearchService;
}

// Exposer toutes les fonctions individuellement pour les tests
export async function searchInDatabaseSmart(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  if (!globalSearchService) throw new Error('Service non initialisé. Appelez initializeSearchService() d\'abord.');
  return globalSearchService.searchInDatabaseSmart(query, options);
}

export async function searchInGooglePlaces(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  if (!globalSearchService) throw new Error('Service non initialisé. Appelez initializeSearchService() d\'abord.');
  return globalSearchService.searchInGooglePlaces(query, options);
}

export async function searchLocationGeneric(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  if (!globalSearchService) throw new Error('Service non initialisé. Appelez initializeSearchService() d\'abord.');
  return globalSearchService.searchLocationGeneric(query, options);
}

// Fonctions utilitaires exportées
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generatePermutations(words: string[]): string[][] {
  if (words.length <= 1) return [words];
  if (words.length > 4) return [words];
  
  const perms: string[][] = [];
  
  const permute = (arr: string[], m: string[] = []) => {
    if (arr.length === 0) {
      perms.push(m);
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next));
      }
    }
  };
  
  permute(words);
  return perms;
}

// ========================================
// INTÉGRATION DIRECTE POUR LE BOT
// ========================================

// Configuration par défaut pour le bot
const DEFAULT_BOT_CONFIG: SearchConfig = {
  supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
  supabaseKey: Deno.env.get('SUPABASE_KEY') || '',
  googleApiKey: Deno.env.get('GOOGLE_PLACES_API_KEY'),
  primarySource: 'google_places', // 🔥 MODIFIÉ: Google Places en priorité 1
  fuzzyThreshold: 0.3,
  maxSuggestions: 10,
  logLevel: 'minimal',
  
  // 🆕 NOUVEAU: Configuration correction orthographique (DÉSACTIVÉE par défaut)
  enableTypoCorrection: false,  // 🔒 SÉCURITÉ: Désactivé pour déploiement initial
  typoConfig: {
    ...ULTRA_SAFE_CONFIG,
    enabled: false  // 🔒 Double sécurité: désactivé dans la config aussi
  }
};

// Fonction simplifiée pour le bot (remplace searchAdresse)
export async function searchLocation(query: string, supabaseUrl?: string, supabaseKey?: string): Promise<any> {
  // Initialiser le service si nécessaire
  if (!globalSearchService) {
    const config = {
      ...DEFAULT_BOT_CONFIG,
      supabaseUrl: supabaseUrl || DEFAULT_BOT_CONFIG.supabaseUrl,
      supabaseKey: supabaseKey || DEFAULT_BOT_CONFIG.supabaseKey
    };
    initializeSearchService(config);
  }
  
  // Rechercher (MODIFIÉ: 8 résultats au lieu de 1 pour suggestions multiples)
  const results = await searchLocationGeneric(query, { maxResults: 8 });
  
  // MODIFICATION MINIMALISTE : Retourner TOUS les résultats formatés pour suggestions multiples
  if (results.length > 0) {
    return results.map(result => ({
      id: result.id,
      nom: result.name,
      adresse_complete: result.address,
      latitude: result.coords?.lat,
      longitude: result.coords?.lng,
      source: result.source,
      score: result.score
    }));
  }
  
  return null;
}

// Fonction pour obtenir des suggestions multiples
export async function searchLocationWithSuggestions(query: string, maxSuggestions: number = 5): Promise<any[]> {
  const results = await searchLocationGeneric(query, { maxResults: maxSuggestions });
  
  return results.map(result => ({
    id: result.id,
    nom: result.name,
    adresse_complete: result.address,
    latitude: result.coords?.lat,
    longitude: result.coords?.lng,
    source: result.source,
    score: result.score
  }));
}