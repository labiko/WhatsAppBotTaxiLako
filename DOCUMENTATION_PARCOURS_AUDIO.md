# 🎤 DOCUMENTATION - PARCOURS AUDIO WHATSAPP BOT

## 🎯 **VUE D'ENSEMBLE**

Le parcours audio permet aux utilisateurs de réserver un taxi via messages vocaux WhatsApp. L'IA transcrit l'audio, analyse le contenu pour extraire automatiquement le type de véhicule, la destination et les informations temporelles.

---

## 🏗️ **ARCHITECTURE GÉNÉRALE**

### **Point d'entrée principal** 
```typescript
serve(async (req) => {
  // Routage automatique
  if (mediaUrl0) {
    return await handleAudioMessage(from, mediaUrl0);
  }
});
```

### **Handler principal audio**
```typescript
async function handleAudioMessage(from: string, mediaUrl: string): Promise<Response>
```

---

## 🧠 **COMPOSANTS IA**

### **Configuration IA**
```typescript
const AI_AUDIO_ENABLED = Deno.env.get('AI_AUDIO_ENABLED') === 'true';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
```

### **Interfaces de données IA**
```typescript
interface AIAnalysis {
  destination: string;
  vehicle_type: 'moto' | 'voiture' | 'auto_detect';
  confidence: number;
  raw_transcript: string;
  temporal_info?: {
    date?: string;
    hour?: number; 
    minute?: number;
    relative_time?: string;
  }
}
```

---

## 📋 **FLUX COMPLET DU PARCOURS AUDIO**

### **ÉTAPE 1 : Réception audio**
**Trigger :** Message vocal WhatsApp

```typescript
// Lignes 2309-2334
async function handleAudioMessage(from: string, mediaUrl: string) {
  const clientPhone = normalizePhone(from);
  console.log(`🎤 AUDIO: ${clientPhone} | 📎 ${mediaUrl}`);
  
  // Vérification activation IA
  if (!AI_AUDIO_ENABLED) {
    return fallbackMessage(`🎤 Fonctionnalité audio bientôt disponible!
    Pour l'instant, utilisez le système texte:
    📝 Écrivez 'taxi' pour commencer`);
  }
  
  // Vérification clé OpenAI
  if (!OPENAI_API_KEY) {
    return await handleTextMessage(from, "Configuration IA manquante - écrivez 'taxi'");
  }
}
```

**Contrôles de sécurité :**
- Vérification `AI_AUDIO_ENABLED`
- Validation `OPENAI_API_KEY`
- Fallback vers mode texte si indisponible

---

### **ÉTAPE 2 : Téléchargement audio**
**Source :** URL Twilio MediaUrl0

```typescript
// Téléchargement depuis Twilio (implémentation via fetch)
const audioResponse = await fetch(mediaUrl);
const audioBuffer = await audioResponse.arrayBuffer();
```

**Formats supportés :**
- MP3, WAV, OGG (formats WhatsApp)
- Limite de taille et durée
- Validation du type MIME

---

### **ÉTAPE 3 : Transcription Whisper**
**API :** OpenAI Whisper

```typescript
// Transcription via API OpenAI
const transcriptionResponse = await fetch(WHISPER_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'multipart/form-data'
  },
  body: formData // Audio + paramètres
});

const transcription = await transcriptionResponse.json();
const transcript = transcription.text;
```

**Paramètres Whisper :**
- `model: "whisper-1"`
- `language: "fr"` (français privilégié)
- `response_format: "json"`
- `temperature: 0` (précision maximale)

---

### **ÉTAPE 4 : Analyse IA GPT-4**
**Extraction intelligente des informations**

```typescript
// Prompt d'analyse structurée
const aiPrompt = `
Analysez cette demande de taxi en français/pular :
"${transcript}"

Extrayez les informations suivantes au format JSON :
{
  "destination": "lieu de destination exact ou 'auto_detect' si unclear",
  "vehicle_type": "moto" | "voiture" | "auto_detect",
  "confidence": 0.0-1.0,
  "temporal_info": {
    "date": "YYYY-MM-DD ou null",
    "hour": number ou null,
    "minute": number ou null,
    "relative_time": "demain|ce soir|maintenant" ou null
  }
}`;

const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [{ role: "user", content: aiPrompt }],
    temperature: 0.1,
    max_tokens: 500
  })
});
```

**Capacités d'analyse :**
- **Destination** : Reconnaissance de lieux (Donka, Madina, Kipe...)
- **Véhicule** : Détection moto/voiture/taxi
- **Temporel** : Extraction date/heure (demain, ce soir, 8h...)
- **Confidence** : Score de confiance de l'analyse
- **Multilingue** : Français + Pular

