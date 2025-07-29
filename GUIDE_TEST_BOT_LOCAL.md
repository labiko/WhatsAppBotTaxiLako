# 🧪 Guide de Test - LokoTaxi WhatsApp Bot (Sans Twilio)

Ce guide vous permet de tester complètement le bot WhatsApp LokoTaxi sans avoir besoin de Twilio.

## ⚠️ Problème avec Supabase Local ?

Si vous rencontrez l'erreur **"port 54322: bind: An attempt was made to access a socket"**, utilisez directement les tests en production (voir section Alternative ci-dessous).

## 📋 Prérequis

1. **Node.js** installé (version 14+)
2. **Supabase CLI** installé et configuré
3. **Bot déployé localement** dans Supabase

## 🚀 Installation et Configuration

### Étape 1 : Démarrer Supabase Local

```bash
cd C:\Users\diall\Documents\LokoTaxi
supabase start
```

Attendez que tous les services soient démarrés. Vous devriez voir :
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

### Étape 2 : Déployer la fonction localement

```bash
supabase functions serve whatsapp-bot --env-file .env.local
```

Si vous n'avez pas de fichier `.env.local`, créez-le avec :
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=votre_anon_key_local
SUPABASE_SERVICE_ROLE_KEY=votre_service_key_local
```

### Étape 3 : Installer les dépendances du script de test

```bash
npm install node-fetch
```

Si `npm` n'est pas initialisé :
```bash
npm init -y
npm install node-fetch
```

## 🧪 Exécution des Tests

### Test Complet du Workflow

Pour tester le workflow complet de réservation :

```bash
node test-bot-local.js --complete
```

Ce test simule :
1. ✅ Demande de taxi ("taxi")
2. ✅ Choix du véhicule ("moto")
3. ✅ Partage de localisation GPS
4. ✅ Saisie de la destination
5. ✅ Confirmation du prix

### Tests Individuels

Pour tester des fonctionnalités spécifiques :

```bash
node test-bot-local.js --individual
```

Teste :
- ❌ Annulation de réservation
- 👋 Message de bienvenue

### Tests des Cas Limites

Pour tester des scénarios edge case :

```bash
node test-bot-local.js --edge
```

## 📊 Comprendre les Réponses

### Réponse Normale
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Quel type de taxi souhaitez-vous ? (Répondez par 'moto' ou 'voiture')</Message>
</Response>
```

### Réponse avec Erreur
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>❌ Désolé, une erreur s'est produite. Veuillez réessayer.</Message>
</Response>
```

## 🔧 Personnalisation des Tests

### Modifier le Numéro de Test

Dans `test-bot-local.js`, modifiez :
```javascript
const TEST_PHONE = '+224622000111'; // Votre numéro de test
```

### Ajouter de Nouveaux Tests

Ajoutez une nouvelle fonction :
```javascript
async function testCustomScenario() {
  console.log('\n📍 MON TEST PERSONNALISÉ');
  
  await sendWebhook({
    From: `whatsapp:${TEST_PHONE}`,
    Body: 'votre message',
    ProfileName: 'Test User'
  });
}
```

### Utiliser les Payloads JSON

Les payloads de test sont dans `test-payloads.json`. Pour les utiliser :

```javascript
const payloads = require('./test-payloads.json');

// Utiliser un payload spécifique
const taxiPayload = payloads.workflows.reservation_complete.steps[0].payload;
await sendWebhook(taxiPayload);
```

## 🐛 Dépannage

### Erreur "Connection refused"
- Vérifiez que Supabase est démarré : `supabase status`
- Vérifiez que la fonction est servie : `supabase functions serve whatsapp-bot`

### Erreur 401 "Unauthorized"
- Vérifiez vos clés API dans `.env.local`
- Assurez-vous d'utiliser les bonnes clés (anon ou service_role)

### Pas de réponse du bot
1. Vérifiez les logs de la fonction :
   ```bash
   supabase functions logs whatsapp-bot
   ```

2. Vérifiez la base de données :
   - Ouvrez http://localhost:54323
   - Vérifiez les tables `sessions` et `reservations`

## 📝 Scénarios de Test Recommandés

### 1. Test Happy Path
```bash
node test-bot-local.js --complete
```
✅ Doit créer une réservation complète

### 2. Test Annulation
1. Exécutez d'abord le test complet
2. Puis testez l'annulation :
   ```bash
   node test-bot-local.js --individual
   ```

### 3. Test Multi-Utilisateurs
Modifiez `TEST_PHONE` pour simuler différents utilisateurs :
- `+224622000111` - Client 1
- `+224622000222` - Client 2
- `+224622000333` - Client 3

### 4. Test de Charge
Créez un script pour envoyer plusieurs requêtes :
```javascript
for (let i = 0; i < 10; i++) {
  await sendWebhook({
    From: `whatsapp:+22462200${i}000`,
    Body: 'taxi'
  });
  await sleep(500);
}
```

## 🎯 Checklist de Validation

Avant de déployer en production, assurez-vous que :

- [ ] Le workflow complet fonctionne sans erreur
- [ ] Les sessions sont créées et mises à jour correctement
- [ ] Les réservations sont enregistrées dans la base
- [ ] Les conducteurs sont assignés correctement
- [ ] Les prix sont calculés correctement
- [ ] L'annulation fonctionne
- [ ] Les messages d'erreur sont clairs

## 🔄 Alternative : Tester Directement en Production

Si Supabase local ne fonctionne pas, vous avez 3 alternatives :

### Option 1 : Script Node.js pour Production
```bash
node test-bot-production.js
```

### Option 2 : Script Batch Windows (CURL)
```bash
test-bot-curl.bat
```

### Option 3 : Résoudre le problème de ports
```bash
# 1. Exécuter le script de fix
fix-supabase-ports.bat

# 2. Ou arrêter manuellement les processus sur les ports
netstat -ano | findstr :54322
taskkill /PID [ID_DU_PROCESSUS] /F

# 3. Redémarrer Supabase
supabase stop --no-backup
supabase start
```

## 🚀 Prochaines Étapes

Une fois les tests réussis :

1. **Vérifier les logs** dans Supabase Dashboard
2. **Consulter les tables** `sessions` et `reservations`
3. **Configurer Twilio** avec l'URL de votre Edge Function

---

💡 **Astuce** : Les scripts de test production (`test-bot-production.js` et `test-bot-curl.bat`) fonctionnent sans installation locale !