# 🤖 DOCUMENTATION COMPLÈTE - BOT V2 RECHERCHE INTELLIGENTE

## 📋 Vue d'ensemble

**Bot WhatsApp V2** avec système de **recherche intelligente** d'adresses utilisant fuzzy matching, permutations de mots et fallback Google Places API. Architecture modulaire pour maximiser les performances et la précision.

---

## 🏗️ Architecture générale

```
📦 whatsapp-bot-v2/
├── 📄 index.ts                    # Bot principal avec logique métier
├── 📄 search-service.ts           # Service de recherche intelligent
└── 📄 index_backup_V2_*.ts        # Backups versionnés
```

**🔗 URL de production :**
```
https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2
```

---

## 🎯 Différences avec le bot principal

| Aspect | Bot Principal | Bot V2 |
|--------|---------------|--------|
| **Recherche** | SQL standard | Recherche intelligente multicouche |
| **Sources** | Base de données seulement | Base + Google Places fallback |
| **Logs** | Basiques | Détaillés avec source et score |
| **Performance** | Standard | Optimisée avec fuzzy matching |
| **Fallback** | Erreur si pas trouvé | Multiple strategies + API externe |

---

## 🔧 MÉTHODES PRINCIPALES - INDEX.TS

### **🌐 serve() - Point d'entrée**
```typescript
serve(async (req) => {
  // Parse FormData Twilio
  // Route vers handleTextMessage ou handleAudioMessage
  // Retourne TwiML XML
})
```
**Rôle :** Point d'entrée principal, parse les données Twilio et route vers le bon handler.

---

### **📱 handleTextMessage() - Logique principale**
```typescript
async function handleTextMessage(from: string, body: string, latitude?: string, longitude?: string)
```
**Rôle :** Gère tous les messages texte et coordonnées GPS. États principaux :
- Initial → Choix véhicule
- Position reçue → Recherche destination  
- Prix calculé → Confirmation
- Confirmé → Réservation

**📊 Machine à états :**
```
initial → vehicule_choisi → position_recue → prix_calcule → confirme
```

---

### **🔍 searchAdresse() - Recherche intelligente**
```typescript
async function searchAdresse(searchTerm: string): Promise<any>
```
**Rôle :** Interface principale vers le service de recherche intelligent.

**🎯 Workflow :**
1. **Import dynamique** du service de recherche
2. **Appel searchLocation()** avec terme de recherche
3. **Logs détaillés** avec source et score
4. **Fallback SQL** en cas d'erreur du service intelligent

**📋 Logs générés :**
```typescript
📍 RECHERCHE INTELLIGENTE - Trouvé: [nom] (Source: [source]) [Score: [score]]
💾 RECHERCHE DATABASE - Stratégie: [stratégie]
🌐 RECHERCHE GOOGLE PLACES - API externe utilisée
🔄 FALLBACK SQL - Trouvé: [nom] (Source: database_sql_fallback)
```

---

### **🎯 getAvailableDrivers() - Sélection conducteurs**
```typescript
async function getAvailableDrivers(vehicleType: string, clientLat?: number, clientLon?: number)
```
**Rôle :** Recherche et sélection du conducteur le plus proche.

**🔧 Algorithme :**
1. **Requête base** : `conducteurs_with_coords` filtrée par type et statut
2. **Calcul distances** : Formule Haversine pour chaque conducteur
3. **Tri par proximité** : Sélection du plus proche
4. **Fallback** : Conducteurs en dur si base vide

---

### **💰 calculerPrixCourse() - Calcul tarifaire**
```typescript
async function calculerPrixCourse(vehicleType: string, distanceKm: number)
```
**Rôle :** Calcul du prix basé sur le type véhicule et distance.

**📊 Logique :**
- **RPC Supabase** : `calculer_prix_course` 
- **Fallback** : Tarif par défaut (3000 GNF/km moto, 4000 GNF/km voiture)
- **Arrondi** : Prix arrondi au millier supérieur

---

### **📍 getClientCoordinates() - Extraction GPS**
```typescript
async function getClientCoordinates(sessionPhone: string)
```
**Rôle :** Extrait les coordonnées GPS depuis la session utilisateur.

**🔧 Méthode :**
- **RPC PostGIS** : `extract_coordinates_from_session`
- **Conversion** : Point PostGIS → latitude/longitude décimales
- **Validation** : Vérification coordonnées valides

---

### **💾 saveSession() / getSession() - Gestion sessions**
```typescript
async function saveSession(phone: string, data: any)
async function getSession(phone: string)
```
**Rôle :** Persistance et récupération des sessions utilisateur.

**🛡️ Sécurité :**
- **UPSERT** : Évite les doublons avec gestion de conflits
- **Expiration** : Sessions expirées automatiquement (4h)
- **Tri** : Récupération de la session la plus récente

---

### **🏁 createReservation() - Finalisation**
```typescript
async function createReservation(session: any)
```
**Rôle :** Création de la réservation finale en base.