---

### **ÉTAPE 5 : Traitement selon analyse**

#### **Cas A : Destination + Véhicule détectés**
```typescript
if (aiAnalysis.destination !== 'auto_detect' && aiAnalysis.vehicle_type !== 'auto_detect') {
  // Créer session complète avec données IA
  await saveSession(clientPhone, {
    vehicleType: aiAnalysis.vehicle_type,
    destinationNom: aiAnalysis.destination,
    etat: 'vehicule_et_destination_ia',
    temporalPlanning: !!aiAnalysis.temporal_info?.date,
    plannedDate: aiAnalysis.temporal_info?.date,
    plannedHour: aiAnalysis.temporal_info?.hour,
    plannedMinute: aiAnalysis.temporal_info?.minute
  });
  
  // Demander confirmation immédiate
  const temporalInfo = aiAnalysis.temporal_info?.date 
    ? `📅 PLANIFIÉ: ${aiAnalysis.temporal_info.date} à ${aiAnalysis.temporal_info.hour}h`
    : '';
    
  responseMessage = `🎤 **ANALYSE IA TERMINÉE**
  ${temporalInfo}
  🚗 Véhicule: ${aiAnalysis.vehicle_type.toUpperCase()}
  📍 Destination: ${aiAnalysis.destination}
  
  ✅ **Partagez votre position GPS pour confirmer**`;
}
```

#### **Cas B : Informations partielles**
```typescript
else if (aiAnalysis.vehicle_type !== 'auto_detect') {
  // Véhicule détecté, destination manquante
  await saveSession(clientPhone, {
    vehicleType: aiAnalysis.vehicle_type,
    destinationNom: 'auto_detect', // À compléter
    etat: 'vehicule_detecte_ia'
  });
  
  responseMessage = `🎤 **VÉHICULE DÉTECTÉ: ${aiAnalysis.vehicle_type.toUpperCase()}**
  
  🤔 **Quelle est votre destination ?**
  Tapez le nom du lieu où vous voulez aller.`;
}
```

#### **Cas C : Échec d'analyse**
```typescript
else {
  // Fallback vers workflow texte standard
  return await handleTextMessage(from, "Je n'ai pas compris votre demande. Écrivez 'taxi' pour utiliser le mode texte.");
}
```

---

### **ÉTAPE 6 : Workflow spécialisés audio**

#### **État 'vehicule_et_destination_ia' + GPS**
```typescript
// Lignes 1390-1414 (dans handleTextMessage - bloc hasLocation)
if (session.etat === 'vehicule_et_destination_ia') {
  await saveSession(clientPhone, {
    ...session,
    positionClient: `POINT(${lon} ${lat})`,
    etat: 'position_recue_avec_destination_ia'
  });
  
  responseMessage = `📍 **POSITION GPS REÇUE !**
  🤖 **ANALYSE IA CONFIRMÉE:**
  📍 Destination: ${session.destinationNom}
  🚗 Véhicule: ${session.vehicleType!.toUpperCase()}
  
  ✅ **Confirmez-vous cette destination ?**
  • "oui" → Calculer le prix et trouver un conducteur
  • "non" → Choisir une autre destination`;
}
```

#### **Confirmation destination IA**
```typescript
// Lignes 1620-1684
if (session.etat === 'position_recue_avec_destination_ia' && !hasLocation) {
  if (messageText === 'oui' || messageText === 'confirmer') {
    // Calcul prix avec destination IA
    const clientCoords = await getClientCoordinates(normalizePhone(from));
    const destinationCoords = await getDestinationCoords(session.destinationNom);
    const distanceKm = calculateDistance(clientCoords.latitude, clientCoords.longitude, 
                                       destinationCoords.latitude, destinationCoords.longitude);
    const prixInfo = await calculerPrixCourse(session.vehicleType!, distanceKm);
    
    await saveSession(clientPhone, {
      ...session,
      distanceKm: distanceKm,
      prixEstime: prixInfo.prix_total,
      etat: 'prix_calcule'
    });
    
    const temporalInfo = session.temporalPlanning 
      ? `📅 **PLANIFIÉ:** ${session.plannedDate} à ${session.plannedHour}h\n`
      : '';
      
    responseMessage = `📍 **RÉSUMÉ DE VOTRE COURSE IA**
    ${temporalInfo}🎤 **Demande vocale traitée avec succès !**
    🚗 Type: ${session.vehicleType!.toUpperCase()}
    📍 Destination: ${session.destinationNom}
    📏 Distance: ${distanceKm.toFixed(1)} km
    💰 **Prix estimé: ${prixInfo.prix_total.toLocaleString('fr-FR')} GNF**
    
    Confirmez-vous cette réservation ?`;
  }
}
```

