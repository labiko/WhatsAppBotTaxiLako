# 🚀 PLAN ÉVOLUTION IA INTELLIGENTE - BOT LOKOTAXI

## 🎯 OBJECTIF
Améliorer le bot pour comprendre les demandes complexes en **FRANÇAIS UNIQUEMENT** tout en **préservant 100% du workflow existant**.

## 🌍 LANGUE SUPPORTÉE
**⚠️ IMPORTANT : Le bot gère UNIQUEMENT le FRANÇAIS**
- ✅ Français standard
- ✅ Français avec fautes d'orthographe  
- ✅ Français SMS/abrégé (ex: "g veu 1 taxi")
- ❌ PAS d'anglais
- ❌ PAS d'autres langues (sauf Audio Pular déjà géré séparément)

## 📊 ANALYSE DES CAS COMPLEXES ACTUELS

### ✅ CAS DÉJÀ GÉRÉS PAR LE BOT
1. **Réservation simple** : "taxi" → moto/voiture → GPS → destination
2. **Réservation planifiée** : Date + heure spécifiques  
3. **Annulation** : "annuler"
4. **Notation** : Système de feedback conducteur
5. **Audio Pular** : Transcription et analyse IA

### ❌ CAS NON GÉRÉS (À IMPLÉMENTER)

#### 🔴 PRIORITÉ HAUTE
1. **Demande complète en une phrase**
   - "Je veux aller au marché Madina"
   - "Taxi pour l'aéroport demain à 17h"
   - "Moto-taxi de Kipé vers Taouyah maintenant"

2. **Destination sans type véhicule**
   - "Je vais à l'hôpital Donka"
   - "Direction la gare routière"

3. **Temps relatifs**
   - "Dans 30 minutes"
   - "Ce soir à 20h"
   - "Demain matin"

#### 🟡 PRIORITÉ MOYENNE
4. **Multi-destinations**
   - "D'abord pharmacie puis maison"
   - "Arrêt à la banque avant l'aéroport"

#### ❌ NON GÉRÉS (HORS SCOPE V1)
5. ~~**Préférences conducteur**~~ → Utilisateur doit annuler et recommencer
6. ~~**Questions sur le service**~~ → Utilisateur doit faire une vraie réservation
7. ~~**Modifications en cours**~~ → Utilisateur doit annuler et recommencer  
8. ~~**Réservations récurrentes**~~ → Utilisateur doit refaire à chaque fois

**⚠️ RÈGLE SIMPLIFIÉE : Pour toute modification, l'utilisateur doit ANNULER puis RECOMMENCER**

## 🏗️ ARCHITECTURE TECHNIQUE SANS RÉGRESSION

### 📐 PRINCIPE FONDAMENTAL
**NE JAMAIS CASSER L'EXISTANT** - Ajouter une couche intelligente en amont qui :
1. Analyse le message
2. Extrait les informations
3. Injecte dans le workflow existant
4. Fallback automatique si échec

### 🔧 IMPLÉMENTATION MODULAIRE

```typescript
// POINT D'ENTRÉE UNIQUE - Analyse IA avant workflow standard
async function processMessage(from: string, body: string, session: Session) {
  
  // 1️⃣ TENTATIVE IA POUR MESSAGES COMPLEXES
  if (isComplexMessage(body)) {
    const iaResult = await analyzeWithAI(body, session);
    
    if (iaResult.success) {
      // Injection dans workflow existant
      return await injectIntoStandardWorkflow(iaResult, from, session);
    }
  }
  
  // 2️⃣ FALLBACK - Workflow classique inchangé
  return await standardWorkflow(from, body, session);
}
```

### 🧠 MODULE IA INTELLIGENT

```typescript
interface AIAnalysis {
  // Extraction standardisée
  vehicleType?: 'moto' | 'voiture' | null;
  destination?: string;
  departure?: string;
  temporal?: {
    isPlanned: boolean;
    date?: string;      // "2025-08-17"
    time?: string;      // "17:00"
    relative?: string;  // "dans 30 minutes"
  };
  action?: 'new_booking' | 'modification' | 'question' | 'cancellation';
  confidence: number;    // 0.0 à 1.0
}
```

### 🔄 SYSTÈME D'INJECTION INTELLIGENT

