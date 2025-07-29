# 🔐 **GUIDE COMPLET - Configuration des Secrets Supabase CLI**

## 📋 **Informations du projet**
- **Projet :** LokoTaxi WhatsApp Bot IA Audio
- **Project Ref :** `nmwnibzgvwltipmtwhzo`
- **URL Dashboard :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo
- **Date :** 24 juillet 2025

---

## 🎯 **Objectif**
Configurer les secrets Supabase pour activer le système IA Audio (Whisper + GPT-4) dans les Edge Functions.

---

## 🔑 **TOKENS ET CLÉS UTILISÉS**

### **Personal Access Token Supabase**
```
sbp_e575d860bcd2853936ed8591e3036711d8bf158d
```
*Généré via : https://supabase.com/dashboard/account/tokens*

### **OpenAI API Key**
```
sk-proj-2AhLyqSPiuEKEjbZCPrsul
```
*Source : https://platform.openai.com/api-keys*

### **Project Reference**
```
nmwnibzgvwltipmtwhzo
```

---

## 📁 **STRUCTURE DES FICHIERS**

### **Fichier .env créé**
**Chemin :** `C:\Users\diall\Documents\LokoTaxi\supabase\functions\.env`

**Contenu :**
```env
AI_AUDIO_ENABLED=true
OPENAI_API_KEY=sk-proj-2AhLyqSPiuEKEjbZCPrsul
WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions
```

---

## 🚀 **COMMANDES COMPLÈTES - COPIER/COLLER**

### **1. Prérequis - Répertoire de travail**
```bash
cd "C:\Users\diall\Documents\LokoTaxi"
```

### **2. Création du fichier .env**
```bash
# Créer le répertoire
mkdir supabase\functions 2>nul

# Créer le fichier .env avec les 3 variables
echo AI_AUDIO_ENABLED=true > supabase\functions\.env
echo OPENAI_API_KEY=sk-proj-2AhLyqSPiuEKEjbZCPrsul >> supabase\functions\.env
echo WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions >> supabase\functions\.env

# Vérifier le contenu
type supabase\functions\.env
```

### **3. Configuration de l'authentification**
```bash
# Définir le token d'authentification
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d

# Vérifier que la variable est définie
set SUPABASE_ACCESS_TOKEN
```

### **4. Configuration des secrets via fichier .env**
```bash
# Configurer tous les secrets depuis le fichier .env
npx supabase secrets set --env-file supabase\functions\.env --project-ref nmwnibzgvwltipmtwhzo

# Vérifier que les secrets sont configurés
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo
```

### **5. Déploiement de la fonction**
```bash
# Redéployer la fonction avec les nouveaux secrets
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
```

---

## 🔄 **ALTERNATIVE - Configuration manuelle secret par secret**

```bash
# Définir le token d'authentification
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d

# Configurer chaque secret individuellement
npx supabase secrets set AI_AUDIO_ENABLED=true --project-ref nmwnibzgvwltipmtwhzo
npx supabase secrets set OPENAI_API_KEY=sk-proj-2AhLyqSPiuEKEjbZCPrsul --project-ref nmwnibzgvwltipmtwhzo
npx supabase secrets set WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions --project-ref nmwnibzgvwltipmtwhzo

# Vérifier la configuration
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo

# Déployer
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo
```

---

## 📊 **RÉSULTATS ATTENDUS**

### **Après `secrets list` :**
```
   NAME                      | DIGEST
  ---------------------------|------------------------------------------------------------------
   AI_AUDIO_ENABLED          | b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b
   OPENAI_API_KEY            | c3d2b5cc7e090bf192815c47db284d93f0284ceb02fc66d287cf66be54da3601
   SUPABASE_ANON_KEY         | a5391766e9584feac231c1dde7cd54435a2c9d333c123de1d7acc3fdd16e059c
   SUPABASE_DB_URL           | 0b149575ecd6fac87aaedd260621d59b79fd0f56276fce3865e8e31ffdebaaf9
   SUPABASE_SERVICE_ROLE_KEY | 4a1d419ae2dcedf95a33dd9ed77cae07bde786164ebc7daf24720f090c926da3
   SUPABASE_URL              | b8bcabf4b747eb5c8f3450ac810a278c97c1a6e2bf8d8f4c251bfd8f5559f93e
   WHISPER_API_URL           | 29bbffe6bf9a54fafcb951deeed649dc240772ada905608c3eb2ba0bd32d60ea
```