---

## 🔧 **FONCTIONS SPÉCIALISÉES AUDIO**

### **Transcription et IA**
```typescript
async function transcribeAudio(audioUrl: string): Promise<string>
// Appel API Whisper pour transcription

async function analyzeWithAI(transcript: string): Promise<AIAnalysis>
// Analyse GPT-4 pour extraction d'informations

async function validateAIAnalysis(analysis: AIAnalysis): Promise<boolean>
// Validation de la cohérence des résultats IA
```

### **Traitement temporel**
```typescript
function parseTemporalInfo(temporal: TemporalInfo): { date: string, hour: number }
// Conversion "demain 8h" → date/heure concrètes

function validateTemporalBooking(date: string, hour: number): boolean
// Validation créneaux de réservation (heures ouvrables, date future)
```

### **Gestion multilingue**
```typescript
function detectLanguage(transcript: string): 'fr' | 'pular' | 'mixed'
// Détection automatique de la langue

async function translateIfNeeded(text: string, fromLang: string): Promise<string>
// Traduction automatique si nécessaire
```

---

## 🎯 **ÉTATS DE SESSION AUDIO**

| État | Description | Origine | Prochaine étape |
|------|-------------|---------|-----------------|
| `vehicule_et_destination_ia` | IA a tout détecté | Audio complet | GPS partagé |
| `vehicule_detecte_ia` | Seul véhicule détecté | Audio partiel | Saisie destination |
| `position_recue_avec_destination_ia` | GPS reçu avec destination IA | Après GPS | Confirmation destination |
| `attente_position_planifie` | Réservation temporelle | Audio avec date/heure | GPS partagé |
| `position_recue_planifiee` | GPS pour réservation future | Temporal + GPS | Confirmation finale |
| `prix_calcule_planifie` | Prix calculé pour réservation future | Temporal complet | Confirmation finale |

---

## 🌐 **INTÉGRATION MULTILINGUE**

### **Langues supportées**
- **Français** : Langue principale
- **Pular** : Langue locale Guinée (via Meta MMS si disponible)
- **Mélange** : Détection code-switching fr/pular

### **Exemples de transcriptions**
```
🇫🇷 "Je veux un taxi-moto pour aller à Donka demain matin"
→ vehicle_type: "moto", destination: "Donka", temporal: "demain matin"

🇬🇳 "Mi yidi moto taxi yahugo Madina" (pular)
→ vehicle_type: "moto", destination: "Madina"

🇫🇷🇬🇳 "Je veux aller à Kipe en moto, walaa demain soir"
→ vehicle_type: "moto", destination: "Kipe", temporal: "demain soir"
```

---

## 🚨 **GESTION D'ERREURS AUDIO**

### **Erreurs de transcription**
```typescript
if (!transcript || transcript.length < 3) {
  return await handleTextMessage(from, 
    "🎤 Audio non compris. Essayez de parler plus clairement ou utilisez le mode texte.");
}
```

### **Échecs d'analyse IA**
```typescript
if (aiAnalysis.confidence < 0.3) {
  return await handleTextMessage(from,
    "🎤 Je n'ai pas bien compris votre demande. Pouvez-vous la reformuler ?");
}
```

### **Problèmes techniques**
- **Timeout transcription** : Fallback vers texte
- **Quota OpenAI dépassé** : Message d'excuse + mode texte
- **Audio corrompu** : Demande de renvoi
- **Analyse incohérente** : Validation supplémentaire

---

## 💰 **COÛTS ET LIMITES**

### **Coûts par interaction**
- **Whisper transcription** : ~$0.006/minute
- **GPT-4 analyse** : ~$0.01 par analyse
- **Total moyen** : ~$0.02 par réservation audio

### **Limites techniques**
- **Durée audio** : 5 minutes maximum
- **Taille fichier** : 25 MB maximum  
- **Langues** : Français + Pular optimisé
- **Débit** : 100 requêtes/minute OpenAI

---

## 🔄 **INTÉGRATION AVEC MODE TEXTE**

### **Points de convergence**
- **Sessions partagées** : Même table `sessions`
- **Workflow final identique** : Prix, confirmation, réservation
- **Fonctions communes** : Recherche, calculs, conducteurs
- **Fallback automatique** : Audio → Texte si échec

### **Avantages de l'audio**
- **Vitesse** : Une seule interaction vs 6 étapes texte
- **Multilingue** : Support pular natif
- **Temporel** : Réservations futures automatiques
- **Naturel** : Interface vocale intuitive

### **Complémentarité**
- **Audio** : Utilisateurs locaux, langues locales, réservations complexes
- **Texte** : Utilisateurs internationaux, environnements bruyants, précision