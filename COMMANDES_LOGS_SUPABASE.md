# 📋 COMMANDES LOGS SUPABASE - SYNTAXE CORRECTE

## ❌ COMMANDE INCORRECTE
```bash
supabase functions logs whatsapp-bot-pular --tail  # N'existe pas
```

## ✅ COMMANDES CORRECTES

### **1. Voir les logs récents**
```bash
supabase functions logs whatsapp-bot-pular
```

### **2. Voir les logs avec filtre par niveau**
```bash
supabase functions logs whatsapp-bot-pular --level info
supabase functions logs whatsapp-bot-pular --level error
```

### **3. Voir les logs avec limite**
```bash
supabase functions logs whatsapp-bot-pular --limit 50
```

### **4. Voir les logs en temps réel (équivalent --tail)**
```bash
# Option 1: Répéter la commande
supabase functions logs whatsapp-bot-pular --limit 20

# Option 2: Via Dashboard Supabase (recommandé)
# https://app.supabase.com/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot-pular/logs
```

## 🔍 FILTRAGE DES LOGS

### **Chercher patterns spécifiques :**
```bash
# Logs contenant "HuggingFace"
supabase functions logs whatsapp-bot-pular | findstr "HuggingFace"

# Logs contenant "Transcription"
supabase functions logs whatsapp-bot-pular | findstr "Transcription"

# Logs contenant "Erreur"
supabase functions logs whatsapp-bot-pular | findstr "Erreur"
```

## 🎯 DÉBOGAGE BOT PULAR V2

### **Vérifier si V2 est déployé :**
```bash
supabase functions list
```

### **Vérifier les logs après test audio :**
```bash
# 1. Enregistrer audio : "Mi yidi moto yahougol Madina"
# 2. Attendre 10 secondes
# 3. Exécuter :
supabase functions logs whatsapp-bot-pular --limit 30
```

### **Patterns à chercher dans les logs V2 :**
```
✅ Chercher : "🤗 Transcription HuggingFace MMS"
✅ Chercher : "✅ HuggingFace MMS résultat"
✅ Chercher : "🧠 Fusion: Meilleure source"
✅ Chercher : "🚗 Véhicule détecté: moto"
❌ Éviter : "❌ Erreur HuggingFace MMS"
```

## 📊 DASHBOARD SUPABASE (RECOMMANDÉ)

**Pour logs en temps réel :**
1. **Allez sur :** https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
2. **Naviguez :** Edge Functions → whatsapp-bot-pular
3. **Cliquez :** "Logs" (actualisation automatique)
4. **Filtrez :** Par niveau (Info, Error, etc.)

---

## 🚀 COMMANDES DE TEST COMPLÈTES

### **Après déploiement V2 :**

```bash
# 1. Vérifier déploiement
supabase functions list

# 2. Tester immédiatement
# (Enregistrer audio WhatsApp : "Mi yidi moto yahougol Madina")

# 3. Voir les logs (attendre 10 secondes)
supabase functions logs whatsapp-bot-pular --limit 50

# 4. Filtrer pour V2
supabase functions logs whatsapp-bot-pular | findstr "HuggingFace"
supabase functions logs whatsapp-bot-pular | findstr "V2"
supabase functions logs whatsapp-bot-pular | findstr "Fusion"
```

---

*Guide des logs - Supabase CLI correct*  
*Syntaxe mise à jour - 2025*