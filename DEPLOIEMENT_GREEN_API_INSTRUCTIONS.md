# 🚀 INSTRUCTIONS DÉPLOIEMENT - GREEN API INTEGRATION

## ✅ MODIFICATIONS EFFECTUÉES

### 🔧 **Code modifié avec succès :**

1. **Configuration Green API ajoutée** (lignes 113-118)
   ```typescript
   const GREEN_API_INSTANCE_ID = '7105303272';
   const GREEN_API_TOKEN = '64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86';
   const WHATSAPP_PROVIDER = 'twilio'; // Par défaut Twilio
   ```

2. **Fonction sendGreenAPIMessage créée** (lignes 136-163)
   - Envoie des messages via l'API Green API
   - Format : chatId@c.us

3. **Parsing webhook Green API** (lignes 3771-3803)
   - Détecte automatiquement le format JSON Green API
   - Extrait messages texte, localisation, médias

4. **Bascule automatique réponses** 
   - handleTextMessage : Support Green API (lignes 3506-3540)
   - handleAudioMessage : Support Green API (lignes 3641-3668)
   - Gestion erreurs : Compatible Green API (lignes 3929-3946)

---

## 📋 ÉTAPES DE DÉPLOIEMENT

### **ÉTAPE 1 : Configuration Supabase (5 min)**

**Dashboard Supabase → Edge Functions → Settings → Variables d'environnement**

Ajouter ces variables :
```
WHATSAPP_PROVIDER=twilio
GREEN_API_INSTANCE_ID=7105303272
GREEN_API_TOKEN=64608a7bbcd545dbbe3249e88f14063a0831d5cf0d9a4dcb86
```

⚠️ **IMPORTANT :** Laisser `WHATSAPP_PROVIDER=twilio` pour commencer !

### **ÉTAPE 2 : Déploiement du code (3 min)**

```bash
cd "C:\Users\diall\Documents\LokoTaxi"
supabase functions deploy whatsapp-bot-v2
```

### **ÉTAPE 3 : Vérification Twilio fonctionne encore (2 min)**

1. Envoyer "taxi" via Twilio Sandbox
2. ✅ Vérifier : Bot répond normalement
3. Logs doivent montrer : "Provider WhatsApp actif: TWILIO"

### **ÉTAPE 4 : Test Green API (5 min)**

1. **Dashboard Supabase :** Changer `WHATSAPP_PROVIDER=greenapi`
2. **Envoyer "taxi"** depuis votre WhatsApp connecté à Green API
3. **Vérifier réponse :** "Quel type de véhicule ?"
4. **Logs doivent montrer :**
   ```
   🔄 Provider WhatsApp actif: GREENAPI
   🌿 Green API webhook reçu: {...}
   🌿 Green API → 33620951645@c.us: Quel type de véhicule...
   ```

### **ÉTAPE 5 : Test workflow complet (10 min)**

```
1. Client: "taxi"
   → Bot: "Quel type de véhicule ?"

2. Client: "moto"
   → Bot: "Partagez votre position"

3. Client: [Partage GPS]
   → Bot: "Quelle est votre destination ?"

4. Client: "kipe centre"
   → Bot: Suggestions + prix

5. Client: "1"
   → Bot: "Confirmer ?"

6. Client: "oui"
   → Bot: "Conducteur assigné..."
```

---

## 🔄 BASCULE ENTRE PROVIDERS

### **Pour passer à Green API :**
```
Dashboard Supabase → WHATSAPP_PROVIDER=greenapi
```

### **Pour revenir à Twilio :**
```
Dashboard Supabase → WHATSAPP_PROVIDER=twilio
```

### **Pour futur WABA Connect :**
```
Dashboard Supabase → WHATSAPP_PROVIDER=waba
(Nécessitera ajout code pour WABA)
```

---

## 🐛 DÉPANNAGE

### **Problème : Messages non reçus Green API**
- Vérifier webhook URL dans Green API : `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot-v2`
- Vérifier statut WhatsApp : "Authorized"
- Logs Edge Functions pour erreurs

### **Problème : Erreur envoi message**
- Vérifier format numéro : `33620951645@c.us`
- Vérifier token et instance ID corrects
- Tester avec API Green API directement

### **Problème : Twilio ne fonctionne plus**
- Vérifier `WHATSAPP_PROVIDER=twilio`
- Redéployer si nécessaire

---

## ✅ RÉSULTAT ATTENDU

**Avec Green API actif :**
- ✅ Bot répond via Green API (gratuit pour 3 contacts)
- ✅ Workflow complet fonctionnel
- ✅ Bascule instantanée Twilio ↔ Green API
- ✅ Architecture prête pour WABA Connect

**Limitations plan gratuit Green API :**
- Maximum 3 contacts/chats
- Suffisant pour tests complets

---

## 📊 MONITORING

**Logs à surveiller :**
```
🔄 Provider WhatsApp actif: [TWILIO|GREENAPI|WABA]
🌿 Green API webhook reçu: [payload JSON]
🌿 Green API → [numéro]: [message envoyé]
📞 Twilio - FormData parsed: [données Twilio]
```

---

## 🎯 PROCHAINES ÉTAPES

1. **Tester Green API gratuit** (aujourd'hui)
2. **Comparer performance** vs Twilio
3. **Décider** : Rester Twilio / Passer Green API / Attendre WABA
4. **Si Green API OK** : Passer plan Business ($12/mois)

**🚀 Bot maintenant compatible multi-providers !**