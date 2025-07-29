# 🎤 LokoTaxi - Système Audio Intelligent avec Analyse Temporelle

## 🎯 **Vue d'Ensemble**

Extension audio pour LokoTaxi permettant aux utilisateurs de réserver via **messages vocaux WhatsApp** avec analyse temporelle IA avancée.

### ✨ **Fonctionnalités Audio Uniques**

- 🗣️ **Transcription Whisper** - Conversion audio → texte haute précision
- 🧠 **Analyse Temporelle IA** - Extraction destination + date/heure automatique  
- 📅 **Gestion Avancée Temps** - "Aujourd'hui", "demain", "dans 20 minutes"
- 🎯 **Suggestions Intelligentes** - Détection destinations ambiguës
- 🔄 **Pipeline Unifié** - Audio utilise la même logique que le texte

## 🏗️ **Architecture Audio**

```
🎤 AUDIO WHATSAPP
├── webhook-router (détection audio/texte)
├── audio-to-text (transcription + analyse IA)  
├── whatsapp-bot (logique existante inchangée)
└── Réponse utilisateur identique
```

## 📱 **Exemples d'Usage Audio**

### **Scénarios "Aujourd'hui"**
```
🎤 "Je veux aller à Madina à 14 heures"
🤖 "✅ Réservation Madina aujourd'hui 14h00
    💰 Prix: 12,000 GNF | ⏰ Départ dans 2h30  
    📍 Partagez votre position pour confirmer"

🎤 "Je veux aller au supermarché à 18 heures"  
🤖 "🛒 Quel supermarché souhaitez-vous ?
    1️⃣ Super U Kipé
    2️⃣ CityDia Madina
    3️⃣ Leader Price Taouyah
    ⏰ Départ prévu: aujourd'hui 18h00"
```

### **Scénarios "Urgence"**
```
🎤 "Je veux aller à l'hôpital maintenant"
🤖 "🚨 Quel hôpital ?
    1️⃣ Hôpital Ignace Deen (7 min)
    2️⃣ Hôpital Donka (12 min)
    3️⃣ Clinique Pasteur (5 min)
    ⚡ Départ immédiat après confirmation"
```

### **Scénarios "Demain"**
```
🎤 "Je veux aller à Kipé à 8 heures" (22h actuellement)
🤖 "✅ Réservation Kipé demain 08h00
    📅 Date: 28 juillet 2025
    ⏰ Rappel programmé: demain 07h30"

🎤 "Réserve-moi un taxi pour l'aéroport demain matin à 7h30"
🤖 "✈️ Réservation Aéroport demain 07h30
    💰 Prix: 25,000 GNF (trajet longue distance)
    ⏰ Conducteur confirmé: demain 07h00"
```

## 🚀 **Installation Rapide**

### **1. Prérequis**
```bash
# Installer dépendances
npm install -g supabase

# Variables d'environnement requises
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=sk-your-openai-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### **2. Déploiement Automatique**
```bash
# Script de déploiement complet
node scripts/deploy-audio-system.js

# Résultat : 3 Edge Functions déployées
# ✅ webhook-router (routage auto)
# ✅ audio-to-text (pipeline IA) 
# ✅ whatsapp-bot (existant, inchangé)
```

### **3. Configuration Twilio**
```
Webhook URL: https://your-project.supabase.co/functions/v1/webhook-router
Method: POST
Content-Type: application/x-www-form-urlencoded
```

## 🧠 **Pipeline Audio Technique**

### **Étape 1 : Détection Automatique**
```typescript
// webhook-router analyse le message
if (mediaUrl0) {
  // 🎤 AUDIO → audio-to-text function
} else {
  // 📝 TEXTE → whatsapp-bot function  
}
```

### **Étape 2 : Transcription Whisper**
```typescript
// audio-to-text télécharge + transcrit
const transcript = await openai.audio.transcriptions.create({
  file: audioBlob,
  model: "whisper-1", 
  language: "fr"
});
```

### **Étape 3 : Analyse Temporelle IA**
```typescript
// GPT-4 extrait destination + temporalité
const analysis = await analyzeTemporalIntent(transcript);
// Résultat : {
//   destination: "Madina",
//   date: "aujourd_hui",
//   time: "14:00", 
//   ambiguous_destination: false
// }
```

### **Étape 4 : Message Enrichi**
```typescript
// Formatage pour bot principal  
const enrichedMessage = `Madina à 14:00 [META:${JSON.stringify(analysis)}]`;

