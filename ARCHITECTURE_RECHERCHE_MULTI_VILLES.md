# 🏗️ ARCHITECTURE RECHERCHE INTELLIGENTE MULTI-VILLES

**Version :** 1.0  
**Date :** 2025-07-27  
**Statut :** ✅ Documenté - Prêt pour implémentation  

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Analyse de l'existant](#analyse-de-lexistant)
3. [Architecture modulaire](#architecture-modulaire)
4. [Système de recherche](#système-de-recherche)
5. [Implémentation technique](#implémentation-technique)
6. [Procédures d'extension](#procédures-dextension)
7. [Performance et monitoring](#performance-et-monitoring)
8. [Roadmap](#roadmap)

---

## 🎯 VUE D'ENSEMBLE

### Objectif Principal
Créer un système de recherche intelligente d'adresses et lieux **extensible facilement** pour supporter plusieurs villes guinéennes, en **réutilisant intégralement** la structure de base de données existante.

### Stratégie Architecturale : EXTRACTION + INJECTION (Pas d'API externe)

**🔄 PRINCIPE :**
- ❌ **PAS d'API externe** en temps réel (Google Places, OSM live)
- ✅ **EXTRACTION OSM** une seule fois → Base Supabase  
- ✅ **RECHERCHE 100% LOCALE** dans notre base
- ✅ **Performance optimale** + **Coût = 0€**

**📊 WORKFLOW :**
1. **Phase Extraction** (1 fois) : OSM Guinée → `guinea_complete.json` (~15,000 POI)
2. **Phase Injection** (1 fois) : Transform + Insert → Table `adresses` 
3. **Phase Utilisation** (permanent) : Recherche fuzzy locale <50ms

### Principes Architecturaux
- ✅ **Réutilisation maximale** de l'existant (table `adresses`, vues, extensions)
- ✅ **Extension ultra-simple** : nouvelle ville = 1 ligne de config + import données
- ✅ **Zero Breaking Change** : aucune modification destructive
- ✅ **Performance optimisée** : cache intelligent + recherche géographique
- ✅ **Recherche intelligente** : fuzzy search + IA + scoring multi-critères
- ✅ **Offline-first** : Aucune dépendance API externe

### Villes Supportées (Roadmap)
- 🟢 **Phase 1:** Conakry (actuel)
- 🟡 **Phase 2:** + Kindia (prochain)
- 🔵 **Phase 3:** + Labé, Boké
- ⚪ **Phase 4:** + Kankan, N'Zérékoré

---

## 📊 ANALYSE DE L'EXISTANT

### Structure Base de Données Actuelle

**✅ STRUCTURE OPTIMALE DÉJÀ EN PLACE :**

#### Table `adresses` (Principale - EXISTANTE)
```sql
adresses:
├── id (UUID) - Clé primaire
├── nom (VARCHAR 200) - Nom du lieu
├── nom_normalise (VARCHAR 200) ✅ Prêt pour fuzzy search
├── adresse_complete (TEXT) - Adresse détaillée
├── ville (VARCHAR 100) ✅ Support multi-villes native !
├── code_postal (VARCHAR 20)
├── pays (VARCHAR 100) - Default 'France'
├── position (GEOGRAPHY POINT) ✅ PostGIS intégré
├── type_lieu (VARCHAR 50) - Catégorie du lieu
├── actif (BOOLEAN) - Statut d'activation
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### Vue `adresses_with_coords` (EXISTANTE)
```sql
adresses_with_coords:
├── Toutes les colonnes de 'adresses'
├── latitude (DOUBLE PRECISION) ✅ Coordonnées pré-calculées
└── longitude (DOUBLE PRECISION) ✅ Performance optimisée
```

### Extensions PostgreSQL

**✅ INSTALLÉES :**
- `postgis` (3.3.7) : Fonctions géospatiales
- `fuzzystrmatch` (1.2) : Recherche phonétique

**⚠️ À INSTALLER :**
- `pg_trgm` : **REQUIS** pour fuzzy search avec similarity()
- `unaccent` : Normalisation des accents (optionnel mais recommandé)

### Tables Connexes
```sql
├── conducteurs (avec position_actuelle GEOGRAPHY)
├── reservations (avec pickup_location/destination)
├── sessions (état des conversations WhatsApp)
├── tarifs (prix par distance/type véhicule)
└── parametres (configuration système)
```

---

## 🎯 ARCHITECTURE MODULAIRE

### Configuration Multi-Villes

**Principe :** 1 ligne de configuration = 1 nouvelle ville supportée

```typescript
// config/cities-config.ts
export const SUPPORTED_CITIES = {
  conakry: {
    enabled: true,        // ✅ Actif par défaut
    priority: 1,          // Ordre de priorité recherche
    name: 'Conakry',
    country: 'Guinée',
    bounds: {             // Limites géographiques
      north: 9.7,
      south: 9.4,
      east: -13.5,
      west: -13.8
    },
    center: {             // Centre ville pour calculs distance
      lat: 9.5370,
      lon: -13.6785
    },
    cache_duration: 3600, // Cache 1h
    search_radius: 50000, // Rayon recherche 50km
    ai_confidence_threshold: 0.8
  },
  
  kindia: {
    enabled: false,       // 👈 Change à true pour activer Kindia
    priority: 2,
    name: 'Kindia',
    country: 'Guinée',
    bounds: {
      north: 10.2,
      south: 9.8,
      east: -12.5,
      west: -12.9
    },
    center: {
      lat: 10.0549,
      lon: -12.8641
    },
    cache_duration: 7200, // Cache 2h (moins fréquent)
    search_radius: 30000, // Rayon 30km (plus petit)
    ai_confidence_threshold: 0.7
  },
  
  // ✅ Ajouts futurs ultra-simples
  labe: {
    enabled: false,
    priority: 3,
    name: 'Labé',
    // ... configuration similaire
  }
};
```

### Interfaces TypeScript

```typescript
// types/location.ts
export interface CityConfig {
  enabled: boolean;
  priority: number;
  name: string;
  country: string;
  bounds: BoundingBox;
  center: GeoPoint;
  cache_duration: number;
  search_radius: number;
  ai_confidence_threshold: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface SearchOptions {
  userLocation?: GeoPoint;
  targetCity?: string;
  maxResults?: number;
  includeInactive?: boolean;
}

export interface LocationResult {
  id: string;
  nom: string;
  adresse_complete: string;
  ville: string;
  type_lieu: string;
  latitude: number;
  longitude: number;
  similarity_score: number;
  distance_km?: number;
  confidence: number;
  match_type: 'exact' | 'fuzzy' | 'phonetic' | 'geographic';
}
```

---

## 🔍 SYSTÈME DE RECHERCHE

### Algorithme Multi-Niveaux

```typescript
// services/MultiCityLocationService.ts
export class MultiCityLocationService {
  private cityCache = new Map<string, LocationResult[]>();
  private normalizer = new FrenchLocationNormalizer();
  
  async searchLocation(query: string, options: SearchOptions = {}): Promise<LocationResult[]> {
    const startTime = performance.now();
    
    // 1. Détection ville cible intelligente
    const targetCity = await this.detectTargetCity(query, options.userLocation);
    console.log(`🎯 Ville cible détectée: ${targetCity}`);
    
    // 2. Normalisation IA du texte français
    const normalizedQuery = await this.normalizer.normalize(query);
    console.log(`🧠 Normalisation: "${query}" → "${normalizedQuery.normalized}"`);
    
    // 3. Recherche dans ville spécifique
    let results = await this.searchInCity(normalizedQuery.normalized, targetCity);
    
    // 4. Si zéro résultat, expansion graduelle
    if (results.length === 0) {
      results = await this.expandSearchToOtherCities(normalizedQuery, targetCity);
    }
    
    // 5. Post-processing et ranking
    const finalResults = await this.rankAndFilterResults(results, targetCity, query);
    
    console.log(`🔍 Recherche terminée: ${finalResults.length} résultats en ${performance.now() - startTime}ms`);
    return finalResults;
  }
  
  private async detectTargetCity(query: string, userLocation?: GeoPoint): Promise<string> {
    // 1. Détection par mot-clé ville dans requête
    const cityFromQuery = this.extractCityFromQuery(query);
    if (cityFromQuery) return cityFromQuery;
    
    // 2. Détection par géolocalisation utilisateur
    if (userLocation) {
      const cityFromGPS = this.getCityFromCoordinates(userLocation);
      if (cityFromGPS) return cityFromGPS;
    }
    
    // 3. Ville par défaut
    return this.getDefaultCity();
  }
  
  private async searchInCity(query: string, cityName: string): Promise<LocationResult[]> {
    const cacheKey = `${cityName}:${query}`;
    
    // Cache lookup
    if (this.cityCache.has(cacheKey)) {
      console.log(`⚡ Cache hit pour ${cacheKey}`);
      return this.cityCache.get(cacheKey)!;
    }
    
    // Recherche base de données
    const { data, error } = await supabase.rpc('search_adresses_intelligent', {
      search_query: query,
      target_city: cityName,
      limit_results: 10
    });
    
    if (error) {
      console.error(`❌ Erreur recherche ${cityName}:`, error);
      return [];
    }
    
    // Mise en cache
    this.cityCache.set(cacheKey, data);
    
    // Expiration cache selon config ville
    const cityConfig = SUPPORTED_CITIES[cityName];
    if (cityConfig) {
      setTimeout(() => {
        this.cityCache.delete(cacheKey);
      }, cityConfig.cache_duration * 1000);
    }
    
    return data;
  }
  
  private extractCityFromQuery(query: string): string | null {
    const cityPatterns = {
      'conakry': ['conakry', 'cnk', 'capitale', 'cky'],
      'kindia': ['kindia', 'knd', 'kindia centre'],
      'labe': ['labé', 'labe', 'fouta', 'fouta djallon'],
      'boke': ['boké', 'boke', 'boffa']
    };
    
    const normalizedQuery = query.toLowerCase();
    
    for (const [city, patterns] of Object.entries(cityPatterns)) {
      if (patterns.some(pattern => normalizedQuery.includes(pattern))) {
        // Vérifier que la ville est activée
        if (SUPPORTED_CITIES[city]?.enabled) {
          return city;
        }
      }
    }
    
    return null;
  }
}
```

### Normalisation IA Française

```typescript
// services/FrenchLocationNormalizer.ts
export class FrenchLocationNormalizer {
  async normalize(query: string): Promise<NormalizedQuery> {
    const cleaned = this.cleanFrenchText(query);
    const variants = await this.generateFrenchVariants(cleaned);
    
    return {
      normalized: cleaned,
      variants: variants,
      confidence: this.calculateConfidence(query, cleaned)
    };
  }
  
  private cleanFrenchText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')                    // Décomposition Unicode
      .replace(/[\u0300-\u036f]/g, '')     // Supprime accents
      .replace(/[^a-z0-9\s\-]/g, '')      // Garde lettres, chiffres, espaces, traits d'union
      .replace(/\s+/g, ' ')               // Normalise espaces multiples
      .trim();
  }
  
  private async generateFrenchVariants(query: string): Promise<string[]> {
    const variants = new Set([query]);
    
    // Variations accents français
    const accentVariations = [
      { from: /e/g, to: 'é' },
      { from: /e/g, to: 'è' },
      { from: /e/g, to: 'ê' },
      { from: /a/g, to: 'à' },
      { from: /u/g, to: 'ù' },
      { from: /c/g, to: 'ç' }
    ];
    
    accentVariations.forEach(variation => {
      variants.add(query.replace(variation.from, variation.to));
    });
    
    // Variations phonétiques françaises
    const phoneticVariations = [
      { from: /ph/g, to: 'f' },
      { from: /qu/g, to: 'k' },
      { from: /tion/g, to: 'sion' },
      { from: /eau/g, to: 'o' }
    ];
    
    phoneticVariations.forEach(variation => {
      variants.add(query.replace(variation.from, variation.to));
    });
    
    // Abréviations courantes lieux
    const abbreviations = {
      'centre': ['ctre', 'center'],
      'marche': ['mche'],
      'hopital': ['hop', 'hôpital'],
      'ecole': ['école'],
      'quartier': ['qrt', 'qr']
    };
    
    Object.entries(abbreviations).forEach(([full, abbrevs]) => {
      if (query.includes(full)) {
        abbrevs.forEach(abbrev => {
          variants.add(query.replace(full, abbrev));
        });
      }
    });
    
    return Array.from(variants).filter(v => v !== query);
  }
}
```

---

## 🛠️ IMPLÉMENTATION TECHNIQUE

### Fonction PostgreSQL

```sql
-- Fonction de recherche utilisant la table adresses existante
CREATE OR REPLACE FUNCTION search_adresses_intelligent(
  search_query TEXT,
  target_city TEXT DEFAULT 'conakry',
  limit_results INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  nom TEXT,
  adresse_complete TEXT,
  ville TEXT,
  type_lieu TEXT,
  similarity_score FLOAT,
  distance_km FLOAT,
  latitude FLOAT,
  longitude FLOAT,
  match_type TEXT
) AS $$
DECLARE
  city_center GEOGRAPHY;
BEGIN
  -- Définition centres villes
  city_center := CASE target_city
    WHEN 'conakry' THEN ST_GeogFromText('POINT(-13.6785 9.5370)')
    WHEN 'kindia' THEN ST_GeogFromText('POINT(-12.8641 10.0549)')
    WHEN 'labe' THEN ST_GeogFromText('POINT(-12.2834 11.3178)')
    ELSE ST_GeogFromText('POINT(-13.6785 9.5370)') -- Défaut Conakry
  END;
  
  RETURN QUERY
  WITH scored_results AS (
    -- Correspondance exacte (score = 1.0)
    SELECT 
      a.id, a.nom, a.adresse_complete, a.ville, a.type_lieu,
      1.0::FLOAT as score,
      ST_Distance(a.position, city_center) / 1000.0 as dist_km,
      ST_Y(a.position::geometry) as lat,
      ST_X(a.position::geometry) as lon,
      'exact'::TEXT as match_type
    FROM adresses_with_coords a 
    WHERE 
      a.actif = true
      AND (target_city = 'all' OR lower(a.ville) = lower(target_city))
      AND lower(unaccent(a.nom)) = lower(unaccent(search_query))
    
    UNION ALL
    
    -- Correspondance fuzzy avec pg_trgm
    SELECT 
      a.id, a.nom, a.adresse_complete, a.ville, a.type_lieu,
      similarity(a.nom_normalise, lower(unaccent(search_query))) as score,
      ST_Distance(a.position, city_center) / 1000.0 as dist_km,
      ST_Y(a.position::geometry) as lat,
      ST_X(a.position::geometry) as lon,
      'fuzzy'::TEXT as match_type
    FROM adresses_with_coords a 
    WHERE 
      a.actif = true
      AND (target_city = 'all' OR lower(a.ville) = lower(target_city))
      AND similarity(a.nom_normalise, lower(unaccent(search_query))) > 0.3
      AND lower(unaccent(a.nom)) != lower(unaccent(search_query)) -- Éviter doublons
    
    UNION ALL
    
    -- Correspondance phonétique
    SELECT 
      a.id, a.nom, a.adresse_complete, a.ville, a.type_lieu,
      0.7::FLOAT as score,
      ST_Distance(a.position, city_center) / 1000.0 as dist_km,
      ST_Y(a.position::geometry) as lat,
      ST_X(a.position::geometry) as lon,
      'phonetic'::TEXT as match_type
    FROM adresses_with_coords a 
    WHERE 
      a.actif = true
      AND (target_city = 'all' OR lower(a.ville) = lower(target_city))
      AND soundex(a.nom_normalise) = soundex(lower(unaccent(search_query)))
      AND lower(unaccent(a.nom)) != lower(unaccent(search_query))
      AND similarity(a.nom_normalise, lower(unaccent(search_query))) <= 0.3
  )
  SELECT DISTINCT
    sr.id, sr.nom, sr.adresse_complete, sr.ville, sr.type_lieu,
    MAX(sr.score) * (1 + 1.0 / (1 + sr.dist_km * 0.1)) as final_score, -- Bonus proximité
    sr.dist_km, sr.lat, sr.lon, sr.match_type
  FROM scored_results sr
  GROUP BY sr.id, sr.nom, sr.adresse_complete, sr.ville, sr.type_lieu, sr.dist_km, sr.lat, sr.lon, sr.match_type
  ORDER BY final_score DESC, sr.dist_km ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
```

### Edge Function Architecture

```typescript
// supabase/functions/location-search/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { MultiCityLocationService } from "./services/MultiCityLocationService.ts";
import { SUPPORTED_CITIES } from "./config/cities-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req: Request): Promise<Response> => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
  
  try {
    const { query, userLocation, targetCity, maxResults = 8 } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query too short (minimum 2 characters)'
      }), { status: 400, headers: corsHeaders });
    }
    
    // Initialisation service de recherche
    const searchService = new MultiCityLocationService();
    
    // Recherche intelligente multi-villes
    const results = await searchService.searchLocation(query, {
      userLocation,
      targetCity,
      maxResults
    });
    
    // Analytics et tracking
    await trackCitySearch(query, targetCity || 'auto', results.length);
    
    // Réponse finale
    return new Response(JSON.stringify({
      success: true,
      query: query.trim(),
      targetCity: targetCity || 'auto-detected',
      results,
      metadata: {
        searchTime: performance.now(),
        resultCount: results.length,
        availableCities: Object.keys(SUPPORTED_CITIES)
          .filter(city => SUPPORTED_CITIES[city].enabled),
        version: '1.0'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache 5 minutes
      }
    });
    
  } catch (error) {
    console.error('❌ Location search error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      fallback: await getFallbackSuggestions(query || '')
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

async function trackCitySearch(query: string, city: string, resultCount: number): Promise<void> {
  try {
    // Tracking analytics (optionnel)
    console.log(`📊 Search: "${query}" in ${city} → ${resultCount} results`);
    
    // Ici on pourrait ajouter tracking dans une table analytics
    // INSERT INTO search_analytics (query, city, result_count, timestamp)
    
  } catch (error) {
    console.error('⚠️ Analytics tracking failed:', error);
  }
}

async function getFallbackSuggestions(query: string): Promise<string[]> {
  // Suggestions de fallback en cas d'erreur
  const commonLocations = [
    'Conakry Centre', 'Kipé', 'Matam', 'Ratoma', 'Madina',
    'Aéroport Conakry', 'Port de Conakry', 'Université Gamal'
  ];
  
  return commonLocations.filter(loc => 
    loc.toLowerCase().includes(query.toLowerCase().substring(0, 3))
  ).slice(0, 3);
}
```

---

## 🚀 PROCÉDURES D'EXTENSION

### Prérequis Techniques

**Extensions PostgreSQL à installer :**
```sql
-- Extensions requises pour recherche intelligente
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Fuzzy search avec similarity()
CREATE EXTENSION IF NOT EXISTS unaccent;    -- Normalisation accents français

-- Extensions déjà installées ✅
-- postgis (3.3.7) : Fonctions géospatiales
-- fuzzystrmatch (1.2) : Recherche phonétique avec soundex()
```

**Enrichissement table existante (non-destructif) :**
```sql
-- Ajouts colonnes pour optimisations (pas de suppression/modification)
ALTER TABLE adresses 
ADD COLUMN IF NOT EXISTS search_frequency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_confidence FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS variants TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_searched TIMESTAMP;

-- Index optimisés multi-villes
CREATE INDEX IF NOT EXISTS idx_adresses_ville_search 
ON adresses (ville, actif) WHERE actif = true;

CREATE INDEX IF NOT EXISTS idx_adresses_trgm_nom 
ON adresses USING GIN (nom_normalise gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_adresses_search_freq
ON adresses (search_frequency DESC) WHERE actif = true;
```

### Activation Nouvelle Ville (Exemple: Kindia)

**Temps total estimé : 5 minutes**

#### Étape 1: Configuration (30 secondes)
```typescript
// Dans config/cities-config.ts
kindia: {
  enabled: true,        // 👈 Changer false → true
  priority: 2,
  name: 'Kindia',
  country: 'Guinée',
  bounds: {
    north: 10.2,
    south: 9.8,
    east: -12.5,
    west: -12.9
  },
  center: {
    lat: 10.0549,
    lon: -12.8641
  },
  cache_duration: 7200,
  search_radius: 30000,
  ai_confidence_threshold: 0.7
}
```

#### Étape 2: Import Données (4 minutes)
```sql
-- Insertion adresses principales Kindia dans table existante
INSERT INTO adresses (nom, nom_normalise, adresse_complete, ville, position, type_lieu, actif)
VALUES 
  -- Centre-ville et lieux administratifs
  ('Kindia Centre', 'kindia centre', 'Centre-ville de Kindia', 'kindia', 
   ST_GeogFromText('POINT(-12.8641 10.0549)'), 'centre_ville', true),
  ('Préfecture de Kindia', 'prefecture de kindia', 'Bâtiment préfectoral', 'kindia',
   ST_GeogFromText('POINT(-12.8635 10.0555)'), 'administration', true),
  ('Mairie de Kindia', 'mairie de kindia', 'Hôtel de ville', 'kindia',
   ST_GeogFromText('POINT(-12.8648 10.0542)'), 'administration', true),
   
  -- Marchés et commerces
  ('Marché de Kindia', 'marche de kindia', 'Grand marché central', 'kindia',
   ST_GeogFromText('POINT(-12.8651 10.0559)'), 'marche', true),
  ('Marché Sonfonia', 'marche sonfonia', 'Marché quartier Sonfonia', 'kindia',
   ST_GeogFromText('POINT(-12.8628 10.0535)'), 'marche', true),
   
  -- Santé et éducation
  ('Hôpital Préfectoral Kindia', 'hopital prefectoral kindia', 'Hôpital principal', 'kindia',
   ST_GeogFromText('POINT(-12.8655 10.0565)'), 'hopital', true),
  ('Lycée Technique Kindia', 'lycee technique kindia', 'Établissement technique', 'kindia',
   ST_GeogFromText('POINT(-12.8625 10.0575)'), 'ecole', true),
   
  -- Transport
  ('Gare Routière Kindia', 'gare routiere kindia', 'Station transport inter-urbain', 'kindia',
   ST_GeogFromText('POINT(-12.8665 10.0525)'), 'transport', true),
  ('Taxi Park Kindia', 'taxi park kindia', 'Station taxis urbains', 'kindia',
   ST_GeogFromText('POINT(-12.8645 10.0545)'), 'transport', true),
   
  -- Quartiers principaux
  ('Sonfonia', 'sonfonia', 'Quartier Sonfonia', 'kindia',
   ST_GeogFromText('POINT(-12.8630 10.0530)'), 'quartier', true),
  ('Kolangui', 'kolangui', 'Quartier Kolangui', 'kindia',
   ST_GeogFromText('POINT(-12.8615 10.0585)'), 'quartier', true),
  ('Damakania', 'damakania', 'Quartier Damakania', 'kindia',
   ST_GeogFromText('POINT(-12.8675 10.0515)'), 'quartier', true);
```

#### Étape 3: Test et Validation (30 secondes)
```bash
# Test API recherche Kindia
curl -X POST https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/location-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "query": "marché kindia",
    "targetCity": "kindia",
    "maxResults": 5
  }'

# Résultat attendu
{
  "success": true,
  "query": "marché kindia",
  "targetCity": "kindia",
  "results": [
    {
      "id": "...",
      "nom": "Marché de Kindia",
      "ville": "kindia",
      "similarity_score": 1.0,
      "match_type": "exact"
    }
  ]
}
```

### Template Nouvelle Ville

```typescript
// Template pour ajouter n'importe quelle ville
new_city: {
  enabled: false,           // true pour activer
  priority: X,              // Numéro d'ordre
  name: 'Nom Ville',
  country: 'Guinée',
  bounds: {
    north: XX.XXXX,         // Coordonnées limites
    south: XX.XXXX,
    east: XX.XXXX,
    west: XX.XXXX
  },
  center: {
    lat: XX.XXXX,           // Centre ville
    lon: XX.XXXX
  },
  cache_duration: 7200,     // 2h pour villes secondaires
  search_radius: 30000,     // 30km rayon
  ai_confidence_threshold: 0.7
}
```

---

## 📊 PERFORMANCE ET MONITORING

### Métriques Cibles

**Temps de réponse :**
- Recherche une ville (cache hit) : `< 10ms`
- Recherche une ville (cache miss) : `< 50ms`
- Recherche multi-villes : `< 150ms`
- Recherche avec IA normalization : `< 200ms`

**Qualité résultats :**
- Précision (résultats pertinents) : `> 95%`
- Recall (résultats trouvés) : `> 90%`
- User satisfaction (sélection 1er résultat) : `> 85%`

**Performance base de données :**
- Index pg_trgm sur nom_normalise : `< 5ms`
- Recherche géographique PostGIS : `< 10ms`
- Cache Edge Function : `< 1ms`

### Monitoring et Analytics

```sql
-- Table analytics (optionnelle)
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  target_city TEXT,
  result_count INTEGER,
  response_time_ms INTEGER,
  user_selected_result_id UUID,
  client_ip INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Métriques principales
CREATE VIEW search_metrics AS
SELECT 
  target_city,
  COUNT(*) as total_searches,
  AVG(result_count) as avg_results,
  AVG(response_time_ms) as avg_response_time,
  COUNT(*) FILTER (WHERE user_selected_result_id IS NOT NULL) * 100.0 / COUNT(*) as selection_rate
FROM search_analytics 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY target_city;
```

### Optimisations Performance

**Cache Strategy :**
```typescript
// Stratégie cache multi-niveaux
class CacheManager {
  private l1Cache = new Map(); // Mémoire locale (10ms TTL)
  private l2Cache = new Map(); // Edge Function (1h TTL) 
  // L3 = PostgreSQL query cache automatique
  
  async get(key: string, city: string): Promise<any> {
    // L1: Mémoire ultra-rapide
    if (this.l1Cache.has(key)) return this.l1Cache.get(key);
    
    // L2: Cache Edge Function
    if (this.l2Cache.has(key)) {
      const result = this.l2Cache.get(key);
      this.l1Cache.set(key, result);
      return result;
    }
    
    // L3: Base de données
    return null;
  }
}
```

**Index Optimization :**
```sql
-- Index spécialisés par usage
CREATE INDEX CONCURRENTLY idx_adresses_popular_search 
ON adresses (search_frequency DESC, ville, actif) 
WHERE actif = true AND search_frequency > 0;

CREATE INDEX CONCURRENTLY idx_adresses_recent_search
ON adresses (last_searched DESC, ville)
WHERE last_searched > NOW() - INTERVAL '30 days';
```

---

## 🗺️ ROADMAP

### Phase 1: Conakry Optimisé ✅
**Status :** Actuel  
**Durée :** Terminé  
**Fonctionnalités :**
- ✅ Recherche fuzzy avec pg_trgm
- ✅ Normalisation française
- ✅ Cache intelligent
- ✅ API Edge Function
- ✅ Table adresses existante utilisée

### Phase 2: + Kindia 🟡
**Status :** Prêt pour implémentation  
**Durée estimée :** 1 jour  
**Fonctionnalités :**
- ✅ Configuration modulaire prête
- ✅ Détection automatique ville
- ✅ Import données Kindia (12+ lieux)
- ✅ Tests et validation

### Phase 3: + Labé, Boké 🔵
**Status :** Planifié  
**Durée estimée :** 2-3 jours  
**Fonctionnalités :**
- 🔄 Extension configuration
- 🔄 Import données OSM
- 🔄 Optimisation multi-régions
- 🔄 Analytics avancées

### Phase 4: Couverture Nationale ⚪
**Status :** Long terme  
**Durée estimée :** 1-2 semaines  
**Fonctionnalités :**
- 🔄 Kankan, N'Zérékoré, Faranah
- 🔄 Import massif OSM Guinée
- 🔄 Recherche inter-régions
- 🔄 Optimisation performance nationale

### Évolutions Futures
- 🚀 **IA Améliorée :** GPT-4 pour compréhension contextuelle
- 🚀 **Recherche Vocale :** Intégration Whisper
- 🚀 **Multilingue :** Support Pular, Malinké, Soussou
- 🚀 **Machine Learning :** Apprentissage préférences utilisateur

---

## 📚 RÉFÉRENCES

### Documentation Technique
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [PostGIS Geographic Functions](https://postgis.net/docs/reference.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Standards et Conventions
- [GeoJSON RFC 7946](https://tools.ietf.org/html/rfc7946)
- [ISO 3166-1 Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1)
- [Unicode CLDR Locales](http://cldr.unicode.org/)

### Outils et APIs
- [OpenStreetMap Overpass API](https://overpass-api.de/)
- [Natural Earth Data](https://www.naturalearthdata.com/)
- [GeoNames Database](https://www.geonames.org/)

---

**📝 Document maintenu par :** Architecture Team  
**🔄 Dernière mise à jour :** 2025-07-27  
**📋 Version :** 1.0  
**✅ Status :** Prêt pour implémentation