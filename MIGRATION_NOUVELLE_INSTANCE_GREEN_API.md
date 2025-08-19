# 🔄 Migration vers Nouvelle Instance Green API Business

## 📊 CONFIGURATION ACTUELLE vs NOUVELLE

| Paramètre | Ancienne (Dev) | Nouvelle (Business $12) |
|-----------|----------------|-------------------------|
| **Instance ID** | `7105303272` | `7105303512` |
| **Plan** | Developer (restrictions) | Business USD $12 |
| **Statut** | Authorized | ⏳ Not Authorized |
| **Expiration** | - | 16 septembre 2025 |
| **Token** | `64608...` | ⏳ À récupérer |

## ⚡ ÉTAPES MIGRATION

### 1. Autoriser Nouvelle Instance
- **Console** : https://console.green-api.com/instanceList
- **Cliquer** : Instance 7105303512 (BUSINESS_USD_12)
- **Scanner QR** avec WhatsApp +224623542219
- **Vérifier** : Statut passe à "Authorized"

### 2. Récupérer Token Nouvelle Instance
- **Aller dans** : Settings → API
- **Copier** : Token de l'instance 7105303512

### 3. Mettre à Jour Secrets Supabase
```bash
# Nouvelle instance ID
supabase secrets set GREEN_API_INSTANCE_ID=7105303512

# Nouveau token (à récupérer après autorisation)
supabase secrets set GREEN_API_TOKEN=nouveau_token_instance_7105303512
```

### 4. Configurer Webhook Nouvelle Instance
**URL Webhook :**
```
https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2
```

**Configuration via API :**
```bash
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/setSettings/NOUVEAU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2",
    "outgoingWebhook": "yes",
    "incomingWebhook": "yes"
  }'
```

### 5. Test Nouvelle Configuration
```bash
# Test envoi message
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/sendMessage/NOUVEAU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "224623542219@c.us",
    "message": "🎉 Migration Green API Business réussie ! Bot LokoTaxi opérationnel."
  }'
```

## 🔧 MISE À JOUR CODE BOT

**Fichier :** `supabase/functions/whatsapp-bot-v2/index.ts`

**Variables mises à jour automatiquement :**
```typescript
const GREEN_API_INSTANCE_ID = Deno.env.get('GREEN_API_INSTANCE_ID') || '7105303512';
const GREEN_API_TOKEN = Deno.env.get('GREEN_API_TOKEN') || 'NOUVEAU_TOKEN';
const GREEN_API_BASE_URL = 'https://7105.api.greenapi.com';
```

## ✅ VALIDATION POST-MIGRATION

### Test 1: État Instance
```bash
curl "https://7105.api.greenapi.com/waInstance7105303512/getStateInstance/NOUVEAU_TOKEN"
```
**Attendu :** `{"stateInstance":"authorized"}`

### Test 2: Envoi Message
- Envoyer message test vers +224623542219
- Vérifier réception dans WhatsApp

### Test 3: Réception Webhook  
- Envoyer "taxi" depuis +224623542219
- Vérifier logs Supabase : `supabase functions logs whatsapp-bot-v2 --follow`

### Test 4: Workflow Complet
- Message "taxi" → choix véhicule → GPS → destination → confirmation

## 🎯 AVANTAGES MIGRATION

✅ **Plus de restrictions** quota correspondants  
✅ **Support +224623542219** officiellement  
✅ **Plan Business** jusqu'à septembre 2025  
✅ **Performance** améliorée  

## 📋 CHECKLIST MIGRATION

- [ ] Instance 7105303512 autorisée (QR scanné)
- [ ] Token récupéré depuis console
- [ ] Secrets Supabase mis à jour
- [ ] Webhook configuré
- [ ] Tests validation réussis
- [ ] Ancienne instance désactivée

**Status :** ⏳ En attente autorisation instance 7105303512