// Appel whatsapp-bot existant (INCHANGÉ)
const response = await fetch(WHATSAPP_BOT_URL, {
  method: 'POST',
  body: formDataWithText
});
```

## 📊 **Analyse Temporelle Avancée**

### **Règles Intelligentes**
- **Heure < heure actuelle** → Assumer "demain" automatiquement
- **"maintenant"** → Heure actuelle exacte
- **"dans X minutes"** → Calcul temps réel
- **"matin/soir"** → 08:00 / 19:00 par défaut

### **Détection Ambiguïtés**
```typescript
// Lieux précis → pas de suggestions
"Madina", "Kipé", "Kaloum", "aéroport" → ambiguous: false

// Catégories → suggestions nécessaires  
"hôpital", "supermarché", "restaurant" → ambiguous: true
```

## 🔧 **Structure Technique**

```
supabase/functions/
├── webhook-router/
│   ├── index.ts          # Routage automatique audio/texte
│   └── deno.json         # Config Deno
├── audio-to-text/
│   ├── index.ts          # Pipeline Whisper + IA temporelle
│   └── deno.json         # Config Deno
└── whatsapp-bot/
    ├── index.ts          # Bot principal (INCHANGÉ)
    └── deno.json         # Config existante

scripts/
├── deploy-audio-system.js        # Déploiement automatique
├── test-audio-temporal-scenarios.js # Tests scénarios
└── scripts/

docs/
├── CONFIGURATION_WEBHOOK_TWILIO.md # Guide configuration
└── README_AUDIO_SYSTEM.md         # Ce fichier
```

## 🧪 **Tests & Validation**

### **Tests Automatisés**
```bash
# Test scénarios temporels (10 cas)
node scripts/test-audio-temporal-scenarios.js

# Résultat attendu : 10/10 tests réussis
# ✅ Scénarios "aujourd'hui" (5 tests)
# ✅ Scénarios "demain" (5 tests)
```

### **Tests Production**
```bash
# Test connectivité
curl https://your-project.supabase.co/functions/v1/webhook-router/health

# Test routage texte
curl -X POST https://your-project.supabase.co/functions/v1/webhook-router \
  -d "From=whatsapp:+224622000111&Body=taxi"

# Test simulation audio
curl -X POST https://your-project.supabase.co/functions/v1/webhook-router \
  -d "From=whatsapp:+224622000111&MediaUrl0=https://example.com/audio.ogg"
```

## 💰 **Coûts & Performance**

### **Coûts OpenAI**
```
- Whisper Transcription: $0.006 per minute
- GPT-4 Analyse Temporelle: $0.03 per request
- Total par message audio: ~$0.036 (1 minute)
- 500 messages/mois: ~$18/mois
```

### **Performance**
```
- Transcription: 2-5 secondes
- Analyse IA: 1-2 secondes  
- Total pipeline: 4-8 secondes
- Même workflow final que texte
```

## 🚨 **Gestion Erreurs**

### **Fallback Automatique**
```
🎤 Audio non compris → "Veuillez réécrire en texte"
🔑 OpenAI indisponible → "Service audio en maintenance"
⚡ Timeout → "Réessayez en mode texte"
📱 Toujours → Option texte disponible
```

### **Monitoring**
```bash
# Logs Edge Functions
supabase functions logs webhook-router --follow
supabase functions logs audio-to-text --follow

# Headers de diagnostic  
X-LokoTaxi-Route: AUDIO|TEXTE
X-LokoTaxi-Processing-Time: 3200ms
```

## 🎯 **Avantages Système**

1. **🔒 Zéro Impact Texte** - Bot existant 100% préservé
2. **🎤 Audio Intelligent** - Analyse temporelle avancée
3. **🔄 Pipeline Unifié** - Même logique finale texte/audio
4. **⚡ Performance** - Routage automatique optimisé
5. **🛠️ Maintenance** - Modules séparés, debugging facile

## 🌟 **Cas d'Usage Avancés**

### **Réservations Futures**
```
🎤 "Je veux aller à l'ambassade demain à 10 heures"
🤖 Suggestions ambassades + planning demain 10h00
→ Confirmation + rappel automatique demain 09h30
```

### **Délais Relatifs** 
```
🎤 "Je pars pour Kaloum dans 20 minutes"
🤖 Calcul temps réel → 15h40 précis
→ Conducteur notifié 15h35 pour arrivée 15h40
```

### **Gestions Urgences**
```
🎤 "Je veux aller à l'hôpital maintenant"
🤖 Suggestions par proximité + temps d'arrivée
→ Priorité haute + notification conducteurs urgence
```

---

**🎉 Système Audio LokoTaxi - Intelligence Vocale pour Réservations de Taxis !**

*🇬🇳 Made with ❤️ in Guinea - Powered by OpenAI Whisper & GPT-4*