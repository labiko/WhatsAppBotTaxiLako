# 🔗 Liaison +224623542219 à Instance 7105303512 SANS QR Code

## 🎯 PROBLÈME RÉSOLU
**QR code ne fonctionne pas** → **Solution API directe**

## 📋 ÉTAPES LIAISON ALTERNATIVE

### **1. Récupérer Token Instance 7105303512**
- **Console** : https://console.green-api.com/
- **Instance 7105303512** → **Settings** → **API**
- **Copier Token** : `NOUVEAU_TOKEN_7105303512`

### **2. Vérifier État Instance (Avant liaison)**
```bash
curl "https://7105.api.greenapi.com/waInstance7105303512/getStateInstance/NOUVEAU_TOKEN"
```
**Attendu :** `{"stateInstance":"notAuthorized"}` ou `{"stateInstance":"starting"}`

### **3. Alternative 1: Liaison via WhatsApp Web**
**Sur téléphone +224623542219 :**
1. Ouvrir WhatsApp → **Paramètres** → **Appareils liés**
2. **Lier un appareil** 
3. Au lieu de scanner QR Green API, aller sur **web.whatsapp.com**
4. Scanner le QR WhatsApp Web
5. **Copier la session** de WhatsApp Web vers Green API

### **4. Alternative 2: Support Green API Direct**
**Contacter support avec :**
```
Instance ID: 7105303512
Numéro à lier: +224623542219
Problème: QR code "Impossible de connecter l'appareil"
```

### **5. Alternative 3: Reset Instance**
```bash
# Reset instance pour nouveau QR
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/logout/NOUVEAU_TOKEN"

# Attendre 30 secondes puis nouveau QR
curl "https://7105.api.greenapi.com/waInstance7105303512/qr/NOUVEAU_TOKEN"
```

### **6. Alternative 4: Utiliser Méthode Manual**
**API manuelle avec code de vérification :**
```bash
# Demander code SMS sur +224623542219
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/requestCode/NOUVEAU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "224623542219"}'

# Puis saisir le code reçu par SMS
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/authorizeCode/NOUVEAU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "224623542219", "code": "CODE_RECU_SMS"}'
```

## 🔧 CONFIGURATION IMMÉDIATE (Pendant liaison)

**Mettre à jour secrets Supabase :**
```bash
supabase secrets set GREEN_API_INSTANCE_ID=7105303512
supabase secrets set GREEN_API_TOKEN=NOUVEAU_TOKEN_7105303512
```

**Tester configuration :**
```bash
# Test état instance
curl "https://7105.api.greenapi.com/waInstance7105303512/getStateInstance/NOUVEAU_TOKEN"

# Test envoi message (une fois autorisée)
curl -X POST "https://7105.api.greenapi.com/waInstance7105303512/sendMessage/NOUVEAU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "224623542219@c.us",
    "message": "🎉 Instance 7105303512 liée avec succès à +224623542219"
  }'
```

## ⚡ SOLUTION RECOMMANDÉE

**PRIORITÉ 1 :** Alternative 4 (Code SMS) - Plus fiable que QR
**PRIORITÉ 2 :** Reset instance + nouveau QR  
**PRIORITÉ 3 :** Support Green API

## 📍 PROCHAINE ÉTAPE

**1. Récupérez le Token de l'instance 7105303512**
**2. Essayons la méthode SMS (requestCode/authorizeCode)**

**Status :** ⏳ En attente Token instance 7105303512