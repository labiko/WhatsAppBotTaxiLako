# Guide d'Installation du Système de Notifications

## 📋 Ordre d'exécution des scripts SQL

### 1. **01_create_notifications_table.sql**
   - Crée la table `notifications_pending`
   - Ajoute les index nécessaires
   - **À exécuter en premier**

### 2. **02_create_trigger_notification.sql**
   - Crée la fonction et le trigger PostgreSQL
   - Détecte automatiquement les changements de statut
   - **À exécuter après la table**

### 3. **03_test_notification_system.sql**
   - Script de test pour vérifier que tout fonctionne
   - Crée une réservation test
   - **IMPORTANT**: Remplacer 'ID_RESERVATION' par l'ID réel

### 4. **04_monitoring_queries.sql**
   - Crée des vues pour surveiller le système
   - Contient des requêtes utiles
   - **Optionnel mais recommandé**

## 🚀 Étapes d'installation

### Étape 1 : Exécuter les scripts SQL
```bash
# Dans Supabase SQL Editor, exécuter dans l'ordre :
1. 01_create_notifications_table.sql
2. 02_create_trigger_notification.sql
3. 04_monitoring_queries.sql (optionnel)
```

### Étape 2 : Déployer la fonction Edge
```bash
cd C:\Users\diall\Documents\LokoTaxi
supabase functions deploy whatsapp-bot
```

### Étape 3 : Configurer l'appel périodique

#### Option A : Cron-job.org (Gratuit)
1. Créer un compte sur [cron-job.org](https://cron-job.org)
2. Nouveau cronjob avec :
   - URL: `https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications`
   - Method: POST
   - Schedule: Every minute
   - Headers:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td25pYnpndndsdGlwbXR3aHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY5MDMsImV4cCI6MjA2ODc2MjkwM30.cmOT0pwKr0T7DyR7FjF9lr2Aea3A3OfOytEfhi0GQ4U
     Content-Type: application/json
     ```

#### Option B : Script Node.js
```javascript
setInterval(async () => {
  await fetch('https://nmwnibzgvwltipmtwhzo.supabase.co/functions/v1/whatsapp-bot/process-notifications', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_ANON_KEY',
      'Content-Type': 'application/json'
    }
  });
}, 30000); // Toutes les 30 secondes
```

### Étape 4 : Tester
Exécuter `03_test_notification_system.sql` en suivant les instructions

## 🔍 Vérification

### Vérifier les notifications en attente :
```sql
SELECT * FROM v_notifications_pending_details;
```

### Vérifier les logs de la fonction :
```bash
supabase functions logs whatsapp-bot --tail
```

## ⚠️ Dépannage

### Si les notifications ne sont pas créées :
- Vérifier que le trigger existe : `SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_notification';`
- Vérifier que le conducteur_id n'est pas NULL lors de l'update

### Si les notifications ne sont pas envoyées :
- Vérifier que le cron job s'exécute
- Vérifier les logs de la Edge Function
- Tester manuellement : `curl -X POST [URL] -H "Authorization: Bearer [KEY]"`