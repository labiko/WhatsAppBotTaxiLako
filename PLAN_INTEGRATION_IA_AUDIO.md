# 🎤 PLAN D'INTÉGRATION IA AUDIO POUR RÉSERVATION TAXI

## 🎯 Objectif
Ajouter la fonctionnalité de réservation via audio + IA tout en **préservant intégralement** le système texte existant.

---

## 🏗️ Architecture Proposée

### **1. Séparation Modulaire**
```
whatsapp-bot/index.ts
├── 📱 handleTextMessage() [EXISTANT - Inchangé]
├── 🎤 handleAudioMessage() [NOUVEAU]
├── 🧠 processWithAI() [NOUVEAU]
└── 🔄 commonWorkflow() [REFACTORISÉ]
```

### **2. Point d'Entrée Principal**
```typescript
// Dans la fonction principale
if (body && body.trim()) {
    // 📱 SYSTÈME TEXTE (existant)
    await handleTextMessage(from, body, ...);
} else if (mediaUrl0) {
    // 🎤 SYSTÈME AUDIO (nouveau)
    await handleAudioMessage(from, mediaUrl0, ...);
}
```

---

## 🔄 Workflow Audio Proposé

### **Étape 1 : Réception Audio**
```
Client envoie audio: "je veux aller à Kipe Centre Émetteur"
    ↓
Bot détecte MediaUrl0
    ↓
Téléchargement du fichier audio via Twilio
```

### **Étape 2 : Transcription**
```
Audio → API Transcription (Whisper/Azure Speech)
    ↓
Résultat: "je veux aller à Kipe Centre Émetteur"
```

### **Étape 3 : Analyse IA**
```
Texte transcrit → OpenAI/Claude API
    ↓
Prompt: "Extraire: destination, type véhicule (moto/voiture)"
    ↓
Résultat JSON: {
    "destination": "Kipe Centre Émetteur",
    "vehicle_type": "auto_detect",
    "intent": "reservation"
}
```

### **Étape 4 : Workflow Unifié**
```
Données IA → commonWorkflow()
    ↓
Même logique que système texte:
- Demander position GPS
- Calculer prix/distance  
- Demander confirmation "oui"
- Assigner conducteur
```

---

## 🗂️ Structure de Code Proposée

### **1. Nouvelles Fonctions (index.ts)**
```typescript
// 🎤 GESTION AUDIO
async function handleAudioMessage(from, mediaUrl, ...)
async function downloadAudioFromTwilio(mediaUrl)
async function transcribeAudio(audioBuffer)
async function processWithAI(transcriptText)

// 🧠 IA ET ANALYSE
async function extractReservationFromText(text)
async function detectVehicleType(destination, preferences)

// 🔄 WORKFLOW UNIFIÉ  
async function commonWorkflow(from, reservationData, source)
```

### **2. Configuration IA**
```typescript
// Nouvelles variables d'environnement
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const WHISPER_API_URL = process.env.WHISPER_API_URL
const AI_ENABLED = process.env.AI_AUDIO_ENABLED === 'true'
```

---

## 🔧 APIs Externes Nécessaires

### **1. Transcription Audio**
- **Option A :** OpenAI Whisper API
- **Option B :** Azure Speech-to-Text  
- **Option C :** Google Speech-to-Text

### **2. Analyse IA**
- **Option A :** OpenAI GPT-4 (recommandé)
- **Option B :** Anthropic Claude
- **Option C :** Azure OpenAI

---

## 🛠️ Refactorisation Minimale

### **Code Existant à Extraire**
```typescript
// Extraire ces parties en fonctions communes:
- Gestion sessions (saveSession, getSession)
- Calcul prix/distance  
- Assignation conducteur
- Envoi messages de confirmation
- Workflow "oui" → réservation
```

### **Nouveaux Types de Sessions**
```typescript
interface AudioSession extends Session {
    transcript?: string
    aiAnalysis?: AIAnalysis
    source: 'text' | 'audio'
}

interface AIAnalysis {
    destination: string
    vehicle_type: 'moto' | 'voiture' | 'auto_detect'
    confidence: number
    raw_transcript: string
}
```

---

## 🧪 Plan de Test

### **Phase 1 : Transcription**
```
1. Audio simple: "taxi"
2. Audio destination: "je veux aller à Madina"  
3. Audio complet: "je veux une moto pour aller à Kipe"
```