### **Après déploiement :**
```
Deployed Functions on project nmwnibzgvwltipmtwhzo: whatsapp-bot
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions
```

### **Dans les logs Edge Function :**
```typescript
🔧 DEBUG ENV - AI_AUDIO_ENABLED: true
🔧 DEBUG ENV - OPENAI_API_KEY: SET  
🔧 DEBUG ENV - WHISPER_API_URL: https://api.openai.com/v1/audio/transcriptions
```

---

## ❌ **ERREURS COURANTES ET SOLUTIONS**

### **1. `Invalid access token format`**
```bash
# Erreur : Token sb_secret_... utilisé
# Solution : Utiliser un token sbp_...
# Créer sur : https://supabase.com/dashboard/account/tokens
```

### **2. `unknown flag: --token`**
```bash
# Erreur : Flag --token non supporté
# Solution : Utiliser la variable d'environnement
set SUPABASE_ACCESS_TOKEN=sbp_...
```

### **3. `Variable d'environnement non définie`**
```bash
# Erreur : SUPABASE_ACCESS_TOKEN pas définie
# Solution : Utiliser = pour assigner la valeur
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
```

---

## 🔧 **COMMANDES DE MAINTENANCE**

### **Lister tous les secrets**
```bash
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo
```

### **Supprimer un secret**
```bash
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase secrets unset SECRET_NAME --project-ref nmwnibzgvwltipmtwhzo
```

### **Mettre à jour un secret**
```bash
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase secrets set SECRET_NAME=nouvelle_valeur --project-ref nmwnibzgvwltipmtwhzo
```

### **Status du projet**
```bash
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d
npx supabase status --project-ref nmwnibzgvwltipmtwhzo
```

---

## 🎯 **VALIDATION DU SYSTÈME IA AUDIO**

### **Test fonctionnel**
1. Envoyer un message vocal WhatsApp
2. Vérifier les logs dans Dashboard → Edge Functions → whatsapp-bot → Logs
3. Rechercher la séquence :
   ```
   📥 Téléchargement audio depuis: https://...
   🎯 Début transcription Whisper...
   ✅ Transcription réussie: "..."
   🧠 Analyse sémantique: "..."
   ✅ Analyse terminée: {...}
   🔀 Routage vers workflow commun avec IA
   ```

### **Dashboard URLs**
- **Functions :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions
- **Logs :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot/logs
- **Secrets :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/settings/api

---

## 📝 **NOTES IMPORTANTES**

1. **Sécurité :** Ne jamais commiter le fichier `.env` dans Git
2. **Backup :** Sauvegarder les tokens dans un gestionnaire de mots de passe
3. **Rotation :** Renouveler les tokens régulièrement
4. **Monitoring :** Surveiller les logs pour détecter les erreurs d'authentification
5. **Documentation :** Tenir à jour cette documentation lors des changements

---

## 🔄 **SCRIPT DE DÉPLOIEMENT RAPIDE**

**Fichier : `deploy_ia_audio.bat`**
```batch
@echo off
echo === Configuration IA Audio LokoTaxi ===

cd "C:\Users\diall\Documents\LokoTaxi"

echo 1. Configuration du token...
set SUPABASE_ACCESS_TOKEN=sbp_e575d860bcd2853936ed8591e3036711d8bf158d

echo 2. Configuration des secrets...
npx supabase secrets set --env-file supabase\functions\.env --project-ref nmwnibzgvwltipmtwhzo

echo 3. Vérification...
npx supabase secrets list --project-ref nmwnibzgvwltipmtwhzo

echo 4. Déploiement...
npx supabase functions deploy whatsapp-bot --project-ref nmwnibzgvwltipmtwhzo

echo === Déploiement terminé ===
pause
```

---

**📅 Dernière mise à jour :** 24 juillet 2025  
**👤 Auteur :** Configuration LokoTaxi IA Audio  
**🔗 Projet :** https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo