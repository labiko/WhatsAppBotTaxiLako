# 🚀 GUIDE DE DÉPLOIEMENT - BOT PULAR PHASE 1

## 📋 PRÉ-REQUIS

- ✅ Compte Supabase avec projet actif
- ✅ CLI Supabase installé (`supabase --version`)
- ✅ Variables d'environnement configurées
- ✅ Webhook Twilio configuré

---

## 🔧 ÉTAPE 1 : CONFIGURATION VARIABLES D'ENVIRONNEMENT

### **Connectez-vous au Dashboard Supabase**
1. Allez sur : https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
2. Naviguez vers : **Edge Functions** → **whatsapp-bot-pular**
3. Cliquez sur **"Manage secrets"**

### **Ajoutez ces variables (si pas déjà présentes) :**

```bash
# IA Audio (optionnel pour Phase 1)
AI_AUDIO_ENABLED=false

# OpenAI (optionnel pour Phase 1)
OPENAI_API_KEY=

# Twilio (requis si audio activé)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

**Note Phase 1 :** On commence SANS l'IA audio pour tester d'abord les mots-clés Pular.

---

## 📦 ÉTAPE 2 : DÉPLOIEMENT DE LA FONCTION

### **Ouvrez un terminal dans le dossier projet :**

```cmd
cd C:\Users\diall\Documents\LokoTaxi
```

### **Déployez la fonction Pular :**

```bash
supabase functions deploy whatsapp-bot-pular --no-verify-jwt
```

**Résultat attendu :**
```
Deploying whatsapp-bot-pular...
Deployed function whatsapp-bot-pular
URL: https://nmwnibzgvwltipmtwhzo.functions.supabase.co/whatsapp-bot-pular
```

---

## 🔗 ÉTAPE 3 : CONFIGURATION WEBHOOK TWILIO

### **Option A : Nouveau numéro Twilio (recommandé)**

1. Connectez-vous à : https://console.twilio.com
2. Allez dans : **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Configurez le webhook :
   ```
   https://nmwnibzgvwltipmtwhzo.functions.supabase.co/whatsapp-bot-pular
   ```
4. Méthode : **POST**

### **Option B : Router avec le bot existant**

Créez une logique de routage dans le bot principal pour rediriger les messages Pular.

---

## 🧪 ÉTAPE 4 : TESTS PHASE 1

### **Test 1 : Message texte simple Pular**

**Envoyez :** `Mi yidi moto`

**Réponse attendue :**
```
✅ DEMANDE COMPRISE EN PULAR !

🚗 Véhicule: MOTO

📍 Quelle est votre destination ?
```

### **Test 2 : Commande complète Pular**

**Envoyez :** `Mi yidi oto yahugu Madina`

**Réponse attendue :**
```
✅ DEMANDE COMPRISE EN PULAR !

🚗 Véhicule: VOITURE
📍 Destination: [Résultats Madina depuis la base]

📍 Partagez votre position GPS pour continuer.
```

### **Test 3 : Confirmation Pular**

**Envoyez :** `Eey` (oui en Pular)

**Comportement :** Doit fonctionner comme "oui"

### **Test 4 : Urgence Pular**

**Envoyez :** `Mi yidi moto jooni`

**Réponse attendue :**
```
✅ DEMANDE COMPRISE EN PULAR !

🚗 Véhicule: MOTO
⚡ Mode urgent activé

📍 Quelle est votre destination ?
```

---

## 📊 VÉRIFICATION LOGS

### **Consultez les logs en temps réel :**

```bash
supabase functions logs whatsapp-bot-pular --tail
```

### **Points à vérifier :**
- 🔤 Détection mots-clés Pular
- 📍 Recherche destinations en base
- 💾 Sessions créées/mises à jour
- ⚡ Temps de réponse < 2s

---

## 🎯 MÉTRIQUES DE SUCCÈS PHASE 1

| Critère | Objectif | Comment mesurer |
|---------|----------|-----------------|
| **Détection Pular** | 90% | Logs "Véhicule détecté" |
| **Destinations** | 80% | Recherches réussies |
| **Latence** | < 2s | Logs timestamps |
| **Sessions** | 100% | Vérifier table sessions |

---

## 🐛 TROUBLESHOOTING

### **Erreur : "Missing authorization header"**
→ Vérifiez que les clés Supabase sont bien configurées

### **Erreur : "Destination non trouvée"**
→ Vérifiez que la table `adresses` contient des données

### **Bot ne répond pas**
→ Vérifiez l'URL du webhook dans Twilio

### **Mots-clés Pular non détectés**
→ Vérifiez les logs pour voir la normalisation du texte

---

## 📈 PROCHAINES ÉTAPES (PHASE 2)

Une fois Phase 1 validée :
1. ✅ Activer l'IA audio (`AI_AUDIO_ENABLED=true`)
2. ✅ Ajouter cache mémoire destinations
3. ✅ Intégrer Google Places (beta)
4. ✅ Métriques analytics

---

## 🎉 FÉLICITATIONS !

Votre bot Pular Phase 1 est maintenant opérationnel !

**Support :** Si problème, vérifiez les logs ou créez une issue.

---

*Guide de déploiement - LokoTaxi Bot Pular v1.0*
*Date : 25 Juillet 2025*