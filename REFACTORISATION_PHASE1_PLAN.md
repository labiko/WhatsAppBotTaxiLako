# 🔧 REFACTORISATION PHASE 1 - PLAN DÉTAILLÉ

## 🎯 Objectif
Préparer l'architecture modulaire pour l'intégration IA Audio sans impacter le système texte existant.

## 📋 ÉTAPES À RÉALISER

### **Étape 1.1 : Extraction du Workflow Commun**

#### **A. Créer `commonWorkflow()` - Logique partagée**
```typescript
// Nouvelle fonction commune (à extraire du code existant)
async function commonWorkflow(from: string, workflowData: WorkflowData, source: 'text' | 'audio') {
  // Logique commune pour :
  // - Recherche adresse destination
  // - Calcul distance + prix
  // - Demande confirmation
  // - Recherche conducteur
  // - Sauvegarde réservation
  // - Envoi messages de confirmation
}
```

#### **B. Interface pour données workflow**
```typescript
interface WorkflowData {
  vehicleType: 'moto' | 'voiture'
  destination?: string
  clientPosition?: { lat: number, lon: number }
  confirmed?: boolean
  source: 'text' | 'audio'
  // Données IA (pour audio)
  transcript?: string
  aiAnalysis?: AIAnalysis
}

interface AIAnalysis {
  destination: string
  vehicle_type: 'moto' | 'voiture' | 'auto_detect'
  confidence: number
  raw_transcript: string
}
```

### **Étape 1.2 : Modularisation des Handlers**

#### **A. Créer `handleTextMessage()`**
```typescript
// Encapsuler toute la logique texte existante
async function handleTextMessage(from: string, body: string, latitude?: string, longitude?: string) {
  // Tout le code existant du serve() va ici
  // Utilise commonWorkflow() pour les étapes partagées
}
```

#### **B. Préparer `handleAudioMessage()` (skeleton)**
```typescript
// Structure préparée pour l'IA audio (Phase 2)
async function handleAudioMessage(from: string, mediaUrl: string) {
  // Phase 2: Téléchargement audio
  // Phase 2: Transcription Whisper
  // Phase 2: Analyse IA
  // Utilise commonWorkflow() avec les données IA
  
  // Pour l'instant: fallback vers texte
  return await handleTextMessage(from, "Fonctionnalité audio bientôt disponible. Écrivez 'taxi'");
}
```

### **Étape 1.3 : Point d'Entrée Principal**

#### **A. Nouveau serve() modulaire**
```typescript
serve(async (req) => {
  // ... code CORS et parsing existant ...
  
  // POINT D'ENTRÉE MODULAIRE
  if (body && body.trim()) {
    // 📱 SYSTÈME TEXTE (existant - inchangé)
    return await handleTextMessage(from, body, latitude, longitude);
  } else if (mediaUrl0) {
    // 🎤 SYSTÈME AUDIO (nouveau - Phase 2)
    return await handleAudioMessage(from, mediaUrl0);
  }
  
  // Default
  return await handleTextMessage(from, "");
});
```

## 🔧 CONFIGURATION PRÉPARATOIRE

### **Variables d'environnement à ajouter**
```typescript
// Nouvelles constantes (préparation Phase 2)
const AI_AUDIO_ENABLED = Deno.env.get('AI_AUDIO_ENABLED') === 'true';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const WHISPER_API_URL = Deno.env.get('WHISPER_API_URL') || 'https://api.openai.com/v1/audio/transcriptions';
```

## 📂 FICHIERS À MODIFIER

### **1. `index.ts` - Refactorisation complète**
- ✅ Ajouter interfaces TypeScript
- ✅ Extraire `commonWorkflow()`
- ✅ Créer `handleTextMessage()`
- ✅ Préparer `handleAudioMessage()` (skeleton)
- ✅ Modifier `serve()` avec point d'entrée modulaire

### **2. Configuration Edge Function**
- ✅ Ajouter variables d'environnement IA (préparation)
- ✅ Documentation nouvelle architecture

## 🧪 TESTS PHASE 1

### **Validation fonctionnement texte**
1. **Test existant :** `taxi` → `moto` → GPS → destination → `oui`
2. **Test annulation :** `annuler` en cours de réservation
3. **Test conducteur :** Assignation et messages

### **Vérification audio (fallback)**
1. **Test MediaUrl :** Envoi audio → message fallback
2. **Test toggle :** `AI_AUDIO_ENABLED=false` → pas d'impact

## ✅ CRITÈRES DE SUCCÈS PHASE 1

- ✅ **Système texte inchangé** : Toutes les fonctionnalités texte marchent
- ✅ **Architecture modulaire** : Code séparé en fonctions claires
- ✅ **Point d'entrée préparé** : Détection audio vs texte
- ✅ **Zéro régression** : Aucun bug introduit
- ✅ **Documentation** : Code commenté et interfaces définies

## 🎯 LIVRABLE PHASE 1

**Fichier :** `index.ts` refactorisé (même fonctionnalités, code réorganisé)

**Prêt pour Phase 2 :** Structure modulaire permettant l'ajout facile de l'IA audio

---

**⏱️ Durée estimée :** 1-2 jours
**🎯 Statut :** Prêt à commencer