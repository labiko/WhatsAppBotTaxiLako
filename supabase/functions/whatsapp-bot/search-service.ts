// ========================================
// SERVICE DE RECHERCHE INTELLIGENT
// ========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    
    const startTime = Date.now();
    
    try {
      // 1️⃣ TOUJOURS chercher en base d'abord
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
      
      // 2️⃣ Si aucun résultat en base
      this.log(`⚠️ Aucun résultat en base pour "${query}"`, 'minimal');
      
      // 3️⃣ Chercher dans Google Places si configuré
      if (this.config.googleApiKey) {
        this.log(`🌐 Tentative de recherche Google Places...`, 'minimal');
        const googleResults = await this.searchInGooglePlaces(query, options);
        
        if (googleResults.length > 0) {
          const elapsed = Date.now() - startTime;
          this.log(`✅ ${googleResults.length} résultats Google Places en ${elapsed}ms`, 'minimal');
          return googleResults.slice(0, options.maxResults || this.config.maxSuggestions);
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
    
    let allResults: SearchResult[] = [];
    
    // 1️⃣ RECHERCHE EXACTE
    this.log(`1️⃣ Tentative recherche EXACTE...`, 'detailed');
    const exactResults = await this.searchExact(normalizedQuery);
    if (exactResults.length > 0) {
      this.log(`✅ ${exactResults.length} résultats exacts trouvés`, 'minimal');
      allResults.push(...exactResults);
    }
    
    // 2️⃣ PERMUTATION DES MOTS
    if (queryWords.length > 1 && queryWords.length <= 4) {
      this.log(`2️⃣ Tentative PERMUTATION des mots...`, 'detailed');
      const permResults = await this.searchWithPermutations(queryWords, normalizedQuery);
      if (permResults.length > 0) {
        this.log(`✅ ${permResults.length} résultats par permutation`, 'minimal');
        allResults.push(...permResults);
      }
    }
    
    // 3️⃣ FUZZY MATCHING
    this.log(`3️⃣ Tentative recherche FUZZY...`, 'detailed');
    const fuzzyResults = await this.searchFuzzy(normalizedQuery, queryWords);
    if (fuzzyResults.length > 0) {
      this.log(`✅ ${fuzzyResults.length} résultats fuzzy trouvés`, 'minimal');
      allResults.push(...fuzzyResults);
    }
    
    // 4️⃣ RECHERCHE PARTIELLE
    if (allResults.length < 5 && queryWords.length > 0) {
      this.log(`4️⃣ Tentative recherche PARTIELLE...`, 'detailed');
      const partialResults = await this.searchPartial(queryWords);
      if (partialResults.length > 0) {
        this.log(`✅ ${partialResults.length} résultats partiels trouvés`, 'minimal');
        allResults.push(...partialResults);
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
      this.log(`🌐 Appel Google Places API pour: "${query}"`, 'detailed');
      
      // Simuler l'appel API (à implémenter avec fetch réel)
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.config.googleApiKey}`;
      
      // const response = await fetch(url);
      // const data = await response.json();
      
      // Simulation pour test
      const mockData = {
        results: [
          {
            place_id: 'google_1',
            name: query,
            formatted_address: 'Adresse Google Places',
            geometry: { location: { lat: 9.5, lng: -13.7 } }
          }
        ]
      };
      
      return mockData.results.map((place, index) => ({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        coords: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        source: 'google_places' as const,
        score: 60 - index,
        matchDetails: {
          strategy: 'google_api',
          originalQuery: query
        }
      }));
      
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

// Export de la classe principale
export { LocationSearchService };

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
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',
  googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
  primarySource: 'database',
  fuzzyThreshold: 0.3,
  maxSuggestions: 10,
  logLevel: 'minimal'
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
  
  // Rechercher
  const results = await searchLocationGeneric(query, { maxResults: 1 });
  
  // Retourner le premier résultat dans le format attendu par le bot
  if (results.length > 0) {
    const result = results[0];
    return {
      id: result.id,
      nom: result.name,
      adresse_complete: result.address,
      latitude: result.coords?.lat,
      longitude: result.coords?.lng
    };
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