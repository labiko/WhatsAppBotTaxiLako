# 🌿 GUIDE DÉTAILLÉ - MIGRATION TWILIO → GREEN API

## 🎯 OBJECTIF
Tester Green API gratuitement en parallèle pendant qu'on attend WABA Connect, avec architecture de bascule simple.

---

## 💰 **AVANTAGES GREEN API**

### ✅ **PLAN GRATUIT POUR TESTS :**
- ✅ **$0/mois** - Plan Developer gratuit à vie
- ✅ **3 contacts/groupes** autorisés (suffisant pour tests)
- ✅ **API complète** (envoi + réception)
- ✅ **Webhooks inclus** 
- ✅ **Pas de limite de temps** (vraiment gratuit)

### 🚀 **PLAN BUSINESS (si tests concluants) :**
- ✅ **$8-15/mois** environ
- ✅ **Contacts illimités**
- ✅ **Instances multiples**
- ✅ **Support technique**

---

## 📋 ÉTAPE 1 : CRÉATION COMPTE GREEN API (10 minutes)

### **1.1 Inscription**
1. **Aller sur :** https://green-api.com/en
2. **Cliquer :** "Get Started" ou "Create Account"
3. **Remplir le formulaire :**
   ```
   Email: votre_email@gmail.com
   Password: MotDePasse123!
   Company: LokoTaxi
   Phone: +224 XXX XXX XXX
   ```
4. **Vérifier email** et activer le compte

### **1.2 Création d'instance**
1. **Dashboard Green API** → "Create Instance"
2. **Nom instance :** `lokotaxi-bot-test`
3. **Plan :** Developer (Free)
4. **Région :** Europe (meilleure performance)
5. **Cliquer :** "Create"

### **1.3 Récupération des identifiants**
Après création, vous obtenez :
```
Instance ID: 7103XXXXXX
API Token: b25c2XXXXXXXXXXXXXXXXXXXXX
QR Code: Pour connecter WhatsApp
```

⚠️ **IMPORTANT :** Sauvegarder ces informations !

---

## 📋 ÉTAPE 2 : CONNEXION WHATSAPP (5 minutes)

### **2.1 Scanner QR Code**
1. **Dashboard Green API** → Votre instance → "Scan QR"
2. **Ouvrir WhatsApp** sur votre téléphone
3. **Menu** → "Appareils connectés" → "Connecter un appareil"
4. **Scanner le QR Code** affiché
5. **Attendre** "Connected" (statut vert)

