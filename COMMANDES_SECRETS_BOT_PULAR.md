# 🔐 COMMANDES CONFIGURATION SECRETS - BOT PULAR

## 📋 CLÉS TROUVÉES DANS LE PROJET

```
SUPABASE_URL: https://nmwnibzgvwltipmtwhzo.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U
SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M
```

---

## 🚀 COMMANDES SUPABASE CLI

### **Option 1 : Toutes les variables d'un coup**

```bash
cd C:\Users\diall\Documents\LokoTaxi

supabase secrets set --env-file .env.pular
```

Créez d'abord le fichier `.env.pular` :
```env
SUPABASE_URL=https://nmwnibzgvwltipmtwhzo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M
AI_AUDIO_ENABLED=false
```

### **Option 2 : Une par une**

```bash
# URL Supabase
supabase secrets set SUPABASE_URL=https://nmwnibzgvwltipmtwhzo.supabase.co

# Clé Anon
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U

# Clé Service Role
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE4NjkwMywiZXhwIjoyMDY4NzYyOTAzfQ._TeinxeQLZKSowSCUswDR54WejQp1c9y_tkn6MLYh_M

# IA désactivée pour Phase 1
supabase secrets set AI_AUDIO_ENABLED=false
```

---

## 🔍 VÉRIFICATION

### **Lister les secrets configurés :**
```bash
supabase secrets list
```

### **Résultat attendu :**
```
NAME                        DIGEST
AI_AUDIO_ENABLED           5e884...
SUPABASE_ANON_KEY         b8bca...
SUPABASE_SERVICE_ROLE_KEY  f7d8a...
SUPABASE_URL              c4f2e...
```

---

## 📦 DÉPLOIEMENT FINAL

Une fois les secrets configurés :

```bash
# Déployer la fonction
supabase functions deploy whatsapp-bot-pular --no-verify-jwt

# Vérifier les logs
supabase functions logs whatsapp-bot-pular --tail
```

---

## ⚠️ SÉCURITÉ

**IMPORTANT :** Ces clés sont déjà dans votre code public. Pour un environnement de production :

1. **Régénérez les clés** depuis le dashboard Supabase
2. **Ne commitez JAMAIS** les clés dans Git
3. **Utilisez uniquement** les variables d'environnement

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Copier ces commandes
2. ✅ Les exécuter dans votre terminal
3. ✅ Déployer la fonction
4. ✅ Tester avec "Mi yidi moto"

**Tout est prêt pour la configuration !** 🚀