### **Phase 2 : IA**
```
1. Extraction destination
2. Détection type véhicule
3. Gestion ambiguïtés
```

### **Phase 3 : Workflow**
```
1. Audio → GPS → Prix → Confirmation
2. Annulation audio
3. Erreurs de transcription
```

---

## 🚀 Avantages de cette Architecture

### **✅ Séparation Claire**
- Système texte intact
- Système audio indépendant
- Activation/désactivation facile

### **✅ Maintenance Simple**
- `AI_AUDIO_ENABLED=false` → Retour système texte seul
- Debugging séparé
- Tests unitaires par module

### **✅ Évolutivité**
- Ajout langues (français, soussou, peul)
- Amélioration IA sans impact texte
- Metrics séparées

---

## 🎛️ Configuration de Déploiement

### **Variables d'Environnement**
```bash
# IA AUDIO (nouvelles)
AI_AUDIO_ENABLED=true
OPENAI_API_KEY=sk-...
WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions

# EXISTANTES (inchangées)  
SUPABASE_URL=https://...
TWILIO_ACCOUNT_SID=AC...
```

### **Toggle de Fonctionnalité**
```typescript
// Désactiver temporairement l'IA
if (!AI_ENABLED) {
    return sendMessage(from, "Fonctionnalité audio temporairement indisponible. Écrivez 'taxi' pour réserver.");
}
```

---

## 💰 Estimation Coûts

### **OpenAI Pricing**
- **Whisper :** $0.006/minute d'audio
- **GPT-4 :** ~$0.01 par analyse (50 tokens)
- **Estimation :** ~$0.02 par réservation audio

---

## 📋 Étapes d'Implémentation

### **Phase 1 : Préparation (1-2 jours)**
1. **Refactorisation du code existant**
   - Extraire `commonWorkflow()` du code texte actuel
   - Créer les interfaces TypeScript
   - Ajouter variables d'environnement

2. **Configuration APIs**
   - Créer compte OpenAI (si pas déjà fait)
   - Obtenir clés API Whisper + GPT-4
   - Configurer variables d'environnement Edge Function

### **Phase 2 : Développement Audio (3-4 jours)**
1. **Gestion des médias Twilio**
   - Fonction `downloadAudioFromTwilio()`
   - Gestion des formats audio (OGG, MP3, WAV)
   - Validation taille/durée fichiers

2. **Intégration Whisper**
   - Fonction `transcribeAudio()`
   - Gestion erreurs de transcription
   - Support multilingue (français priority)

### **Phase 3 : Intelligence Artificielle (2-3 jours)**
1. **Analyse sémantique**
   - Fonction `extractReservationFromText()`
   - Prompts optimisés pour destinations guinéennes
   - Détection automatique type véhicule

2. **Gestion des ambiguïtés**
   - Questions de clarification automatiques
   - Fallback vers système texte si IA échoue

### **Phase 4 : Intégration & Tests (2-3 jours)**
1. **Point d'entrée principal**
   - Détection automatique audio vs texte
   - Fonction `handleAudioMessage()`
   - Toggle activation/désactivation

2. **Tests complets**
   - Audios en français guinéen
   - Destinations courantes Conakry
   - Gestion des erreurs et timeouts

### **Phase 5 : Déploiement & Monitoring (1 jour)**
1. **Déploiement progressif**
   - Activation avec `AI_AUDIO_ENABLED=true`
   - Monitoring coûts API
   - Logs détaillés pour debugging

---

## 🎯 Livrables Attendus

### **Code**
- `supabase/functions/whatsapp-bot/index.ts` (mis à jour)
- Nouvelles fonctions audio + IA
- Types TypeScript pour sessions audio

### **Configuration**
- Variables d'environnement Supabase
- Documentation API keys
- Instructions déploiement

### **Tests**
- Suite de tests audios
- Validation destinations courantes
- Tests de fallback et erreurs

---

## 🚦 Prochaine Étape Immédiate

**Voulez-vous commencer par la Phase 1 (Refactorisation) ?**
- Extraire le workflow commun du code existant
- Créer la structure modulaire
- Préparer l'architecture pour l'audio

---

**💡 Ce plan permet d'ajouter l'IA audio sans risquer de casser le système texte existant !**

**Statut :** 📋 PLANIFIÉ - Prêt pour implémentation
**Durée estimée :** 8-12 jours de développement
**Coût API :** ~$0.02 par réservation audio