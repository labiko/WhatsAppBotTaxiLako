# 🔍 SERVICE DE RECHERCHE INTELLIGENT - GUIDE D'UTILISATION

## 📋 Vue d'ensemble

Le nouveau service de recherche remplace l'ancienne fonction `searchAdresse()` par un système intelligent multi-sources avec logs enrichis et possibilité de tester chaque fonction individuellement.

## 📂 Fichiers créés

```
LokoTaxi/
├── search-service.ts                           # Service principal
├── search-service-test.ts                      # Tests unitaires
├── supabase/functions/whatsapp-bot/
│   ├── index.ts                                # Bot original (inchangé)
│   └── index_with_search_service.ts           # Bot modifié avec nouveau service
└── PLAN_ARCHITECTURE_RECHERCHE_ADDRESSE_DB_GOOGLE_PLACE.md
```

## 🧪 TESTS UNITAIRES - FONCTIONS INDIVIDUELLES

### 1. Test direct de searchInGooglePlaces

```typescript
import { testSearchInGooglePlacesDirectly } from './search-service-test.ts';

// Tester uniquement Google Places
await testSearchInGooglePlacesDirectly();
```

### 2. Test direct de searchInDatabaseSmart

```typescript
import { testSearchInDatabaseSmartDirectly } from './search-service-test.ts';

// Tester uniquement la base de données
await testSearchInDatabaseSmartDirectly();
```

### 3. Test des fonctions utilitaires

```typescript
import { testUtilityFunctions } from './search-service-test.ts';

// Tester normalizeText et generatePermutations
await testUtilityFunctions();
```

### 4. Appel direct des fonctions depuis le bot

```typescript
import { 
  searchInDatabaseSmart,
  searchInGooglePlaces,
  initializeSearchService 
} from '../../../search-service.ts';

// Initialiser une seule fois
initializeSearchService({
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseKey: 'xxx',
  logLevel: 'detailed'
});

// Appeler directement les fonctions
const dbResults = await searchInDatabaseSmart('marché madina');
const googleResults = await searchInGooglePlaces('restaurant conakry');
```

## 📊 LOGS ENRICHIS AVEC SOURCES

### Exemple de logs pour "mardina marché"

```
[10:23:45] 🔍 [NOUVEAU SERVICE] Recherche adresse: "mardina marché"
[10:23:45] 🔍 === RECHERCHE GÉNÉRIQUE DÉMARRÉE ===
[10:23:45] 📝 Requête: "mardina marché"
[10:23:45] 📝 Query normalisée: "mardina marche"
[10:23:45] 1️⃣ Tentative recherche EXACTE...
[10:23:45] 2️⃣ Tentative PERMUTATION des mots...
[10:23:45] 🔄 Test permutation: "marche mardina"
[10:23:46] ✅ 1 résultats par permutation
[10:23:46] 3️⃣ Tentative recherche FUZZY...
[10:23:46] ✅ 3 résultats fuzzy trouvés
[10:23:46] 📊 Total après déduplication: 4 résultats uniques
[10:23:46] ✅ 4 résultats trouvés en base en 234ms
[10:23:46] 📊 Sources: database_permutation(1), database_fuzzy(3)
[10:23:46] ✅ [NOUVEAU SERVICE] Adresse trouvée: "Marché Madina"
```

### Logs détaillés par source

| Source | Description | Exemple |
|--------|-------------|---------|
| `database_exact` | Correspondance exacte | "Marché Madina" → "Marché Madina" |
| `database_permutation` | Mots réordonnés | "Madina Marché" → "Marché Madina" |
| `database_fuzzy` | Fautes de frappe | "mardina" → "madina" |
| `database_partial` | Mots individuels | "hôpital ignace" → "Hôpital Ignace Deen" |
| `google_places` | API Google Places | Fallback si aucun résultat local |

## 🔄 INTÉGRATION DANS LE BOT

### Migration transparente

L'ancienne fonction `searchAdresse()` est remplacée automatiquement :

```typescript
// AVANT (ancienne fonction)
const adresse = await searchAdresse("2LK Restaurant");

// APRÈS (nouveau service - même interface)
const adresse = await searchAdresse("2LK Restaurant");
// → Utilise automatiquement le service intelligent
```

