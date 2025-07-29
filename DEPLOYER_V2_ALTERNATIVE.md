# 🚀 DÉPLOIEMENT V2 SANS SUPABASE CLI

## ❌ PROBLÈME DÉTECTÉ
Supabase CLI n'est pas installé sur votre système.

## ✅ SOLUTION ALTERNATIVE - DASHBOARD SUPABASE

### **Étape 1 : Configuration Variables via Dashboard**

1. **Allez sur :** https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
2. **Naviguez vers :** Settings → Edge Functions
3. **Cliquez sur :** "Manage secrets"
4. **Ajoutez ces variables :**

```
HUGGINGFACE_API_KEY = HUGGINGFACE_TOKEN_REMOVED
USE_HUGGINGFACE_MMS = true  
PULAR_TRANSCRIPTION_ENABLED = true
MULTI_TRANSCRIPTION_FUSION = true
```

### **Étape 2 : Déploiement Code V2**

**Option A : Via Dashboard (Recommandé)**

1. **Allez sur :** https://app.supabase.com/project/nmwnibzgvwltipmtwhzo
2. **Naviguez vers :** Edge Functions → whatsapp-bot-pular
3. **Cliquez :** "Edit function"
4. **Remplacez tout le code** par le contenu de `index_v2_mms.ts`
5. **Cliquez :** "Deploy"

**Option B : Via Upload (Alternative)**

1. **Renommez le fichier :**
   - `index.ts` → `index_v1_backup.ts` (sauvegarde)
   - `index_v2_mms.ts` → `index.ts` (nouveau code)

2. **Uploadez via l'interface** Supabase

---

## 🔧 INSTALLATION SUPABASE CLI (OPTIONNEL)

Si vous voulez installer Supabase CLI pour l'avenir :

### **Via NPM :**
```cmd
npm install -g supabase
```

### **Via Chocolatey (Windows) :**
```cmd
choco install supabase
```

### **Via Download Direct :**
1. https://github.com/supabase/cli/releases
2. Télécharger `supabase_windows_amd64.zip`
3. Extraire dans `C:\supabase`
4. Ajouter au PATH

---

## 🎯 DÉPLOIEMENT IMMÉDIAT VIA DASHBOARD

**Suivez ces étapes maintenant :**

### **1. Variables d'environnement**
- ✅ **URL :** https://app.supabase.com/project/nmwnibzgvwltipmtwhzo/settings/functions
- ✅ **Action :** Cliquer "Manage secrets"
- ✅ **Ajouter :** `HUGGINGFACE_API_KEY = HUGGINGFACE_TOKEN_REMOVED`

### **2. Code V2**
- ✅ **URL :** https://app.supabase.com/project/nmwnibzgvwltipmtwhzo/functions
- ✅ **Action :** Cliquer sur `whatsapp-bot-pular`
- ✅ **Remplacer :** Tout le code par `index_v2_mms.ts`

---

## 📋 VÉRIFICATION RÉUSSITE

**Après déploiement, vérifiez :**

1. **Variables configurées :**
   - Dashboard → Settings → Edge Functions → Secrets
   - Vérifier présence `HUGGINGFACE_API_KEY`

2. **Fonction déployée :**
   - Dashboard → Edge Functions → whatsapp-bot-pular
   - Status : "Active" avec timestamp récent

3. **Test audio :**
   - Enregistrer : "Mi yidi moto yahougol Madina"
   - Vérifier logs : Dashboard → Edge Functions → Logs

---

## 🎉 RÉSULTAT ATTENDU

**Votre test :** `"Mi yidi moto yahougol Madina"`

**Logs attendus :**
```
🤗 Transcription HuggingFace MMS...
✅ HuggingFace MMS résultat: Mi yidi moto yahougol Madina
🎯 Confidences: IA=0%, Keywords=80%, Disaster=0%
🧠 Fusion: Meilleure source=keywords | Véhicule=moto | Destination=Madina
```

**Réponse bot :**
```
🎤 DEMANDE PULAR COMPRISE ✅
✅ Transcription: "Mi yidi moto yahougol Madina"
🤖 Sources: HuggingFace_MMS (78%)
🚗 Véhicule: MOTO  
📍 Destination: Madina ✅
📍 Partagez votre position GPS pour continuer.
```

---

*Déploiement alternatif - Bot Pular V2*  
*Solution sans CLI - Via Dashboard*