```typescript
async function injectIntoStandardWorkflow(
  iaResult: AIAnalysis, 
  from: string, 
  session: Session
) {
  // STRATÉGIE : Simuler les étapes du workflow classique
  
  // 1. Si type véhicule détecté → Passer directement à l'étape suivante
  if (iaResult.vehicleType) {
    session.vehicleType = iaResult.vehicleType;
    session.etat = 'vehicule_choisi';
  }
  
  // 2. Si destination détectée → Rechercher et proposer
  if (iaResult.destination) {
    const results = await searchLocation(iaResult.destination);
    // Utiliser la même logique que le workflow standard
  }
  
  // 3. Si temporel → Activer mode planifié
  if (iaResult.temporal?.isPlanned) {
    session.temporalPlanning = true;
    session.plannedDate = iaResult.temporal.date;
    // Etc...
  }
  
  // Retourner au workflow standard à la bonne étape
  return standardWorkflow(from, '', session);
}
```

## 📋 RÈGLES D'ANALYSE IA

### 🎯 DÉTECTION INTELLIGENTE

```typescript
const TRIGGERS = {
  // Destinations connues avec métadonnées
  destinations: [
    'marché', 'hôpital', 'aéroport', 'gare', 'université',
    'madina', 'kipé', 'taouyah', 'donka', 'ignace deen'
  ],
  
  // Indicateurs temporels
  temporal: {
    absolute: /\d{1,2}h|\d{1,2}:\d{2}/,
    relative: ['dans', 'demain', 'ce soir', 'maintenant'],
    days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
  },
  
  // Types véhicules
  vehicles: {
    moto: ['moto', 'moto-taxi', 'jakarta'],
    voiture: ['voiture', 'taxi', 'berline', 'auto']
  }
};

// Enrichissement dynamique via Google Places API
interface PlaceEnrichment {
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4 (gratuit à très cher)
  formatted_phone_number?: string;
  website?: string;
  types?: string[]; // ["restaurant", "hospital", "airport", etc.]
  business_status?: string;
  popular_times?: Array<{
    day: number;
    hours: Array<{
      hour: number;
      popularity: number; // 0-100
    }>;
  }>;
}

// Fonction d'enrichissement dynamique
async function enrichPlaceWithGoogleData(placeName: string, placeId?: string) {
  // 1. Place Details API pour infos complètes
  const details = await googlePlacesClient.placeDetails({
    place_id: placeId,
    fields: [
      'opening_hours',
      'rating',
      'formatted_phone_number',
      'price_level',
      'types',
      'website',
      'business_status',
      'user_ratings_total'
    ]
  });

  // 2. Formatage intelligent selon le type de lieu
  const placeType = detectPlaceType(details.types);
  const enrichedInfo = formatPlaceInfo(details, placeType);
  
  return enrichedInfo;
}

// Formatage selon type de lieu
function formatPlaceInfo(details: any, type: string) {
  const now = new Date();
  const currentHour = now.getHours();
  
  return {
    isOpen: details.opening_hours?.open_now,
    hours: formatHours(details.opening_hours),
    rating: details.rating ? `⭐ ${details.rating}/5 (${details.user_ratings_total} avis)` : null,
    phone: details.formatted_phone_number,
    priceLevel: formatPriceLevel(details.price_level),
    busyNow: calculateBusyLevel(details.popular_times, currentHour),
    bestTime: findBestVisitTime(details.popular_times),
    waitTime: estimateWaitTime(type, details.popular_times, currentHour)
  };
}
```

### 🤖 PROMPT GPT-4 OPTIMISÉ

```javascript
const SYSTEM_PROMPT = `
Tu es un assistant spécialisé dans l'analyse de demandes de taxi EN FRANÇAIS à Conakry, Guinée.
Extrais les informations suivantes d'un message client en FRANÇAIS, même avec des fautes d'orthographe.

RÈGLES IMPORTANTES:
1. LANGUE: Traiter UNIQUEMENT les messages en français
2. Si message en anglais ou autre langue → confidence: 0.0
3. Si le client dit "taxi" sans préciser → vehicleType: "voiture" (défaut en Guinée)
4. Temps relatifs: "dans 30 min" → calculer l'heure absolue
5. Lieux connus: utiliser les noms officiels (ex: "Ignace Deen" pour "ignace")
6. Confiance: 1.0 si très clair, 0.5 si ambigu, 0.0 si pas français

Réponds UNIQUEMENT en JSON valide.
`;
```

## 🚀 PHASES D'IMPLÉMENTATION

### PHASE 1 - FOUNDATION (2 jours)
- [ ] Module `text-intelligence.ts` amélioré
- [ ] Règles de détection complexes
- [ ] Tests unitaires complets

