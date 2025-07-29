# 🤖 TESTEUR BOT WHATSAPP - GUIDE D'UTILISATION

## 🚀 **LANCEMENT**
Double-cliquez sur `test_bot.bat` ou exécutez en CMD :
```cmd
C:\Users\diall\Documents\LokoTaxi\test_bot.bat
```

## 📋 **MODES DE TEST**

### **1. 🧪 Test Scénario TEMPOREL**
Teste le workflow audio IA complet :
- **Message vocal transcrit** : Tapez directement le texte (ex: "Je veux un taxi-moto pour demain 6h")
- **Confirmation départ** : Répondez oui/non
- **Position GPS** : Entrez vos coordonnées ou une adresse
- **Destination** : Tapez le nom du lieu
- **Confirmation finale** : oui/non

### **2. 🧪 Test Scénario SIMPLE**
Teste le workflow classique :
- **Demande taxi** : Automatique
- **Choix véhicule** : moto/voiture
- **Position GPS** : Vos coordonnées ou adresse
- **Destination** : Nom du lieu
- **Confirmation** : oui/non

### **3. 💬 Mode INTERACTIF**
Conversation libre avec le bot :
- Tapez vos messages normalement
- `gps` → Partager votre position
- `menu` → Retour au menu principal

## 📍 **FORMATS POSITION GPS**

### **Coordonnées GPS :**
```
48.6276555, 2.5891366
```
*Format : latitude, longitude (avec virgule)*

### **Adresses :**
```
CHU Donka
Madina Centre
Kipe Centre Émetteur
```
*Tapez directement le nom du lieu*

## 🎤 **MESSAGES AUDIO**

Au lieu de fichiers audio, tapez directement la transcription :
```
Je veux un taxi-moto pour demain 6h
Je souhaite aller à Donka
Taxi voiture pour maintenant
```

## ⚙️ **CONFIGURATION**

- **Numéro de test** : `+33620951645` (fixe)
- **Edge Function** : Appel direct API Supabase
- **Timeout** : 15 secondes par requête

## 🔍 **DEBUGGING**

Le script affiche :
- ✅ **Réponses du bot** formatées
- 📤 **Requêtes envoyées** (message/GPS)
- ❌ **Erreurs** de connexion

## 📞 **EXEMPLES D'UTILISATION**

### **Test Rapide Audio Temporel :**
1. Mode 1 (Temporel)
2. Message : `"Je veux un taxi-moto pour demain 6h"`
3. Réponse : `oui`
4. Position : `48.6276555, 2.5891366`
5. Destination : `chu donka`
6. Confirmation : `oui`

### **Test Avec Adresse :**
1. Mode 3 (Interactif)
2. Message : `taxi`
3. Message : `moto`
4. Commande : `gps`
5. Position : `CHU Donka` (adresse)
6. Message : `madina`
7. Message : `oui`

## 🎯 **AVANTAGES**

- ✅ **100% CMD** - Pas de dépendances
- ✅ **Saisie manuelle** - Position réelle
- ✅ **Audio transcrit** - Direct et simple
- ✅ **Flexible** - GPS ou adresses
- ✅ **Interactif** - Conversation naturelle