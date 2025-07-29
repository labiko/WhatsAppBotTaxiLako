# 🔑 GUIDE OBTENIR META MMS API - ÉTAPES DÉTAILLÉES

## 🎯 OBJECTIF
Obtenir `META_MMS_API_KEY` pour transcription Pular fiable avec Meta MMS (Massively Multilingual Speech).

---

## 📋 MÉTHODE 1 : META AI STUDIO (RECOMMANDÉ)

### **Étape 1 : Créer compte Meta Developers**

1. **Allez sur :** https://developers.facebook.com
2. **Cliquez :** "Get Started" 
3. **Connectez-vous** avec votre compte Facebook/Meta existant
4. **Si pas de compte :** Créez un compte Meta

### **Étape 2 : Accéder à Meta AI**

1. **Allez sur :** https://ai.meta.com
2. **Cliquez :** "AI Studio" ou "Developer Tools"
3. **Acceptez** les conditions d'utilisation

### **Étape 3 : Demander accès MMS**

1. **Naviguez vers :** "Research" → "MMS (Massively Multilingual Speech)"
2. **OU allez directement :** https://ai.meta.com/research/publications/scaling-speech-technology-to-1000-languages/
3. **Cliquez :** "Request Access" ou "API Access"
4. **Remplissez le formulaire :**
   ```
   Project Name: LokoTaxi Pular Bot
   Use Case: West African language transcription for taxi services
   Languages: Pular (Fulfulde) - Guinea
   Expected Volume: 1000 requests/month
   ```

### **Étape 4 : Attendre approbation**
- **Délai :** 1-7 jours ouvrables
- **Email :** Vous recevrez un email avec votre clé API
- **Format :** `META_MMS_xxxxxxxxxxxxxxx`

---

## 📋 MÉTHODE 2 : HUGGING FACE MMS (ALTERNATIVE IMMÉDIATE)

**Si Meta MMS prend du temps, utilisez cette alternative :**

### **Étape 1 : Compte Hugging Face**

1. **Allez sur :** https://huggingface.co
2. **Créez un compte** gratuit
3. **Vérifiez votre email**

### **Étape 2 : Générer Token API**

1. **Allez sur :** https://huggingface.co/settings/tokens
2. **Cliquez :** "New token"
3. **Nom :** `LokoTaxi-MMS`
4. **Type :** "Read"
5. **Copiez le token :** `hf_xxxxxxxxxxxxxxxxx`

### **Étape 3 : Configuration Supabase**

```bash
cd C:\Users\diall\Documents\LokoTaxi

# Configuration HuggingFace MMS
supabase secrets set HUGGINGFACE_API_KEY=hf_votre_token
supabase secrets set MMS_MODEL_URL=https://api-inference.huggingface.co/models/facebook/mms-1b-all
supabase secrets set USE_HUGGINGFACE_MMS=true
```

---

## 📋 MÉTHODE 3 : REPLICATE API (BACKUP)

### **Alternative via Replicate :**

1. **Allez sur :** https://replicate.com
2. **Créez compte**
3. **API Keys :** https://replicate.com/account/api-tokens
4. **Modèle MMS :** `facebook/mms`

```bash
# Configuration Replicate
supabase secrets set REPLICATE_API_TOKEN=r8_votre_token
supabase secrets set USE_REPLICATE_MMS=true
```

---

## 🔧 CONFIGURATION TEMPORAIRE - OPENAI UNIQUEMENT

**En attendant Meta MMS, optimisons Whisper :**

### **Configuration immédiate :**

```bash
cd C:\Users\diall\Documents\LokoTaxi

# Activer mode Whisper optimisé
supabase secrets set META_MMS_API_KEY=""  
supabase secrets set OPENAI_API_KEY=sk-votre_clé_existante
supabase secrets set WHISPER_PULAR_MODE=enhanced
supabase secrets set TRANSCRIPTION_TIMEOUT=15000
```

### **Modification code temporaire :**

J'ai prévu un fallback intelligent dans V2. Si Meta MMS n'est pas disponible, le système utilise :

1. **Whisper avec prompt Pular optimisé**
2. **Double validation** de confiance  
3. **Messages d'erreur** plus clairs

---

## ⚡ DÉPLOIEMENT IMMÉDIAT POSSIBLE

**Vous pouvez déployer V2 MAINTENANT avec ces configurations :**

### **Option A : HuggingFace (Recommandé pour tests)**

```bash
# 1. Créer compte HF (5 minutes)
# 2. Copier token
supabase secrets set HUGGINGFACE_API_KEY=hf_votre_token
supabase secrets set USE_HUGGINGFACE_MMS=true

# 3. Déployer V2
cp supabase/functions/whatsapp-bot-pular/index_v2_mms.ts supabase/functions/whatsapp-bot-pular/index.ts
supabase functions deploy whatsapp-bot-pular --no-verify-jwt
```

### **Option B : Whisper Enhanced (Immédiat)**

```bash
# Utiliser seulement OpenAI avec V2
supabase secrets set WHISPER_PULAR_MODE=enhanced
supabase secrets set OPENAI_API_KEY=sk-votre_clé

# Déployer V2
supabase functions deploy whatsapp-bot-pular --no-verify-jwt
```

---

## 🧪 TESTS APRÈS CONFIGURATION

### **Test 1 : Vérifier API**

```bash
# Vérifier logs
supabase functions logs whatsapp-bot-pular --tail
```

### **Test 2 : Audio Pular**

**Enregistrez :** `"Mi yidi moto yahougol Madina"`

**Résultat attendu avec HuggingFace :**
```
🎤 DEMANDE PULAR COMPRISE ✅
✅ Transcription: "Mi yidi moto yahougol Madina"
🤖 Sources: HuggingFace_MMS (78%)
🚗 Véhicule: MOTO
📍 Destination: Madina ✅
```

**Résultat attendu avec Whisper Enhanced :**
```
🎤 VÉHICULE PULAR DÉTECTÉ ✅
✅ Transcription: "Mi yidi moto yahougol Madina"  
🤖 Sources: Whisper_Pular (65%)
🚗 Véhicule: MOTO
📍 Quelle est votre destination ?
```

---

## 📊 COMPARAISON APIS

| API | Délai | Coût | Qualité Pular | Recommandation |
|-----|-------|------|---------------|----------------|
| **Meta MMS** | 1-7 jours | Gratuit | ⭐⭐⭐⭐⭐ | 🥇 Optimal |
| **HuggingFace** | 5 minutes | Gratuit | ⭐⭐⭐⭐ | 🥈 Tests |
| **Replicate** | 10 minutes | $0.01/min | ⭐⭐⭐⭐ | 🥉 Backup |
| **Whisper Enhanced** | Immédiat | $0.006/min | ⭐⭐⭐ | 🔧 Temporaire |

---

## 🎯 RECOMMANDATION IMMÉDIATE

**PLAN D'ACTION :**

1. ✅ **Maintenant :** Créer compte HuggingFace (5 min)
2. ✅ **Maintenant :** Déployer V2 avec HF MMS  
3. ✅ **Maintenant :** Tester avec votre audio Pular
4. 🔄 **Parallèle :** Demander accès Meta MMS
5. 🔄 **Future :** Migrer vers Meta MMS quand disponible

**Voulez-vous commencer par HuggingFace pour tester immédiatement ?**

---

*Guide d'obtention - Meta MMS API*  
*Date : 25 Juillet 2025*  
*Status : Action immédiate possible*