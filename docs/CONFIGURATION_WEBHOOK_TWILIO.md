# 🔧 Configuration Webhook Twilio - Routage Audio/Texte Automatique

## 🎯 **Objectif**

Configurer Twilio pour router automatiquement :
- **Messages audio** → `audio-to-text` function
- **Messages texte** → `whatsapp-bot` function  

## 🏗️ **Architecture Routing**

```
📱 MESSAGE WHATSAPP
├── 🎤 Audio (MediaUrl0 présent)
│   └── → https://projet.supabase.co/functions/v1/audio-to-text
└── 📝 Texte (Body présent)
    └── → https://projet.supabase.co/functions/v1/whatsapp-bot
```

## 🚀 **OPTION 1 : Webhook Conditionnel (Recommandé)**

### **Configuration Twilio Console**

1. **Accéder à Twilio Console**
   ```
   https://console.twilio.com/
   → Messaging → Settings → WhatsApp sandbox settings
   ```

2. **Webhook URL Principal**
   ```
   https://your-project-id.supabase.co/functions/v1/webhook-router
   ```

3. **Créer Function Router** (nouveau fichier à créer)

### **Créer Edge Function Router**

**Fichier :** `supabase/functions/webhook-router/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AUDIO_TO_TEXT_URL = Deno.env.get('AUDIO_TO_TEXT_URL') || 'https://your-project.supabase.co/functions/v1/audio-to-text';
const WHATSAPP_BOT_URL = Deno.env.get('WHATSAPP_BOT_URL') || 'https://your-project.supabase.co/functions/v1/whatsapp-bot';

serve(async (req) => {
  console.log('🔄 Webhook Router - Analyse du message');
  
  // Parser le payload Twilio
  const formData = await req.formData();
  const mediaUrl = formData.get('MediaUrl0')?.toString();
  const body = formData.get('Body')?.toString();
  
  let targetUrl;
  
  if (mediaUrl && mediaUrl.length > 0) {
    // 🎤 AUDIO DÉTECTÉ → audio-to-text function
    targetUrl = AUDIO_TO_TEXT_URL;
    console.log('🎤 Routage vers audio-to-text');
  } else {
    // 📝 TEXTE DÉTECTÉ → whatsapp-bot function  
    targetUrl = WHATSAPP_BOT_URL;
    console.log('📝 Routage vers whatsapp-bot');
  }
  
  // Proxy la requête vers la bonne function
  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData
  });
  
  const responseText = await response.text();
  
  return new Response(responseText, {
    status: response.status,
    headers: {
      'Content-Type': 'text/xml',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
```

## 🚀 **OPTION 2 : Double Webhook (Alternative)**

### **Configuration Manuelle Twilio**

Si vous préférez gérer manuellement, configurer :

1. **Webhook Principal** (99% des cas - texte)
   ```
   https://your-project-id.supabase.co/functions/v1/whatsapp-bot
   ```

2. **Webhook Audio** (cas spéciaux - modifier manuellement)
   ```
   https://your-project-id.supabase.co/functions/v1/audio-to-text
   ```

⚠️ **Inconvénient :** Changement manuel nécessaire selon usage.

## ⚙️ **Variables d'Environnement Twilio**

Ajouter dans votre configuration Supabase :

```bash
# Webhook Routing
AUDIO_TO_TEXT_URL=https://your-project-id.supabase.co/functions/v1/audio-to-text
WHATSAPP_BOT_URL=https://your-project-id.supabase.co/functions/v1/whatsapp-bot

# Authentification Twilio (audio function) 
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here

# OpenAI (audio function)
OPENAI_API_KEY=sk-your_openai_key_here
```

## 🧪 **Tests Validation**

### **Test 1 : Message Texte**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhook-router \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B224622000111&Body=taxi"

# Attendu : Routage vers whatsapp-bot → réponse workflow texte
```

### **Test 2 : Message Audio** 
```bash  
curl -X POST https://your-project.supabase.co/functions/v1/webhook-router \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B224622000111&MediaUrl0=https://api.twilio.com/audio.ogg"

# Attendu : Routage vers audio-to-text → transcription + workflow
```

## 📋 **Checklist Déploiement**

### **Étape 1 : Déployer Functions**
```bash
# Function router (option 1)
supabase functions deploy webhook-router

# Function audio principale
supabase functions deploy audio-to-text

# Function texte (déjà existante)
# supabase functions deploy whatsapp-bot
```

### **Étape 2 : Configuration Variables**
```bash
# Dans Supabase Dashboard → Settings → Environment Variables
AUDIO_TO_TEXT_URL=https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/audio-to-text
WHATSAPP_BOT_URL=https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot
OPENAI_API_KEY=sk-your-key
TWILIO_ACCOUNT_SID=your-sid  
TWILIO_AUTH_TOKEN=your-token
```

### **Étape 3 : Twilio Webhook Update**
```
Twilio Console → Messaging → WhatsApp → Sandbox Settings
Webhook URL: https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/webhook-router
Method: POST
```

### **Étape 4 : Tests Production**
```
1. Envoyer message texte "taxi" → workflow normal
2. Envoyer message audio "je veux un taxi" → transcription + workflow  
3. Vérifier logs Supabase → routage correct
```

## 🔍 **Monitoring & Debug**

### **Logs à Surveiller**
```bash
# Router logs
supabase functions logs webhook-router --follow

# Audio logs  
supabase functions logs audio-to-text --follow

# Texte logs (existant)
supabase functions logs whatsapp-bot --follow
```

### **Messages Debug Typiques**
```
✅ Succès :
"🔄 Webhook Router - Analyse du message"
"🎤 Routage vers audio-to-text" 
"🗣️ Transcription Whisper en cours..."
"✅ Pipeline audio-to-text terminé avec succès"

❌ Erreurs communes :
"❌ OPENAI_API_KEY manquante"
"❌ Erreur téléchargement audio: 401" 
"❌ Erreur Whisper: 400 - Invalid file format"
```

## 🎯 **Résultat Final**

Après configuration, le workflow devient :

```
📱 USER INPUT
├── 🎤 "Je veux aller à Madina à 14h" (audio)
│   ├── → webhook-router détecte MediaUrl0
│   ├── → audio-to-text transcrit + analyse  
│   ├── → appel whatsapp-bot("Madina à 14:00 [META:...]")
│   └── → réponse workflow normal
└── 📝 "taxi" (texte)
    ├── → webhook-router détecte Body
    ├── → whatsapp-bot traite directement
    └── → réponse workflow normal
```

**🎉 RÉSULTAT : Audio et texte utilisent le même pipeline final !**

---

*📅 Configuration recommandée : Option 1 (Webhook Router) pour automatisation complète*