# 🧪 SCÉNARIOS DE TEST BOT V3 - IA TEXTE

## ✅ TESTÉ AVEC SUCCÈS
- **"Je veux aller au marché kaporo"** → ✅ IA détecte destination + véhicule

## 🎯 NOUVEAUX SCÉNARIOS À TESTER

### **1. DESTINATIONS COMPLEXES**
```
"J'ai besoin d'une moto pour aller à l'hôpital Donka"
"Peux-tu m'envoyer une voiture vers la gare de Conakry ?"
"Je dois me rendre au port de Conakry en urgence"
"Une moto pour Kipé centre émetteur svp"
"Direction aéroport international de Conakry"
```

### **2. STYLE CONVERSATIONNEL**
```
"Salut, je cherche un taxi moto pour Madina"
"Bonsoir, est-ce possible d'avoir une voiture pour Ratoma ?"
"Bonjour, j'aimerais réserver un transport vers Bambeto"
"Hey, tu peux m'aider ? Je veux aller à Dixinn"
```

### **3. MESSAGES LONGS ET CONTEXTUELS**
```
"Salut ! Je suis actuellement à la maison et j'ai un rendez-vous important demain matin à l'université de Conakry. Est-ce que je peux réserver une voiture ?"

"Bonsoir, ma voiture est en panne et je dois absolument me rendre à l'hôpital Ignace Deen ce soir. Pouvez-vous m'envoyer un taxi ?"

"Hello, je suis en voyage d'affaires à Conakry et j'ai besoin d'un transport fiable pour aller à mon hôtel près du marché Madina. Une moto serait parfaite."
```

### **4. DEMANDES AMBIGUËS (Test robustesse IA)**
```
"Il me faut un transport"
"Je dois partir quelque part"
"Peux-tu m'aider pour un déplacement ?"
"J'ai besoin d'aide pour me déplacer"
```

### **5. MÉLANGE FRANÇAIS/ARGOT LOCAL**
```
"Je veux un taxi pour aller à Gbessia airport"
"Moto pour Cosa rapid"
"Direction Kaloum center en voiture"
"Besoin transport vers Sonfonia"
```

### **6. DEMANDES URGENTES**
```
"URGENT ! Moto pour hôpital maintenant !"
"SOS taxi voiture aéroport immédiatement"
"Emergency transport Donka hospital"
"C'est urgent, je dois aller à la pharmacie"
```

### **7. DEMANDES POLIES/FORMELLES**
```
"Bonjour, pourriez-vous s'il vous plaît m'envoyer une voiture pour me rendre au ministère ?"
"Bonsoir, j'aurais besoin d'un service de taxi moto pour Koloma"
"Excusez-moi, serait-il possible d'avoir un transport vers Coyah ?"
```

### **8. DESTINATIONS AVEC DÉTAILS**
```
"Moto vers marché Madina, près de la grande mosquée"
"Voiture pour hôpital Donka, service urgences"
"Transport vers aéroport Conakry, terminal international"
"Taxi pour université Gamal, faculté médecine"
```

### **9. TEST NÉGATION/ANNULATION**
```
"Non, pas de taxi finalement"
"Je change d'avis, annule"
"Oublie ma demande précédente"
"Plus besoin de transport"
```

### **10. MESSAGES TRÈS COURTS**
```
"Taxi Kipé"
"Moto Donka"
"Transport Madina"
"Voiture port"
```

## 🎯 RÉSULTATS ATTENDUS

Pour chaque test, vérifiez :

### **✅ IA DOIT DÉTECTER :**
- **Type véhicule** : moto/voiture (ou proposer choix)
- **Destination** : Lieu mentionné
- **Intention** : Demande de transport

### **✅ WORKFLOW ATTENDU :**
1. **IA traite** → "Parfait ! J'ai compris..."
2. **Demande GPS** → "📍 PARTAGEZ VOTRE POSITION..."  
3. **Calcul prix** → "💰 TARIF: X GNF"
4. **Confirmation** → "✅ Tapez OUI..."
5. **Réservation** → "🚖 RÉSERVATION CONFIRMÉE"

### **❌ CAS LIMITES :**
- Messages trop vagues → Fallback workflow standard
- Destinations inexistantes → Suggestions alternatives
- Demandes incohérentes → Demande clarification

## 🧪 PROCÉDURE DE TEST

1. **Envoyer message** depuis +33620951645
2. **Partager position GPS** quand demandé
3. **Confirmer avec "oui"**
4. **Vérifier réservation** créée

## 🏆 OBJECTIF

**Bot V3 doit traiter 80%+ des demandes naturelles** sans fallback vers workflow standard !

**Status :** 🧪 Tests en cours - "marché kaporo" ✅ validé