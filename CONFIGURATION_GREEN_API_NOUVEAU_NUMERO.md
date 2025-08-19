# 🔧 Configuration Green API - Nouveau Numéro +224623542219

## ✅ CONFIGURATION ACTUELLE CONFIRMÉE

**Instance ID :** `7105303272`
**Token :** `64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86`
**Nouveau numéro :** `+224623542219`

## 📱 ÉTAPES CONFIGURATION WEBHOOK

### 1. Accéder au Dashboard Green API
- **URL :** https://console.green-api.com/
- **Instance ID :** `7105303272`

### 2. Configurer le Webhook URL
**URL Webhook à configurer :**
```
https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2
```

### 3. Configuration via API (Alternative)
```bash
curl -X POST "https://7105.api.greenapi.com/waInstance7105303272/setSettings/64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2",
    "outgoingWebhook": "yes",
    "incomingWebhook": "yes",
    "webhookUrlToken": ""
  }'
```

### 4. Test du Numéro
**Format d'envoi Green API :**
- **Numéro :** `224623542219@c.us` (format Green API)
- **Test depuis Supabase :** Envoyer un message de test

### 5. Validation Configuration

**Test 1: Envoi via Green API**
```bash
curl -X POST "https://7105.api.greenapi.com/waInstance7105303272/sendMessage/64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "224623542219@c.us",
    "message": "🤖 Test LokoTaxi Bot - Configuration réussie !"
  }'
```

**Test 2: Réception Webhook**
- Envoyer message depuis WhatsApp +224623542219
- Vérifier logs Supabase Edge Function
- Confirmer réception du webhook

## 🔍 DEBUG ET LOGS

### Logs Edge Function (Bot V2)
```bash
supabase functions logs whatsapp-bot-v2 --follow
```

### Vérification Instance Green API
```bash
curl "https://7105.api.greenapi.com/waInstance7105303272/getStateInstance/64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86"
```

**Réponse attendue :** `{"stateInstance": "authorized"}`

## ⚠️ POINTS IMPORTANTS

1. **Format numéro :** Toujours utiliser format `224623542219@c.us` pour Green API
2. **Webhook obligatoire :** Sans webhook configuré, pas de réception de messages
3. **Instance authorized :** L'instance doit être en état "authorized"
4. **Bot V2 actif :** Utiliser whatsapp-bot-v2 (pas V3) pour les tests Green API

## 🎯 PROCHAINES ÉTAPES

1. Configurer webhook URL dans console Green API
2. Tester envoi message vers +224623542219
3. Vérifier réception webhook dans logs Supabase
4. Valider workflow complet bot V2

**Status :** ⏳ En attente configuration webhook