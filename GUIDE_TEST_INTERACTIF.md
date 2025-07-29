# 🎮 Guide de Test Interactif - LokoTaxi Bot

Ce guide vous permet de tester le bot de manière interactive, comme une vraie conversation WhatsApp !

## 🚀 Deux Options de Test

### Option 1 : Test Interactif Node.js (Recommandé)

#### Installation
```bash
cd C:\Users\diall\Documents\LokoTaxi
```

#### Lancement
```bash
node test-bot-interactif.js
```

#### Fonctionnalités
- ✅ **Conversation naturelle** : Tapez vos messages comme sur WhatsApp
- ✅ **Commandes spéciales** :
  - `/location` - Partager une position GPS
  - `/help` - Voir l'aide
  - `/clear` - Effacer l'écran
  - `/exit` - Quitter
- ✅ **Interface colorée** pour distinguer vos messages et ceux du bot
- ✅ **Menu GPS intégré** avec les principales zones de Conakry

#### Exemple d'utilisation
```
📱 Vous: taxi
🤖 LokoTaxi: Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')

📱 Vous: moto
🤖 LokoTaxi: Parfait ! Vous avez choisi : moto
              Maintenant, veuillez partager votre position...

📱 Vous: /location
📍 Choisissez une localisation:
1. Conakry Centre
2. Kipé
3. Madina
4. Ratoma
Votre choix: 3

🤖 LokoTaxi: Position reçue ! Où souhaitez-vous aller ?

📱 Vous: Marché de Madina
🤖 LokoTaxi: Prix estimé: 45,000 GNF. Confirmez-vous ?

📱 Vous: oui
🤖 LokoTaxi: Réservation confirmée ! Conducteur: Mamadou Diallo...
```

### Option 2 : Test avec Menu Batch (Windows)

#### Lancement
Double-cliquez sur `test-bot-interactif.bat` ou :
```cmd
test-bot-interactif.bat
```

#### Menu Principal
```
1. Démarrer une réservation (taxi)
2. Tester choix véhicule (moto)
3. Tester choix véhicule (voiture)
4. Envoyer position GPS
5. Tester destination
6. Confirmer réservation (oui)
7. Annuler réservation
8. Message personnalisé
9. Test workflow complet
0. Quitter
```

## 📝 Scénarios de Test Recommandés

### Test 1 : Réservation Complète
1. Tapez `taxi`
2. Répondez `moto` ou `voiture`
3. Utilisez `/location` (ou option 4 dans le menu batch)
4. Tapez votre destination (ex: `Kipé centre`)
5. Confirmez avec `oui`

### Test 2 : Annulation
1. Faites une réservation
2. Tapez `annuler`
3. Vérifiez le message de confirmation

### Test 3 : Erreurs
- Tapez un véhicule invalide : `avion`
- Envoyez une localisation sans avoir choisi de véhicule
- Confirmez sans avoir donné de destination

## 🔍 Comprendre les Réponses

Le bot renvoie des réponses XML Twilio qui sont automatiquement converties :

**Réponse brute** :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Votre message ici</Message>
</Response>
```

**Affichage dans le test** :
```
🤖 LokoTaxi: Votre message ici
```

## 💡 Astuces

1. **Test rapide** : Utilisez l'option 9 du menu batch pour un workflow complet automatique

2. **Positions GPS disponibles** :
   - Conakry Centre : `9.5370, -13.6785`
   - Kipé : `9.5691, -13.6527`
   - Madina : `9.5589, -13.6847`
   - Ratoma : `9.5833, -13.6333`

3. **Réinitialiser la session** : Tapez `annuler` pour recommencer

## 🐛 Résolution de Problèmes

### "Connection refused"
- Vérifiez votre connexion internet
- L'URL de production est peut-être temporairement indisponible

### Réponses vides
- Le bot peut avoir un problème de session
- Tapez `annuler` puis recommencez

### Caractères bizarres dans les réponses
- Normal : ce sont les caractères d'échappement XML
- Le script les nettoie automatiquement

## 🎯 Checklist de Validation

Après vos tests, vérifiez que :
- [ ] Le workflow complet fonctionne
- [ ] Les prix sont affichés correctement
- [ ] Les conducteurs sont assignés
- [ ] L'annulation fonctionne
- [ ] Les messages d'erreur sont clairs
- [ ] La session se réinitialise correctement

---

💡 **Note** : Ces tests utilisent directement l'instance de production. Les réservations créées sont réelles dans la base de données !