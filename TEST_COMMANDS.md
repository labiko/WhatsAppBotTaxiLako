# 🧪 COMMANDES DE TEST INDIVIDUELLES

## 🎯 Comment tester chaque fonction

### 1. **Test searchInDatabaseSmart**
```typescript
import { testSearchInDatabaseSmart } from './test_functions_individual.ts';

// Test avec "mardina marché" (votre cas principal)
await testSearchInDatabaseSmart('mardina marché', 5, 'debug');

// Test avec d'autres requêtes
await testSearchInDatabaseSmart('2LK Restaurant', 3, 'detailed');
await testSearchInDatabaseSmart('hopital ignace', 5, 'debug');
await testSearchInDatabaseSmart('Marché Madina', 1, 'minimal');
```

### 2. **Test searchInGooglePlaces**
```typescript
import { testSearchInGooglePlaces } from './test_functions_individual.ts';

// Test avec Google Places API
await testSearchInGooglePlaces('restaurant conakry', 5);
await testSearchInGooglePlaces('hôpital guinée', 3);
```

### 3. **Test searchLocationGeneric (fonction principale)**
```typescript
import { testSearchLocationGeneric } from './test_functions_individual.ts';

// Test complet avec toutes les stratégies
await testSearchLocationGeneric('mardina marché', 8, 'debug');
await testSearchLocationGeneric('2LK restoran', 5, 'detailed');
```

### 4. **Test searchLocation (format bot)**
```typescript
import { testSearchLocation } from './test_functions_individual.ts';

// Format exactement comme dans le bot actuel
await testSearchLocation('Marché Madina');
await testSearchLocation('2LK Restaurant');
```

### 5. **Test suggestions multiples**
```typescript
import { testSearchLocationWithSuggestions } from './test_functions_individual.ts';

// Obtenir plusieurs suggestions
await testSearchLocationWithSuggestions('restaurant', 10);
await testSearchLocationWithSuggestions('marché', 5);
```

### 6. **Test fonctions utilitaires**
```typescript
import { testNormalizeText, testGeneratePermutations } from './test_functions_individual.ts';

// Test normalisation
testNormalizeText('Café-Restaurant "Le Bon Côté"');
testNormalizeText('MARCHÉ    MADINA!!!');

// Test permutations
testGeneratePermutations(['marché', 'madina']);
testGeneratePermutations(['hôpital', 'ignace', 'deen']);
```

## 🚀 Exécution rapide

### Méthode 1: Script tout prêt
```bash
deno run --allow-net --allow-env quick_test.ts
```

### Méthode 2: Test individuel
```typescript
// Dans un fichier .ts
import { testSearchInDatabaseSmart } from './test_functions_individual.ts';

// Testez ce que vous voulez
await testSearchInDatabaseSmart('VOTRE_REQUETE_ICI', 5, 'debug');
```

### Méthode 3: Console interactive
```typescript
// Démarrer console Deno
// deno repl --allow-net --allow-env

// Importer
import { testSearchInDatabaseSmart } from './test_functions_individual.ts';

// Tester directement
await testSearchInDatabaseSmart('mardina marché');
```

## 📊 Exemples de tests spécifiques

### ✅ Cas de succès attendus
```typescript
// Exact match
await testSearchInDatabaseSmart('Marché Madina');

// Permutation
await testSearchInDatabaseSmart('madina marché');

// Faute de frappe
await testSearchInDatabaseSmart('mardina marché');

// Partiel
await testSearchInDatabaseSmart('hopital ignace');
```

### 🧪 Cas de tests avancés
```typescript
// Test avec caractères spéciaux
await testSearchInDatabaseSmart('2LK Restaurant-Lounge');

// Test avec accents
await testSearchInDatabaseSmart('hôpital ignacé dééen');

// Test limite
await testSearchInDatabaseSmart('xyz123impossible', 1, 'debug');
```

## ⚙️ Paramètres configurables

### searchInDatabaseSmart
- **query**: Votre texte de recherche
- **maxResults**: Nombre max de résultats (défaut: 5)
- **logLevel**: 'minimal' | 'detailed' | 'debug' (défaut: 'detailed')

### searchInGooglePlaces
- **query**: Votre texte de recherche
- **maxResults**: Nombre max de résultats (défaut: 5)

### testNormalizeText
- **text**: Texte à normaliser

### testGeneratePermutations
- **words**: Array de mots ['mot1', 'mot2', 'mot3']

## 🎯 Test de votre cas spécifique

Pour tester "mardina marché" → "Marché Madina" :

```typescript
// Test complet avec logs détaillés
await testSearchInDatabaseSmart('mardina marché', 10, 'debug');

// Vérifier si "Marché Madina" est trouvé
// Les logs vous montreront la stratégie utilisée
```

---

**💡 Conseil**: Commencez par `testSearchInDatabaseSmart('mardina marché', 5, 'debug')` pour voir tous les détails !