### Nouvelles fonctionnalités disponibles

```typescript
// Obtenir plusieurs suggestions
const suggestions = await searchAdresseWithSuggestions("restaurant", 5);
console.log(`${suggestions.length} suggestions trouvées`);

suggestions.forEach((s, i) => {
  console.log(`${i+1}. ${s.nom} (${s.source}, score: ${s.score})`);
});
```

## ⚙️ CONFIGURATION ET BASCULEMENT

### Pour utiliser Google Places en priorité

```typescript
// Dans l'initialisation du service
const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseKey: workingApiKey,
  googleApiKey: 'your-google-api-key',
  primarySource: 'google_places', // ← Changer ici
  logLevel: 'detailed'
};
```

### Pour désactiver Google Places

```typescript
const config = {
  // ... autres paramètres
  googleApiKey: undefined, // ← Pas de clé API
  primarySource: 'database'
};
```

## 🚀 DÉPLOIEMENT

### 1. Tester le nouveau service

```bash
# Exécuter les tests unitaires
deno run --allow-all search-service-test.ts

# Tester une fonction spécifique
import { testSearchInDatabaseSmartDirectly } from './search-service-test.ts';
await testSearchInDatabaseSmartDirectly();
```

### 2. Déployer le bot modifié

```bash
# Backup du bot actuel
cd supabase/functions/whatsapp-bot
cp index.ts index_backup_$(date +%d-%m-%Y-%Hh-%Mmin).ts

# Déployer la version avec le nouveau service
cp index_with_search_service.ts index.ts
supabase functions deploy whatsapp-bot
```

### 3. Rollback si nécessaire

```bash
# Revenir à l'ancienne version
cp index_backup_[timestamp].ts index.ts
supabase functions deploy whatsapp-bot
```

## 📈 AVANTAGES DU NOUVEAU SYSTÈME

### 1. Recherche plus intelligente
- ✅ Gestion des fautes de frappe : "mardina" → "madina"
- ✅ Ordre des mots flexible : "madina marché" = "marché madina"
- ✅ Recherche partielle : "hôpital ignace" → "Hôpital Ignace Deen"
- ✅ Suggestions multiples au lieu d'une seule réponse

### 2. Logs enrichis
- ✅ Source de chaque résultat tracée
- ✅ Stratégie utilisée documentée
- ✅ Temps de réponse mesuré
- ✅ Debugging facilité

### 3. Architecture extensible
- ✅ Ajout facile de nouvelles sources (OpenAI, etc.)
- ✅ Basculement simple via configuration
- ✅ Tests unitaires pour chaque fonction
- ✅ Zero breaking change pour le bot existant

### 4. Performance optimisée
- ✅ Recherche graduée (exact → fuzzy → API)
- ✅ Cache intelligent (à venir)
- ✅ Fallback automatique
- ✅ Économie d'API calls

## 🔧 EXEMPLES D'UTILISATION

### Test complet du workflow

```typescript
// 1. Initialiser
import { initializeSearchService, searchLocationGeneric } from './search-service.ts';

initializeSearchService({
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseKey: 'xxx',
  logLevel: 'debug'
});

// 2. Tester différents cas
const tests = [
  'Marché Madina',           // Exact
  'madina marché',           // Permutation
  'mardina marché',          // Fuzzy
  'hôpital ignace',          // Partiel
  '2LK Restaurant'           // Recherche réelle
];

for (const query of tests) {
  console.log(`\n🧪 Test: "${query}"`);
  const results = await searchLocationGeneric(query);
  console.log(`📊 ${results.length} résultat(s)`);
  
  results.forEach(r => {
    console.log(`  - ${r.name} (${r.source})`);
  });
}
```

## ⚠️ NOTES IMPORTANTES

1. **Respecte le workflow actuel** : Aucune modification des fonctions appelantes
2. **Logs compatibles** : Même format que l'ancien système + informations enrichies
3. **Fallback robuste** : Si erreur → ancienne logique de secours
4. **Tests indépendants** : Chaque fonction testable individuellement
5. **Configuration flexible** : Basculement sources sans redéploiement

---

*Le service est prêt à être déployé et testé ! 🚀*