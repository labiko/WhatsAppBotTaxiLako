# 🚀 GUIDE SIMPLE - TESTEUR BOT

## 📋 ÉTAPES DE TEST SIMPLE

### **1. Lancer le script :**
```cmd
C:\Users\diall\Documents\LokoTaxi\test_bot.bat
```

### **2. Choisir option 2 (Test scenario SIMPLE)**

### **3. Suivre exactement ces étapes :**

**Étape 1 : Demande taxi**
- Script envoie automatiquement "taxi"
- Appuyez sur Entrée pour continuer

**Étape 2 : Choix véhicule**
```
TAPEZ: "moto" ou "voiture" (pas de chiffre)
Votre choix: moto
```
**👆 IMPORTANT : Tapez exactement "moto" ou "voiture"**

**Étape 3 : Position GPS**
```
Entrez vos coordonnées (ex: 48.6276555, 2.5891366) ou une adresse: 48.6276555, 2.5891366
```
**👆 Vos vraies coordonnées ou une adresse comme "CHU Donka"**

**Étape 4 : Destination**
```
EXEMPLES: "donka", "chu donka", "madina", "kipe"
Votre destination: donka
```
**👆 Tapez un nom de lieu comme "donka" ou "madina"**

**Étape 5 : Confirmation**
```
TAPEZ: "oui" pour confirmer ou "non" pour annuler
Votre choix: oui
```
**👆 Tapez exactement "oui" ou "non"**

## ❌ ERREURS À ÉVITER

- ❌ Ne tapez **PAS** de chiffres (1, 2, 3...)
- ❌ Ne tapez **PAS** "OK" ou "d'accord"
- ❌ Ne tapez **PAS** des phrases complètes

## ✅ CE QU'IL FAUT TAPER

| Étape | ❌ MAUVAIS | ✅ BON |
|-------|------------|--------|
| Véhicule | "2" ou "1" | "moto" ou "voiture" |
| Position | "Paris" | "48.6276555, 2.5891366" |
| Destination | "Je veux aller à Donka" | "donka" |
| Confirmation | "OK" ou "d'accord" | "oui" ou "non" |

## 🎯 EXEMPLE COMPLET

```
1. taxi → (automatique)
2. moto → Réponse bot
3. 48.6276555, 2.5891366 → Réponse bot  
4. donka → Réponse bot avec prix
5. oui → Réservation confirmée
```

## 📞 **SI ÇA NE MARCHE PAS :**

1. **Vérifiez que vous tapez exactement les mots-clés**
2. **Attendez les délais de 2 secondes entre chaque étape**
3. **Si le bot redémarre, c'est que le mot-clé n'est pas reconnu**