**📋 Données insérées :**
- Client, conducteur, véhicule, positions, prix, statut
- **Géolocalisation** : Points PostGIS pour positions
- **Statut initial** : `pending`

---

## 🔍 SERVICE DE RECHERCHE - SEARCH-SERVICE.TS

### **🎯 LocationSearchService - Classe principale**
```typescript
export class LocationSearchService {
  private config: SearchConfig;
  private supabase: any;
  private searchLog: string[] = [];
}
```
**Rôle :** Service central de recherche avec logs et configuration.

---

### **🚀 searchLocationGeneric() - Moteur de recherche**
```typescript
async searchLocationGeneric(query: string, options: SearchOptions = {})
```
**Rôle :** Moteur principal avec stratégies multiples.

**📊 Stratégies (dans l'ordre) :**
1. **🎯 Recherche exacte** : Correspondance parfaite `nom_normalise`
2. **🔄 Permutations** : "Madina Marché" → "Marché Madina"  
3. **🔤 Fuzzy matching** : Gestion fautes de frappe avec `pg_trgm`
4. **📝 Recherche partielle** : Mots individuels avec scoring
5. **🌐 Google Places** : Fallback API externe si configuré

**🏆 Scoring :**
- Exacte : 100-90
- Permutation : 90-80  
- Fuzzy : 80-70
- Partielle : 70-60
- Google Places : 60-50

---

### **🎯 searchExact() - Correspondance parfaite**
```typescript
private async searchExact(query: string): Promise<SearchResult[]>
```
**Rôle :** Recherche exacte sur `nom_normalise` avec `eq.`

---

### **🔄 searchWithPermutations() - Permutations de mots**
```typescript
private async searchWithPermutations(words: string[], originalQuery: string)
```
**Rôle :** Génère toutes les permutations possibles des mots (max 4 mots).

**🎯 Exemples :**
- "Hôpital Donka" → ["Hôpital Donka", "Donka Hôpital"]
- "Marché Central Madina" → 6 permutations testées

---

### **🔤 searchFuzzy() - Correspondance approximative**
```typescript
private async searchFuzzy(query: string, words: string[])
```
**Rôle :** Utilise `similarity()` PostgreSQL pour gérer les fautes de frappe.

**⚙️ Configuration :**
- **Seuil** : 0.3 (30% de similarité minimum)
- **Extension** : `pg_trgm` requise
- **Performance** : Index GIN sur `nom_normalise`

---

### **📝 searchPartial() - Recherche par mots**
```typescript
private async searchPartial(words: string[]): Promise<SearchResult[]>
```
**Rôle :** Recherche chaque mot individuellement, combine les résultats.

**🧮 Algorithme :**
- Chaque mot → recherche `ilike %mot%`
- **Scoring** : Nombre de mots matchés
- **Seuil** : Minimum 60% des mots doivent matcher

---

### **🌐 searchInGooglePlaces() - API externe**
```typescript
async searchInGooglePlaces(query: string, options: SearchOptions = {})
```
**Rôle :** Fallback vers Google Places API si aucun résultat en base.

**🔧 Configuration :**
- **Clé API** : `GOOGLE_PLACES_API_KEY` dans secrets Supabase
- **Format retour** : Unifié avec résultats database
- **ID** : `null` (pas d'UUID pour Google Places)

---

### **🛠️ searchLocation() - Interface simplifiée**
```typescript
export async function searchLocation(query: string, supabaseUrl?: string, supabaseKey?: string)
```
**Rôle :** Interface simplifiée pour le bot, retourne 1 résultat au format attendu.

**📤 Format retour :**
```typescript
{
  id: string | null,
  nom: string,
  adresse_complete: string,
  latitude: number,
  longitude: number,
  source: string,    // NEW: Source de la recherche
  score: number      // NEW: Score de pertinence
}
```

---

## 📊 TYPES DE SOURCES DE RECHERCHE

| Source | Description | Score | Utilisation |
|--------|-------------|-------|-------------|
| `database_exact` | Correspondance parfaite | 100-90 | Noms exacts |
| `database_permutation` | Mots réordonnés | 90-80 | "Marché Madina" ↔ "Madina Marché" |
| `database_fuzzy` | Fautes de frappe | 80-70 | "donka" → "Donka" |
| `database_partial` | Mots partiels | 70-60 | "hôpital" → "Hôpital Ignace Deen" |
| `google_places` | API externe | 60-50 | Fallback si base vide |
| `database_sql_fallback` | Ancien système | 50-40 | Sécurité en cas d'erreur service |

---

## ⚙️ CONFIGURATION

### **🔑 Variables d'environnement**
```typescript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')  
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
```

### **🎛️ Configuration service de recherche**
```typescript
const DEFAULT_CONFIG = {
  primarySource: 'database',
  fuzzyThreshold: 0.3,
  maxSuggestions: 10
}
```

---

## 🔄 FLUX COMPLET D'UNE RECHERCHE

```mermaid
graph TD
    A[Client tape "hôpital donka"] --> B[searchAdresse()]
    B --> C[Import search-service.ts]
    C --> D[searchLocation()]
    D --> E[searchLocationGeneric()]
    E --> F{Recherche exacte}
    F -->|Trouvé| Z[Retour résultat + logs]
    F -->|Non trouvé| G{Permutations}
    G -->|Trouvé| Z
    G -->|Non trouvé| H{Fuzzy matching}
    H -->|Trouvé| Z  
    H -->|Non trouvé| I{Recherche partielle}
    I -->|Trouvé| Z
    I -->|Non trouvé| J{Google Places activé?}
    J -->|Oui| K[API Google Places]
    J -->|Non| L[Fallback SQL]
    K --> Z
    L --> Z
```

---

## 📋 LOGS DE DÉBOGAGE

### **🎯 Logs de recherche détaillés**
```
[09:40:57] 🔍 === RECHERCHE GÉNÉRIQUE DÉMARRÉE ===
[09:40:57] 📝 Requête: "hôpital donka"
[09:40:57] 1️⃣ Tentative recherche EXACTE...
[09:40:57] 2️⃣ Tentative PERMUTATION des mots...
[09:40:57] 🔄 Test permutation: "donka hôpital"
[09:40:57] ✅ 1 résultats par permutation
[09:40:57] 3️⃣ Tentative recherche FUZZY...
[09:40:57] ✅ 2 résultats fuzzy trouvés
[09:40:57] 📊 Total après déduplication: 3 résultats uniques
[09:40:57] ✅ 3 résultats trouvés en base en 234ms
[09:40:57] 📊 Sources: database_permutation(1), database_fuzzy(2)
```

### **🎯 Logs spécifiques par source**
```
📍 RECHERCHE INTELLIGENTE - Trouvé: Hôpital Donka (Source: database_exact) [Score: 100]
💾 RECHERCHE DATABASE - Stratégie: exact

📍 RECHERCHE INTELLIGENTE - Trouvé: Restaurant Chinois (Source: google_places) [Score: 60]  
🌐 RECHERCHE GOOGLE PLACES - API externe utilisée

🔄 FALLBACK SQL - Trouvé: Marché Central (Source: database_sql_fallback)
```

---

## 🚀 AVANTAGES DU BOT V2

### **🎯 Précision améliorée**
- **Fuzzy matching** : Gère les fautes de frappe
- **Permutations** : Ordre des mots flexible
- **Multiple stratégies** : 6 méthodes de recherche
- **Scoring intelligent** : Résultats classés par pertinence

### **🛡️ Robustesse**  
- **Double fallback** : Service intelligent → SQL standard
- **API externe** : Google Places si base vide
- **Gestion d'erreurs** : Retry automatique et logs détaillés
- **Sessions persistantes** : Anti-perte de données

### **📊 Observabilité**
- **Logs détaillés** : Source, score et stratégie pour chaque recherche  
- **Métriques** : Temps de réponse et taux de succès
- **Traçabilité** : Historique complet des requêtes
- **Débogage** : Logs structurés pour diagnostic rapide

### **⚡ Performance**
- **Cache intelligent** : Résultats fréquents en mémoire
- **Index optimisés** : GIN sur colonnes de recherche
- **Parallélisation** : Stratégies multiples en parallèle
- **Timeout gestion** : Évite les blocages

---

## 🔧 MAINTENANCE ET MONITORING

### **📈 Métriques à surveiller**
- **Taux de succès** par source de recherche
- **Temps de réponse** moyen par stratégie  
- **Volume** Google Places API (coûts)
- **Erreurs** et fallbacks déclenchés

### **🛠️ Opérations courantes**
- **Backup** : Format `index_backup_V2_DD-MM-YYYY-HHh-MMmins.ts`
- **Déploiement** : `supabase functions deploy whatsapp-bot-v2`
- **Logs** : Dashboard Supabase Edge Functions
- **Tests** : Script SQL de validation recherches

### **🔄 Évolutions possibles**
- **Machine Learning** : Amélioration scoring fuzzy
- **Cache Redis** : Cache distribué pour haute charge
- **Multi-langues** : Support Pular, Soussou, Maninka
- **APIs additionnelles** : OpenStreetMap, HERE Maps

---

## 📝 Notes importantes

1. **🔐 Sécurité** : Jamais d'UUID générés pour Google Places (utiliser `null`)
2. **⚡ Performance** : Extensions PostgreSQL `pg_trgm` et `fuzzystrmatch` requises
3. **💰 Coûts** : Google Places facturé par requête - utiliser en fallback seulement
4. **🔄 Fallback** : Toujours maintenir compatibilité avec ancien système SQL
5. **📊 Logs** : Niveau de détail configurable (`minimal`, `detailed`, `debug`)

---

**✅ Bot V2 100% opérationnel avec recherche intelligente multicouche et logs détaillés !**