### PHASE 2 - INTÉGRATION (3 jours)
- [ ] Point d'injection unique dans workflow
- [ ] Système de fallback robuste
- [ ] Logs détaillés pour monitoring

### PHASE 3 - ENRICHISSEMENT (2 jours)
- [ ] Base de connaissances lieux Conakry
- [ ] Apprentissage des préférences utilisateurs
- [ ] Gestion multi-destinations

### PHASE 4 - TESTS (2 jours)
- [ ] Tests avec 50+ cas réels
- [ ] Validation workflow non impacté
- [ ] Ajustements prompts IA

### PHASE 5 - DÉPLOIEMENT (1 jour)
- [ ] Déploiement progressif
- [ ] Monitoring temps réel
- [ ] Documentation utilisateur

## 📊 MÉTRIQUES DE SUCCÈS

### KPIs À MESURER
- **Taux compréhension** : >95% messages complexes
- **Temps réponse** : <2 secondes avec IA
- **Taux fallback** : <5% vers workflow manuel
- **Satisfaction client** : Note >4.5/5

### MONITORING
```typescript
interface IAMetrics {
  totalRequests: number;
  successfulAnalysis: number;
  fallbackToManual: number;
  averageConfidence: number;
  averageResponseTime: number;
  topMissedPatterns: string[];
}
```

## 🛡️ GARANTIES ANTI-RÉGRESSION

### ✅ PRINCIPES STRICTS
1. **JAMAIS modifier** le workflow existant directement
2. **TOUJOURS tester** l'IA en parallèle d'abord
3. **FALLBACK automatique** si confidence < 0.7
4. **Logs séparés** IA vs workflow standard
5. **Toggle ON/OFF** pour désactiver l'IA si besoin

### 🔧 CONFIGURATION
```typescript
const AI_CONFIG = {
  enabled: true,              // Toggle global
  minConfidence: 0.7,         // Seuil fallback
  maxResponseTime: 2000,      // 2 secondes max
  enableLearning: false,      // Phase 2
  debugMode: true            // Logs détaillés
};
```

## 📈 ÉVOLUTIONS FUTURES

### V2 - APPRENTISSAGE
- Mémoriser préférences utilisateurs
- Suggestions proactives
- Routes favorites

### V3 - MULTIMODAL
- Photos de destination
- Commandes vocales directes
- Intégration cartes

### V4 - PRÉDICTIF
- Anticiper besoins récurrents
- Alertes trafic
- Prix dynamiques

## 🎯 EXEMPLES CONCRETS (100% FRANÇAIS)

### CAS 1 : Message complexe complet (FRANÇAIS)
**Input:** "Je veux une moto-taxi pour aller au marché Madina demain à 15h"

**Analyse IA:**
```json
{
  "vehicleType": "moto",
  "destination": "Marché Madina",
  "temporal": {
    "isPlanned": true,
    "date": "2025-08-17",
    "time": "15:00"
  },
  "action": "new_booking",
  "confidence": 0.95
}
```

**Injection workflow:** Skip étapes 1-2, aller direct à confirmation

### CAS 2 : Destination seule (FRANÇAIS)
**Input:** "Je vais à l'hôpital Donka"

**Analyse IA:**
```json
{
  "vehicleType": null,
  "destination": "Hôpital Donka",
  "temporal": {
    "isPlanned": false
  },
  "action": "new_booking",
  "confidence": 0.85
}
```

**Injection workflow:** Demander type véhicule puis continuer

### CAS 3 : Question prix (FRANÇAIS)
**Input:** "Combien pour aller à l'aéroport?"

**Analyse IA:**
```json
{
  "destination": "Aéroport International de Conakry",
  "action": "question",
  "confidence": 0.9
}
```

**Réponse directe:** "Prix estimé pour l'aéroport : Moto 25,000 GNF, Voiture 50,000 GNF"

### CAS 4 : Message en ANGLAIS (REJETÉ)
**Input:** "I want a taxi to the airport"

**Analyse IA:**
```json
{
  "error": "langue_non_supportee",
  "confidence": 0.0
}
```

**Réponse bot:** "Désolé, je comprends uniquement le français. Veuillez reformuler votre demande."

## ✅ CONCLUSION

Ce plan permet d'**augmenter drastiquement** les capacités du bot tout en **garantissant zéro régression**. L'approche modulaire permet un déploiement progressif et sécurisé.

**Prochaine étape :** Commencer par implémenter le module d'analyse IA (Phase 1)