### **2.2 Vérification connexion**
1. **Dashboard** → Instance → "API" → "getSettings"
2. **Vérifier :** `"webhookUrl": null` (normal pour l'instant)
3. **Status :** "authorized" = ✅ Connecté

---

## 📋 ÉTAPE 3 : BACKUP BOT ACTUEL (5 minutes)

### **3.1 Backup obligatoire**
```bash
cd "C:\Users\diall\Documents\LokoTaxi\supabase\functions\whatsapp-bot-v2"

# Backup avec timestamp
$timestamp = Get-Date -Format "MM_yyyy_HHh_mmins"
cp index.ts "backup_bot_v2_AVANT_GREEN_API_$timestamp.ts"
```

### **3.2 Vérification**
```bash
# Vérifier que le backup existe
ls backup_bot_v2_AVANT_GREEN_API_*.ts
```

---

## 📋 ÉTAPE 4 : MODIFICATIONS CODE (25 minutes)

### **4.1 Configuration variables d'environnement**

**📁 Fichier :** `supabase/functions/whatsapp-bot-v2/index.ts`

**🔍 Ligne ~50** - Ajouter après les variables existantes :
```typescript
// Green API Configuration
const GREEN_API_INSTANCE_ID = Deno.env.get('GREEN_API_INSTANCE_ID') || '';
const GREEN_API_TOKEN = Deno.env.get('GREEN_API_TOKEN') || '';
const GREEN_API_WEBHOOK_URL = `https://7103${GREEN_API_INSTANCE_ID}.api.green-api.com`;

// 🔄 BASCULE ENTRE PROVIDERS (UNE SEULE VARIABLE)
const WHATSAPP_PROVIDER = Deno.env.get('WHATSAPP_PROVIDER') || 'twilio';
// Options: 'twilio', 'waba', 'greenapi'

console.log(`🔧 Provider WhatsApp actif: ${WHATSAPP_PROVIDER.toUpperCase()}`);
```

### **4.2 Modification réception messages**

**🔍 Ligne ~120** - Remplacer la logique de parsing :

**APRÈS (support multi-providers) :**
```typescript
let body = '';
let from = '';
let latitude: string | undefined;
let longitude: string | undefined;
let mediaUrl0: string | undefined;

// 🔄 BASCULE AUTOMATIQUE SELON WHATSAPP_PROVIDER
if (WHATSAPP_PROVIDER === 'greenapi') {
  // Green API webhook format
  const payload = await req.json();
  console.log('🌿 Green API webhook reçu:', JSON.stringify(payload, null, 2));
  
  // Format Green API standard
  if (payload.typeWebhook === 'incomingMessageReceived') {
    const messageData = payload.messageData;
    body = messageData.textMessageData?.textMessage || '';
    from = `whatsapp:+${messageData.chatId.replace('@c.us', '')}`;
    
    // Gestion localisation Green API
    if (messageData.locationMessageData) {
      latitude = messageData.locationMessageData.latitude?.toString();
      longitude = messageData.locationMessageData.longitude?.toString();
    }
    
    // Gestion médias Green API
    if (messageData.audioMessageData || messageData.voiceMessageData) {
      mediaUrl0 = messageData.downloadUrl;
    }
  }
  
} else if (WHATSAPP_PROVIDER === 'waba') {
  // WABA Connect format (code précédent)
  const payload = await req.json();
  if (payload.messages && payload.messages.length > 0) {
    const message = payload.messages[0];
    body = message.text?.body || '';
    from = `whatsapp:+${payload.contacts[0]?.wa_id || ''}`;
    
    if (message.location) {
      latitude = message.location.latitude?.toString();
      longitude = message.location.longitude?.toString();
    }
  }
  
} else {
  // Twilio format (par défaut)
  const formData = await req.formData();
  body = formData.get('Body')?.toString() || '';
  from = formData.get('From')?.toString() || '';
  latitude = formData.get('Latitude')?.toString();
  longitude = formData.get('Longitude')?.toString();
  mediaUrl0 = formData.get('MediaUrl0')?.toString();
  console.log('📞 Twilio webhook reçu - Body:', body);
}
```

### **4.3 Modification envoi messages**

**🔍 Ligne ~2500** - Ajouter fonction Green API :

```typescript
// 🔄 FONCTION PRINCIPALE - BASCULE AUTOMATIQUE
async function sendWhatsAppMessage(to: string, message: string): Promise<Response> {
  if (WHATSAPP_PROVIDER === 'greenapi') {
    return await sendGreenAPIMessage(to, message);
  } else if (WHATSAPP_PROVIDER === 'waba') {
    return await sendWABAConnectMessage(to, message);
  } else {
    return await sendTwilioMessage(to, message);
  }
}

// 🌿 GREEN API
async function sendGreenAPIMessage(to: string, message: string): Promise<Response> {
  const phoneNumber = to.replace('whatsapp:', '').replace('+', '') + '@c.us';
  
  const greenApiPayload = {
    chatId: phoneNumber,
    message: message
  };
  
  console.log(`🌿 Green API → ${phoneNumber}:`, message.substring(0, 50));
  
  const response = await fetch(`https://7103${GREEN_API_INSTANCE_ID}.api.green-api.com/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(greenApiPayload)
  });
  
  const result = await response.text();
  console.log(`🌿 Green API Response:`, result.substring(0, 100));
  
  return new Response('OK');
}

// 📤 WABA Connect (code précédent inchangé)
async function sendWABAConnectMessage(to: string, message: string): Promise<Response> {
  // ... code WABA Connect existant ...
}

// 📤 TWILIO (code existant inchangé)
async function sendTwilioMessage(to: string, message: string): Promise<Response> {
  console.log(`📞 Twilio → ${to}:`, message.substring(0, 50));
  // ... GARDER TOUT VOTRE CODE TWILIO EXISTANT ICI ...
  return new Response('OK');
}
```

### **4.4 Gestion d'erreurs Green API**

**🔍 Ajouter après les logs existants :**
```typescript
// Logs diagnostic par provider
if (WHATSAPP_PROVIDER === 'greenapi') {
  console.log(`🌿 Green API Instance: ${GREEN_API_INSTANCE_ID}`);
  console.log(`📱 Message reçu de: ${from}`);
  console.log(`💬 Contenu: "${body.substring(0, 50)}..."`);
}
```

---

## 📋 ÉTAPE 5 : CONFIGURATION SUPABASE (10 minutes)

### **5.1 Variables d'environnement**

1. **Dashboard Supabase :** Edge Functions → Settings
2. **Ajouter les variables :**
   ```
   GREEN_API_INSTANCE_ID=votre_instance_id_green_api
   GREEN_API_TOKEN=votre_token_green_api
   WHATSAPP_PROVIDER=twilio
   ```

⚠️ **IMPORTANT :** Commencer avec `WHATSAPP_PROVIDER=twilio` pour garder le système actuel !

### **5.2 Test configuration**
```bash
# Vérifier variables bien définies
echo $GREEN_API_INSTANCE_ID
echo $GREEN_API_TOKEN
```

---

## 📋 ÉTAPE 6 : DÉPLOIEMENT TEST (5 minutes)

### **6.1 Déploiement avec Twilio encore actif**
```bash
cd "C:\Users\diall\Documents\LokoTaxi"
supabase functions deploy whatsapp-bot-v2
```

### **6.2 Vérification fonctionnement**
1. **Envoyer "taxi"** via Twilio Sandbox
2. ✅ **Vérifier :** Bot répond normalement
3. **Vérifier logs :** "Provider WhatsApp actif: TWILIO"

---

## 📋 ÉTAPE 7 : CONFIGURATION WEBHOOK GREEN API (10 minutes)

### **7.1 Configuration webhook dans Green API**

1. **Dashboard Green API** → Votre instance → "API"
2. **Méthode :** `setSettings`
3. **Paramètres :**
   ```json
   {
     "webhookUrl": "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2",
     "webhookUrlToken": "your_secret_token_123",
     "outgoingWebhook": "yes",
     "incomingWebhook": "yes"
   }
   ```
4. **Exécuter** la méthode

### **7.2 Vérification webhook**
1. **Méthode :** `getSettings`
2. ✅ **Vérifier :** `webhookUrl` configurée
3. ✅ **Status :** `outgoingWebhook: "yes"`

---

## 📋 ÉTAPE 8 : TEST GREEN API (15 minutes)

### **8.1 Bascule vers Green API**

1. **Dashboard Supabase :** Edge Functions → Settings  
2. **Modifier :** `WHATSAPP_PROVIDER=greenapi`
3. **Sauvegarder**

🎯 **La bascule est instantanée !**

### **8.2 Test avec vos 3 contacts autorisés**

**Contact 1 - Votre numéro :**
```
1. Envoyer "taxi" depuis votre WhatsApp
2. ✅ Vérifier: "Quel type de véhicule ?"
3. Répondre "moto"
4. ✅ Vérifier: "Partagez votre position"
```

**Contacts 2 & 3 - Conducteurs test :**
```
Ajouter 2 numéros de conducteurs pour tests complets
```

### **8.3 Vérification logs**
```
🔧 Provider WhatsApp actif: GREENAPI
🌿 Green API webhook reçu: {"typeWebhook": "incomingMessageReceived"...}
🌿 Green API → 224XXXXXXX@c.us: Quel type de véhicule...
```

### **8.4 Retour d'urgence à Twilio**
```bash
# Si problème Green API
Dashboard Supabase → WHATSAPP_PROVIDER=twilio
# Retour instantané vers Twilio
```

---

## 📋 ÉTAPE 9 : VALIDATION FONCTIONNALITÉS (10 minutes)

### **9.1 Test workflow complet Green API**
```
1. Client: "taxi" → Bot: "Quel type de véhicule ?"
2. Client: "moto" → Bot: "Partagez votre position"
3. Client: [GPS] → Bot: "Quelle est votre destination ?"
4. Client: "donka" → Bot: Suggestions + prix
5. Client: "1" → Bot: "Confirmer ? (oui/non)"
6. Client: "oui" → Bot: "Conducteur assigné..."
```

### **9.2 Test fonctionnalités avancées**
```
✅ IA Text Intelligence: "taxi moto pour hopital donka"
✅ Recherche Google Places: "hôpital ignace deen"
✅ Sessions persistantes: Interruption + reprise conversation
✅ Géolocalisation GPS: Partage localisation
```

---

## 📋 ÉTAPE 10 : COMPARAISON PERFORMANCE (5 minutes)

### **10.1 Métriques à comparer**

| Métrique | Twilio | Green API | WABA Connect |
|----------|--------|-----------|--------------|
| **Temps de réponse** | ~2-3s | ~1-2s | À tester |
| **Taux livraison** | 99% | À mesurer | À tester |
| **Stabilité** | ✅ Excellent | 🧪 À tester | À tester |
| **Coût** | Gratuit (3j) | Gratuit (3 contacts) | $12/mois |

### **10.2 Logs performance**
```bash
# Mesurer temps de réponse
Green API: "Response time: 1.2s"
Twilio: "Response time: 2.8s"
```

---

## 📋 ÉTAPE 11 : DÉCISION FINALE (après tests)

### **11.1 Si Green API fonctionne bien :**
- **Passer plan Business** ($8-15/mois)
- **Contacts illimités**
- **Économie** vs WABA Connect

### **11.2 Si problèmes Green API :**
- **Retour Twilio** (`WHATSAPP_PROVIDER=twilio`)
- **Attendre WABA Connect**
- **Architecture préservée**

### **11.3 Comparaison finale**
```bash
# Stratégie optimale selon résultats
Green API OK → Économie maximum
Green API KO → WABA Connect backup
Twilio → Solution temporaire fonctionnelle
```

---

## 🎯 **RÉSULTATS ATTENDUS**

### **✅ SUCCÈS GREEN API :**
- **Bot fonctionnel** en production
- **Coût $0** (plan gratuit) ou $8-15/mois (business)
- **Alternative validée** à WABA Connect
- **Architecture flexible** maintenue

### **🔧 ARCHITECTURE FINALE :**
```typescript
// Bascule simple entre tous providers
const WHATSAPP_PROVIDER = Deno.env.get('WHATSAPP_PROVIDER');
// 'twilio' | 'greenapi' | 'waba' | 'msg91' | 'ultramsg'
```

### **📊 AVANTAGES OBTENUS :**
- ✅ **Tests gratuits** Green API sans engagement
- ✅ **Comparaison directe** performance providers  
- ✅ **Plan B validé** si WABA Connect échoue
- ✅ **Architecture évolutive** pour nouveaux providers

**🚀 RÉSULTAT : Bot résilient avec multiples options de production !**